import { createAdminClient } from "@/lib/supabase/admin";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanId } from "./config";

export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

export interface ProjectSubscription {
  project_id: string;
  plan_id: PlanId | null;
  status: SubscriptionStatus;
  billing_cycle: "monthly" | "yearly" | null;
  currency: "inr" | "usd" | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_ends_at: string | null;
  last_credit_grant_at: string | null;
}

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  monthly_credits: number;
  max_contacts: number | null;
  max_seats: number | null;
  max_campaigns_per_month: number | null;
  channels: Record<string, boolean>;
  features: Record<string, unknown>;
  analytics_retention_days: number | null;
  price_inr_monthly: number | null;
  price_usd_monthly: number | null;
  price_inr_yearly: number | null;
  price_usd_yearly: number | null;
}

export async function getProjectSubscription(
  client: SupabaseClient,
  projectId: string,
): Promise<ProjectSubscription | null> {
  const { data } = await client
    .from("project_subscriptions")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  return (data ?? null) as ProjectSubscription | null;
}

export async function getPlan(
  client: SupabaseClient,
  planId: PlanId,
): Promise<SubscriptionPlan | null> {
  const { data } = await client
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  return (data ?? null) as SubscriptionPlan | null;
}

export async function getActivePlanForProject(
  client: SupabaseClient,
  projectId: string,
): Promise<{ subscription: ProjectSubscription | null; plan: SubscriptionPlan | null }> {
  const subscription = await getProjectSubscription(client, projectId);
  if (!subscription?.plan_id) return { subscription, plan: null };
  const plan = await getPlan(client, subscription.plan_id);
  return { subscription, plan };
}

/**
 * Whether the subscription gives the project messaging access right now.
 * 'trialing' and 'active' both grant access; everything else blocks sends.
 */
export function isSendingAllowed(status: SubscriptionStatus | null | undefined): boolean {
  return status === "trialing" || status === "active";
}

/**
 * Service-role upsert used by Stripe webhooks.
 */
export async function upsertProjectSubscription(
  projectId: string,
  patch: Partial<ProjectSubscription>,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("project_subscriptions")
    .upsert({ project_id: projectId, ...patch }, { onConflict: "project_id" });
  if (error) {
    console.error("[billing] upsertProjectSubscription failed", { projectId, error });
    throw error;
  }
}
