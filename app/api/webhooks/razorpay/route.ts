import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { sendBillingEmail } from "@/lib/billing/billing-emails";
import { CREDIT_PACKS, TRIAL_CREDITS } from "@/lib/billing/config";
import { grantCredits } from "@/lib/billing/credits";
import { upsertProjectSubscription } from "@/lib/billing/subscription";
import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

import type { SubscriptionStatus } from "@/lib/billing/subscription";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

interface RazorpayEvent {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: RazorpayPaymentEntity };
    payment_link?: { entity: RazorpayPaymentLinkEntity };
  };
  created_at: number;
}

interface RazorpaySubscriptionEntity {
  id: string;
  entity: "subscription";
  plan_id: string;
  customer_id: string | null;
  status: string;
  current_start: number | null;
  current_end: number | null;
  charge_at: number | null;
  start_at: number;
  end_at: number | null;
  ended_at: number | null;
  has_scheduled_changes: boolean;
  cancel_at_cycle_end?: 0 | 1;
  notes: Record<string, string | number | null> | null;
}

interface RazorpayPaymentEntity {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  invoice_id: string | null;
  notes?: Record<string, string | number | null> | null;
}

interface RazorpayPaymentLinkEntity {
  id: string;
  entity: "payment_link";
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string | number | null> | null;
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: "Billing is disabled" }, { status: 404 });
  }
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "RAZORPAY_WEBHOOK_SECRET not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "subscription.authenticated":
        await handleSubscriptionAuthenticated(event.payload.subscription?.entity);
        break;
      case "subscription.activated":
      case "subscription.charged":
        await handleSubscriptionCharged(
          event.payload.subscription?.entity,
          event.payload.payment?.entity,
          event.event === "subscription.charged",
        );
        break;
      case "subscription.cancelled":
      case "subscription.completed":
        await handleSubscriptionEnded(event.payload.subscription?.entity, "canceled");
        break;
      case "subscription.halted":
      case "subscription.paused":
        await handleSubscriptionHalted(event.payload.subscription?.entity);
        break;
      case "payment_link.paid":
        await handlePaymentLinkPaid(event.payload.payment_link?.entity);
        break;
      default:
        // Other events are intentionally ignored.
        break;
    }
  } catch (err) {
    console.error(`[razorpay-webhook] handler error for ${event.event}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

function projectIdFromNotes(notes: Record<string, string | number | null> | null | undefined): string | null {
  const v = notes?.project_id;
  return typeof v === "string" ? v : null;
}

async function findProjectBySubscriptionId(subscriptionId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("project_subscriptions")
    .select("project_id")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();
  return data?.project_id ?? null;
}

async function resolveProjectId(sub: RazorpaySubscriptionEntity | undefined): Promise<string | null> {
  if (!sub) return null;
  return projectIdFromNotes(sub.notes) ?? (await findProjectBySubscriptionId(sub.id));
}

function rzpStatusToInternal(status: string): SubscriptionStatus {
  switch (status) {
    case "created":
    case "pending":
      return "incomplete";
    case "authenticated":
      return "trialing";
    case "active":
      return "active";
    case "paused":
    case "halted":
      return "past_due";
    case "cancelled":
      return "canceled";
    case "completed":
      return "canceled";
    case "expired":
      return "incomplete_expired";
    default:
      return "incomplete";
  }
}

async function handleSubscriptionAuthenticated(sub: RazorpaySubscriptionEntity | undefined): Promise<void> {
  if (!sub) return;
  const projectId = await resolveProjectId(sub);
  if (!projectId) return;

  await upsertProjectSubscription(projectId, {
    plan_id: (sub.notes?.plan as never) ?? null,
    status: rzpStatusToInternal(sub.status),
    billing_cycle: (sub.notes?.cycle as never) ?? null,
    currency: "inr",
    razorpay_subscription_id: sub.id,
    razorpay_customer_id: sub.customer_id ?? null,
    razorpay_plan_id: sub.plan_id,
    provider: "razorpay",
    trial_ends_at: sub.start_at ? new Date(sub.start_at * 1000).toISOString() : null,
    current_period_start: sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null,
    current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_cycle_end === 1,
  });

  // Grant trial credits once.
  const admin = createAdminClient();
  const { data: ledger } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("project_id", projectId)
    .eq("reason", "trial_grant")
    .limit(1)
    .maybeSingle();
  if (!ledger && TRIAL_CREDITS > 0) {
    await grantCredits({
      projectId,
      amount: TRIAL_CREDITS,
      reason: "trial_grant",
      refType: "razorpay_subscription",
      refId: sub.id,
    });
  }
}

async function handleSubscriptionCharged(
  sub: RazorpaySubscriptionEntity | undefined,
  payment: RazorpayPaymentEntity | undefined,
  isRecurringCharge: boolean,
): Promise<void> {
  if (!sub) return;
  const projectId = await resolveProjectId(sub);
  if (!projectId) return;

  await upsertProjectSubscription(projectId, {
    plan_id: (sub.notes?.plan as never) ?? null,
    status: rzpStatusToInternal(sub.status),
    billing_cycle: (sub.notes?.cycle as never) ?? null,
    currency: "inr",
    razorpay_subscription_id: sub.id,
    razorpay_customer_id: sub.customer_id ?? null,
    razorpay_plan_id: sub.plan_id,
    provider: "razorpay",
    current_period_start: sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null,
    current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_cycle_end === 1,
  });

  if (!isRecurringCharge) return; // 'activated' fires without a payment for some flows

  // Plan-credit grant per charge. Idempotent on payment.id.
  const planSlug = sub.notes?.plan;
  if (typeof planSlug !== "string") return;

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("monthly_credits")
    .eq("id", planSlug)
    .maybeSingle();
  const credits = plan?.monthly_credits ?? 0;
  if (credits <= 0) return;

  const refId = payment?.id ?? sub.id;
  const { data: existing } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("project_id", projectId)
    .eq("reason", "plan_grant")
    .eq("ref_type", "razorpay_payment")
    .eq("ref_id", refId)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  await grantCredits({
    projectId,
    amount: credits,
    reason: "plan_grant",
    refType: "razorpay_payment",
    refId,
    metadata: { plan: planSlug, cycle: sub.notes?.cycle ?? null },
  });

  await upsertProjectSubscription(projectId, {
    last_credit_grant_at: new Date().toISOString(),
  });

  const ownerEmail = await getOwnerEmail(projectId);
  if (ownerEmail) {
    const { data: planRow } = await admin
      .from("subscription_plans")
      .select("name")
      .eq("id", planSlug)
      .maybeSingle();
    await sendBillingEmail({
      kind: "plan_grant_receipt",
      projectId,
      to: ownerEmail,
      refId,
      data: {
        planName: planRow?.name ?? planSlug,
        credits,
        amount: payment?.amount != null ? payment.amount / 100 : undefined,
        currency: "inr",
      },
    });
  }
}

async function getOwnerEmail(projectId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: project } = await admin
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.owner_id) return null;
  const { data } = await admin.auth.admin.getUserById(project.owner_id as string);
  return data?.user?.email ?? null;
}

async function handleSubscriptionEnded(
  sub: RazorpaySubscriptionEntity | undefined,
  status: SubscriptionStatus,
): Promise<void> {
  if (!sub) return;
  const projectId = await resolveProjectId(sub);
  if (!projectId) return;
  await upsertProjectSubscription(projectId, {
    status,
    canceled_at: new Date().toISOString(),
    cancel_at_period_end: sub.cancel_at_cycle_end === 1,
  });

  const ownerEmail = await getOwnerEmail(projectId);
  if (ownerEmail) {
    await sendBillingEmail({
      kind: "subscription_canceled",
      projectId,
      to: ownerEmail,
      refId: sub.id,
      data: {
        endDate: sub.current_end
          ? new Date(sub.current_end * 1000).toLocaleDateString()
          : undefined,
      },
    });
  }
}

async function handleSubscriptionHalted(sub: RazorpaySubscriptionEntity | undefined): Promise<void> {
  if (!sub) return;
  const projectId = await resolveProjectId(sub);
  if (!projectId) return;
  await upsertProjectSubscription(projectId, { status: "past_due" });
}

async function handlePaymentLinkPaid(link: RazorpayPaymentLinkEntity | undefined): Promise<void> {
  if (!link) return;
  const projectId = projectIdFromNotes(link.notes);
  if (!projectId) return;
  const packId = typeof link.notes?.pack_id === "string" ? link.notes.pack_id : null;
  if (!packId) return;

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return;

  // Idempotency: don't grant twice for the same payment_link.
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("project_id", projectId)
    .eq("reason", "top_up")
    .eq("ref_type", "razorpay_payment_link")
    .eq("ref_id", link.id)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  await grantCredits({
    projectId,
    amount: pack.credits,
    reason: "top_up",
    refType: "razorpay_payment_link",
    refId: link.id,
    metadata: { pack_id: pack.id, currency: link.currency.toLowerCase() },
  });

  const ownerEmail = await getOwnerEmail(projectId);
  if (ownerEmail) {
    await sendBillingEmail({
      kind: "top_up_receipt",
      projectId,
      to: ownerEmail,
      refId: link.id,
      data: {
        packName: pack.name,
        credits: pack.credits,
        amount: link.amount / 100,
        currency: link.currency.toLowerCase(),
      },
    });
  }
}
