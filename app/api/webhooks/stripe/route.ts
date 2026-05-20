import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { sendBillingEmail } from "@/lib/billing/billing-emails";
import {
  getCreditPackByPriceId,
  matchPlanByPriceId,
  TRIAL_CREDITS,
} from "@/lib/billing/config";
import { grantCredits } from "@/lib/billing/credits";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/billing/stripe";
import { upsertProjectSubscription } from "@/lib/billing/subscription";
import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: "Billing is disabled" }, { status: 404 });
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-webhook] signature verification failed", msg);
    return NextResponse.json({ error: `Webhook signature error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        // Other events are intentionally ignored for now.
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const kind = session.metadata?.kind;
  const projectId = session.metadata?.project_id;
  if (!projectId) {
    console.warn("[stripe-webhook] checkout.session.completed missing project_id metadata");
    return;
  }

  if (kind === "credit_pack") {
    // Look up the pack from the line item's price ID.
    const stripe = getStripe();
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    const priceId = lineItems.data[0]?.price?.id;
    if (!priceId) return;
    const pack = getCreditPackByPriceId(priceId);
    if (!pack) {
      console.warn("[stripe-webhook] unknown credit pack price", priceId);
      return;
    }
    await grantCredits({
      projectId,
      amount: pack.credits,
      reason: "top_up",
      refType: "stripe_checkout_session",
      refId: session.id,
      metadata: { pack_id: pack.id, currency: session.currency },
    });

    const recipient = session.customer_details?.email ?? null;
    if (recipient) {
      await sendBillingEmail({
        kind: "top_up_receipt",
        projectId,
        to: recipient,
        refId: session.id,
        data: {
          packName: pack.name,
          credits: pack.credits,
          amount: session.amount_total != null ? session.amount_total / 100 : undefined,
          currency: (session.currency ?? "inr").toLowerCase(),
        },
      });
    }
    return;
  }

  // For subscriptions, subscription.created/updated will do the heavy lifting.
}

async function handleSubscriptionChange(sub: Stripe.Subscription): Promise<void> {
  const projectId = sub.metadata?.project_id ?? null;
  if (!projectId) {
    console.warn("[stripe-webhook] subscription missing project_id metadata", sub.id);
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const match = priceId ? matchPlanByPriceId(priceId) : null;

  const periodStart = item?.current_period_start ?? null;
  const periodEnd = item?.current_period_end ?? null;

  await upsertProjectSubscription(projectId, {
    plan_id: match?.plan ?? null,
    status: sub.status as never,
    billing_cycle: match?.cycle ?? null,
    currency: match?.currency ?? null,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
  });

  // Grant trial credits exactly once, when the subscription enters trial.
  if (sub.status === "trialing") {
    const supabase = createAdminClient();
    const { data: ledger } = await supabase
      .from("credit_ledger")
      .select("id")
      .eq("project_id", projectId)
      .eq("reason", "trial_grant")
      .limit(1)
      .maybeSingle();
    if (!ledger) {
      await grantCredits({
        projectId,
        amount: TRIAL_CREDITS,
        reason: "trial_grant",
        refType: "stripe_subscription",
        refId: sub.id,
      });
    }
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const projectId = sub.metadata?.project_id ?? null;
  if (!projectId) return;
  await upsertProjectSubscription(projectId, {
    status: "canceled",
    canceled_at: new Date().toISOString(),
  });

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.owner_id) return;
  const { data: ownerData } = await supabase.auth.admin.getUserById(project.owner_id as string);
  const recipient = ownerData?.user?.email ?? null;
  if (recipient) {
    await sendBillingEmail({
      kind: "subscription_canceled",
      projectId,
      to: recipient,
      refId: sub.id,
      data: {},
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // Only act on recurring subscription invoices.
  type InvoiceWithSubscription = Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const inv = invoice as InvoiceWithSubscription;
  const subscriptionRef = inv.subscription;
  if (!subscriptionRef) return;

  const stripe = getStripe();
  const sub =
    typeof subscriptionRef === "string"
      ? await stripe.subscriptions.retrieve(subscriptionRef)
      : subscriptionRef;
  const projectId = sub.metadata?.project_id ?? null;
  if (!projectId) return;

  const priceId = sub.items.data[0]?.price?.id;
  const match = priceId ? matchPlanByPriceId(priceId) : null;
  if (!match) return;

  // Look up monthly_credits for the plan from DB.
  const supabase = createAdminClient();
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("monthly_credits")
    .eq("id", match.plan)
    .maybeSingle();
  const credits = plan?.monthly_credits ?? 0;
  if (credits <= 0) return;

  // Idempotency: don't grant twice for the same invoice.
  const { data: existing } = await supabase
    .from("credit_ledger")
    .select("id")
    .eq("project_id", projectId)
    .eq("reason", "plan_grant")
    .eq("ref_type", "stripe_invoice")
    .eq("ref_id", invoice.id ?? "")
    .limit(1)
    .maybeSingle();
  if (existing) return;

  await grantCredits({
    projectId,
    amount: credits,
    reason: "plan_grant",
    refType: "stripe_invoice",
    refId: invoice.id ?? undefined,
    metadata: { plan: match.plan, cycle: match.cycle },
  });

  await upsertProjectSubscription(projectId, {
    last_credit_grant_at: new Date().toISOString(),
  });

  const recipient = invoice.customer_email ?? null;
  if (recipient) {
    const { data: planRow } = await supabase
      .from("subscription_plans")
      .select("name")
      .eq("id", match.plan)
      .maybeSingle();
    await sendBillingEmail({
      kind: "plan_grant_receipt",
      projectId,
      to: recipient,
      refId: invoice.id ?? undefined,
      data: {
        planName: planRow?.name ?? match.plan,
        credits,
        amount: invoice.amount_paid != null ? invoice.amount_paid / 100 : undefined,
        currency: match.currency,
      },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  type InvoiceWithSubscription = Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const inv = invoice as InvoiceWithSubscription;
  const subscriptionRef = inv.subscription;
  if (!subscriptionRef) return;
  const stripe = getStripe();
  const sub =
    typeof subscriptionRef === "string"
      ? await stripe.subscriptions.retrieve(subscriptionRef)
      : subscriptionRef;
  const projectId = sub.metadata?.project_id ?? null;
  if (!projectId) return;
  await upsertProjectSubscription(projectId, { status: "past_due" });

  const recipient = invoice.customer_email ?? null;
  if (recipient) {
    await sendBillingEmail({
      kind: "payment_failed",
      projectId,
      to: recipient,
      refId: invoice.id ?? undefined,
      data: {},
    });
  }
}
