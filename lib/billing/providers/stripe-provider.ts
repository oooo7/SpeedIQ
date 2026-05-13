import { createAdminClient } from "@/lib/supabase/admin";

import { getStripePriceId, getCreditPackPriceId, TRIAL_DAYS } from "../config";
import { getStripe } from "../stripe";

import type {
  CheckoutResult,
  PaymentProvider,
  PortalArgs,
  SubscriptionCheckoutArgs,
  TopUpCheckoutArgs,
} from "./types";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/").replace(/\/$/, "");
}

class StripeProvider implements PaymentProvider {
  readonly id = "stripe" as const;

  async ensureCustomer(args: {
    projectId: string;
    ownerEmail: string;
    projectName: string;
  }): Promise<string> {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("project_subscriptions")
      .select("stripe_customer_id")
      .eq("project_id", args.projectId)
      .maybeSingle();

    if (existing?.stripe_customer_id) return existing.stripe_customer_id;

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      email: args.ownerEmail,
      name: args.projectName,
      metadata: { project_id: args.projectId },
    });

    await supabase
      .from("project_subscriptions")
      .upsert(
        {
          project_id: args.projectId,
          stripe_customer_id: customer.id,
          provider: "stripe",
          status: "inactive",
        },
        { onConflict: "project_id" },
      );

    return customer.id;
  }

  async createSubscriptionCheckout(args: SubscriptionCheckoutArgs): Promise<CheckoutResult> {
    const priceId = getStripePriceId(args.plan, args.cycle, args.currency);
    if (!priceId) {
      throw new Error(
        `No Stripe price configured for ${args.plan}/${args.cycle}/${args.currency}. ` +
          `Set the matching STRIPE_PRICE_* env var.`,
      );
    }

    const stripe = getStripe();
    const customerId = await this.ensureCustomer({
      projectId: args.projectId,
      ownerEmail: args.ownerEmail,
      projectName: args.projectName,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          project_id: args.projectId,
          plan: args.plan,
          cycle: args.cycle,
          currency: args.currency,
        },
      },
      automatic_tax: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      success_url: `${appUrl()}${args.successPath ?? "/dashboard/billing?status=success"}`,
      cancel_url: `${appUrl()}${args.cancelPath ?? "/dashboard/billing?status=canceled"}`,
      metadata: {
        project_id: args.projectId,
        plan: args.plan,
        cycle: args.cycle,
        currency: args.currency,
        kind: "subscription",
        provider: "stripe",
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    return { kind: "redirect", url: session.url, sessionId: session.id };
  }

  async createTopUpCheckout(args: TopUpCheckoutArgs): Promise<CheckoutResult> {
    const priceId = getCreditPackPriceId(args.packId, args.currency);
    if (!priceId) {
      throw new Error(
        `No Stripe price configured for credit pack ${args.packId}/${args.currency}.`,
      );
    }

    const stripe = getStripe();
    const customerId = await this.ensureCustomer({
      projectId: args.projectId,
      ownerEmail: args.ownerEmail,
      projectName: args.projectName,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      automatic_tax: { enabled: true },
      customer_update: { name: "auto", address: "auto" },
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      success_url: `${appUrl()}${args.successPath ?? "/dashboard/billing?status=topup_success"}`,
      cancel_url: `${appUrl()}${args.cancelPath ?? "/dashboard/billing?status=topup_canceled"}`,
      metadata: {
        project_id: args.projectId,
        pack_id: args.packId,
        currency: args.currency,
        kind: "credit_pack",
        provider: "stripe",
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }
    return { kind: "redirect", url: session.url, sessionId: session.id };
  }

  async createBillingPortalSession(args: PortalArgs): Promise<{ url: string }> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("project_subscriptions")
      .select("stripe_customer_id")
      .eq("project_id", args.projectId)
      .maybeSingle();

    if (!data?.stripe_customer_id) {
      throw new Error("No Stripe customer for this project");
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl()}${args.returnPath ?? "/dashboard/billing"}`,
    });
    return { url: session.url };
  }

  async cancelSubscription(args: {
    subscriptionId: string;
    cancelAtCycleEnd?: boolean;
  }): Promise<void> {
    const stripe = getStripe();
    if (args.cancelAtCycleEnd !== false) {
      await stripe.subscriptions.update(args.subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(args.subscriptionId);
    }
  }
}

export const stripeProvider: PaymentProvider = new StripeProvider();
