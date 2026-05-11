import { createAdminClient } from "@/lib/supabase/admin";

import { getStripe } from "./stripe";

import {
  getCreditPackPriceId,
  getStripePriceId,
  TRIAL_DAYS,
  type BillingCurrency,
  type BillingCycle,
  type PlanId,
} from "./config";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000/").replace(/\/$/, "");
}

/**
 * Get-or-create the Stripe customer for a project.
 * Customer is keyed on project_id (not user_id) since billing is project-scoped.
 */
export async function ensureStripeCustomer(
  projectId: string,
  ownerEmail: string,
  projectName: string,
): Promise<string> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("project_subscriptions")
    .select("stripe_customer_id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: ownerEmail,
    name: projectName,
    metadata: { project_id: projectId },
  });

  await supabase
    .from("project_subscriptions")
    .upsert(
      { project_id: projectId, stripe_customer_id: customer.id, status: "inactive" },
      { onConflict: "project_id" },
    );

  return customer.id;
}

/**
 * Create a Checkout session for a plan subscription (with 7-day trial).
 */
export async function createSubscriptionCheckout(params: {
  projectId: string;
  ownerEmail: string;
  projectName: string;
  plan: PlanId;
  cycle: BillingCycle;
  currency: BillingCurrency;
  successPath?: string;
  cancelPath?: string;
}): Promise<{ url: string; id: string }> {
  const priceId = getStripePriceId(params.plan, params.cycle, params.currency);
  if (!priceId) {
    throw new Error(
      `No Stripe price configured for ${params.plan}/${params.cycle}/${params.currency}. ` +
        `Set the matching STRIPE_PRICE_* env var.`,
    );
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(
    params.projectId,
    params.ownerEmail,
    params.projectName,
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        project_id: params.projectId,
        plan: params.plan,
        cycle: params.cycle,
        currency: params.currency,
      },
    },
    automatic_tax: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    success_url: `${appUrl()}${params.successPath ?? "/dashboard/billing?status=success"}`,
    cancel_url: `${appUrl()}${params.cancelPath ?? "/dashboard/billing?status=canceled"}`,
    metadata: {
      project_id: params.projectId,
      plan: params.plan,
      cycle: params.cycle,
      currency: params.currency,
      kind: "subscription",
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { url: session.url, id: session.id };
}

/**
 * Create a Checkout session for a one-time credit top-up.
 */
export async function createTopUpCheckout(params: {
  projectId: string;
  ownerEmail: string;
  projectName: string;
  packId: string;
  currency: BillingCurrency;
  successPath?: string;
  cancelPath?: string;
}): Promise<{ url: string; id: string }> {
  const priceId = getCreditPackPriceId(params.packId, params.currency);
  if (!priceId) {
    throw new Error(
      `No Stripe price configured for credit pack ${params.packId}/${params.currency}.`,
    );
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(
    params.projectId,
    params.ownerEmail,
    params.projectName,
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    automatic_tax: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required",
    success_url: `${appUrl()}${params.successPath ?? "/dashboard/billing?status=topup_success"}`,
    cancel_url: `${appUrl()}${params.cancelPath ?? "/dashboard/billing?status=topup_canceled"}`,
    metadata: {
      project_id: params.projectId,
      pack_id: params.packId,
      currency: params.currency,
      kind: "credit_pack",
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { url: session.url, id: session.id };
}

/**
 * Create a Billing Portal session so users can manage their subscription.
 */
export async function createBillingPortalSession(params: {
  projectId: string;
  returnPath?: string;
}): Promise<{ url: string }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("project_subscriptions")
    .select("stripe_customer_id")
    .eq("project_id", params.projectId)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    throw new Error("No Stripe customer for this project");
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${appUrl()}${params.returnPath ?? "/dashboard/billing"}`,
  });
  return { url: session.url };
}
