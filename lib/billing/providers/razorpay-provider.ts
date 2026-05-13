import Razorpay from "razorpay";

import { CREDIT_PACKS, TRIAL_DAYS } from "@/lib/billing/config";
import { createAdminClient } from "@/lib/supabase/admin";

import type {
  CheckoutResult,
  PaymentProvider,
  PortalArgs,
  SubscriptionCheckoutArgs,
  TopUpCheckoutArgs,
} from "./types";
import type { BillingCycle, PlanId } from "@/lib/billing/config";

/**
 * Razorpay provider.
 *
 * Subscriptions: Razorpay "Plans" are pre-created in the Dashboard (one per
 * plan × cycle, INR only). We store their plan ids in env. At checkout, we
 * call subscriptions.create with start_at = now + TRIAL_DAYS to delay the
 * first charge — Razorpay still requires the user to authenticate the mandate
 * at signup (UPI Autopay / card e-mandate), which provides the "auth-and-hold"
 * behaviour. The user is redirected to the subscription short_url.
 *
 * Top-ups: One-time payments via Razorpay Payment Links. Amount comes from
 * credit_packs.price_inr (paise = INR × 100).
 *
 * Webhooks: see app/api/webhooks/razorpay/route.ts for event handling.
 */

let cached: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (cached) return cached;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
  }
  cached = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return cached;
}

function getRazorpayPlanId(plan: PlanId, cycle: BillingCycle): string | undefined {
  const key = `RAZORPAY_PLAN_${plan.toUpperCase()}_${cycle.toUpperCase()}_INR`;
  return process.env[key];
}

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/").replace(/\/$/, "");
}

function billingCyclesPerYear(cycle: BillingCycle): number {
  return cycle === "monthly" ? 12 : 1;
}

class RazorpayProvider implements PaymentProvider {
  readonly id = "razorpay" as const;

  async ensureCustomer(args: {
    projectId: string;
    ownerEmail: string;
    projectName: string;
  }): Promise<string> {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("project_subscriptions")
      .select("razorpay_customer_id")
      .eq("project_id", args.projectId)
      .maybeSingle();

    if (existing?.razorpay_customer_id) return existing.razorpay_customer_id;

    const rzp = getRazorpay();
    // Razorpay throws if a customer with the same email/contact exists. Treat
    // that as a soft success — fetch and reuse the existing one.
    let customerId: string;
    try {
      const created = await rzp.customers.create({
        name: args.projectName.slice(0, 50),
        email: args.ownerEmail,
        fail_existing: 0,
        notes: { project_id: args.projectId },
      });
      customerId = created.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Razorpay customer create failed: ${message}`);
    }

    await supabase
      .from("project_subscriptions")
      .upsert(
        {
          project_id: args.projectId,
          razorpay_customer_id: customerId,
          provider: "razorpay",
          status: "inactive",
        },
        { onConflict: "project_id" },
      );

    return customerId;
  }

  async createSubscriptionCheckout(args: SubscriptionCheckoutArgs): Promise<CheckoutResult> {
    if (args.currency !== "inr") {
      throw new Error(`Razorpay only supports INR — got ${args.currency}`);
    }

    const planId = getRazorpayPlanId(args.plan, args.cycle);
    if (!planId) {
      throw new Error(
        `No Razorpay plan configured for ${args.plan}/${args.cycle}. ` +
          `Create it in the Razorpay Dashboard and set RAZORPAY_PLAN_*.`,
      );
    }

    const customerId = await this.ensureCustomer({
      projectId: args.projectId,
      ownerEmail: args.ownerEmail,
      projectName: args.projectName,
    });

    const rzp = getRazorpay();
    const nowSec = Math.floor(Date.now() / 1000);
    const startAt = nowSec + TRIAL_DAYS * 24 * 60 * 60;

    // total_count = number of billing cycles. For an "indefinite" subscription
    // we use a large value; Razorpay requires this field. Cancel-anytime UX is
    // handled via our own cancel button.
    const totalCount = billingCyclesPerYear(args.cycle) * 10; // 10 years worth

    const sub = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      customer_notify: 1,
      start_at: startAt,
      notes: {
        project_id: args.projectId,
        plan: args.plan,
        cycle: args.cycle,
        currency: args.currency,
        kind: "subscription",
        owner_email: args.ownerEmail,
      },
    });

    // Persist the in-flight subscription id so the webhook can match later if
    // metadata fails to round-trip (rare but possible).
    const supabase = createAdminClient();
    await supabase
      .from("project_subscriptions")
      .upsert(
        {
          project_id: args.projectId,
          razorpay_customer_id: customerId,
          razorpay_subscription_id: sub.id,
          razorpay_plan_id: planId,
          provider: "razorpay",
          status: "incomplete",
          billing_cycle: args.cycle,
          currency: args.currency,
          plan_id: args.plan,
          trial_ends_at: new Date(startAt * 1000).toISOString(),
        },
        { onConflict: "project_id" },
      );

    if (!sub.short_url) {
      throw new Error("Razorpay did not return a checkout short_url");
    }
    return { kind: "redirect", url: sub.short_url, sessionId: sub.id };
  }

  async createTopUpCheckout(args: TopUpCheckoutArgs): Promise<CheckoutResult> {
    if (args.currency !== "inr") {
      throw new Error(`Razorpay only supports INR — got ${args.currency}`);
    }

    const pack = CREDIT_PACKS.find((p) => p.id === args.packId);
    if (!pack) {
      throw new Error(`Unknown credit pack: ${args.packId}`);
    }

    await this.ensureCustomer({
      projectId: args.projectId,
      ownerEmail: args.ownerEmail,
      projectName: args.projectName,
    });

    const rzp = getRazorpay();
    // Razorpay amounts are in paise (₹1 = 100).
    const amountPaise = pack.price_inr * 100;
    const link = await rzp.paymentLink.create({
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      description: `${pack.name} — ${pack.credits.toLocaleString()} credits`,
      customer: {
        name: args.projectName.slice(0, 50),
        email: args.ownerEmail,
      },
      notify: { sms: false, email: true },
      reminder_enable: false,
      callback_url: `${appUrl()}${args.successPath ?? "/dashboard/billing?status=topup_success"}`,
      callback_method: "get",
      notes: {
        project_id: args.projectId,
        pack_id: pack.id,
        credits: pack.credits.toString(),
        currency: args.currency,
        kind: "credit_pack",
      },
    });

    if (!link.short_url) {
      throw new Error("Razorpay did not return a payment link short_url");
    }
    return { kind: "redirect", url: link.short_url, sessionId: link.id };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createBillingPortalSession(_args: PortalArgs): Promise<{ url: string }> {
    throw new Error(
      "Razorpay does not provide a hosted billing portal — use the in-app Billing page to cancel/manage.",
    );
  }

  async cancelSubscription(args: {
    subscriptionId: string;
    cancelAtCycleEnd?: boolean;
  }): Promise<void> {
    const rzp = getRazorpay();
    await rzp.subscriptions.cancel(args.subscriptionId, args.cancelAtCycleEnd !== false);
  }
}

export const razorpayProvider: PaymentProvider = new RazorpayProvider();
export { getRazorpay, getRazorpayPlanId };
