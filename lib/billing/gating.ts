import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

import { getActivePlanForProject, isSendingAllowed } from "./subscription";

import type { Channel } from "./config";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GateResult =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | "no_subscription"
        | "subscription_inactive"
        | "channel_not_in_plan"
        | "contacts_limit"
        | "seats_limit"
        | "campaigns_limit"
        | "insufficient_credits";
      message: string;
    };

/**
 * Top-level gate. Used by API routes before allowing the action.
 * Pass `requireChannel` for send/import actions that touch a specific channel.
 *
 * Uses an admin client (bypasses RLS) for limit counts to keep things simple
 * inside server actions.
 */
export async function checkPlanGate(params: {
  projectId: string;
  requireChannel?: Channel;
  requireCredits?: number;
  intent?: "send" | "import_contact" | "create_campaign" | "invite_member";
}): Promise<GateResult> {
  if (!BILLING_ENABLED) return { allowed: true };
  const supabase: SupabaseClient = createAdminClient();
  const { subscription, plan } = await getActivePlanForProject(supabase, params.projectId);

  if (!subscription || !plan) {
    return {
      allowed: false,
      code: "no_subscription",
      message: "This project does not have an active subscription. Pick a plan to continue.",
    };
  }

  if (!isSendingAllowed(subscription.status)) {
    return {
      allowed: false,
      code: "subscription_inactive",
      message: `Subscription is ${subscription.status}. Update payment to continue.`,
    };
  }

  if (params.requireChannel && plan.channels?.[params.requireChannel] !== true) {
    return {
      allowed: false,
      code: "channel_not_in_plan",
      message: `Your current plan does not include the ${params.requireChannel} channel.`,
    };
  }

  if (params.intent === "import_contact" && plan.max_contacts != null) {
    const used = await countContacts(supabase, params.projectId);
    if (used >= plan.max_contacts) {
      return {
        allowed: false,
        code: "contacts_limit",
        message: `Contact limit reached (${used}/${plan.max_contacts}). Upgrade to add more.`,
      };
    }
  }

  if (params.intent === "invite_member" && plan.max_seats != null) {
    const used = await countSeats(supabase, params.projectId);
    if (used >= plan.max_seats) {
      return {
        allowed: false,
        code: "seats_limit",
        message: `Team seat limit reached (${used}/${plan.max_seats}). Upgrade to invite more.`,
      };
    }
  }

  if (params.intent === "create_campaign" && plan.max_campaigns_per_month != null) {
    const used = await countCampaignsThisMonth(supabase, params.projectId);
    if (used >= plan.max_campaigns_per_month) {
      return {
        allowed: false,
        code: "campaigns_limit",
        message: `Monthly campaign limit reached (${used}/${plan.max_campaigns_per_month}). Upgrade to send more.`,
      };
    }
  }

  if (params.requireCredits && params.requireCredits > 0) {
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("project_id", params.projectId)
      .maybeSingle();
    const balance = wallet?.balance ?? 0;
    if (balance < params.requireCredits) {
      return {
        allowed: false,
        code: "insufficient_credits",
        message: `Not enough credits (${balance} available, ${params.requireCredits} required). Top up to continue.`,
      };
    }
  }

  return { allowed: true };
}

async function countContacts(client: SupabaseClient, projectId: string): Promise<number> {
  const [wa, sms, em] = await Promise.all([
    client.from("whatsapp_contacts").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    client.from("sms_contacts").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    client.from("email_subscribers").select("id", { count: "exact", head: true }).eq("project_id", projectId),
  ]);
  return (wa.count ?? 0) + (sms.count ?? 0) + (em.count ?? 0);
}

async function countSeats(client: SupabaseClient, projectId: string): Promise<number> {
  const { count } = await client
    .from("project_members")
    .select("user_id", { count: "exact", head: true })
    .eq("project_id", projectId);
  return count ?? 0;
}

async function countCampaignsThisMonth(client: SupabaseClient, projectId: string): Promise<number> {
  const { data } = await client
    .from("project_campaign_counts_current_month")
    .select("campaigns_this_month")
    .eq("project_id", projectId)
    .maybeSingle();
  return data?.campaigns_this_month ?? 0;
}
