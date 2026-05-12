import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sentinel returned by deductCredits when billing is disabled. Large enough
 * to never collide with a real balance, so callers see "you have plenty" and
 * proceed with the send.
 */
const UNLIMITED_BALANCE = Number.MAX_SAFE_INTEGER;

/**
 * Reasons used in credit_ledger.reason. Keep stable — used for analytics.
 */
export type CreditReason =
  | "plan_grant"
  | "trial_grant"
  | "top_up"
  | "auto_recharge"
  | "manual_adjustment"
  | "refund"
  | "email_send"
  | "whatsapp_send"
  | "sms_send"
  | "ai_generation";

/**
 * Deduct credits atomically. Returns:
 *   - new balance (>= 0) on success
 *   - null on insufficient credits
 */
export async function deductCredits(params: {
  client?: SupabaseClient;
  projectId: string;
  amount: number;
  reason: CreditReason;
  refType?: string;
  refId?: string;
  metadata?: Record<string, unknown>;
}): Promise<number | null> {
  if (!BILLING_ENABLED) return UNLIMITED_BALANCE;
  if (params.amount <= 0) return null;

  const supabase = params.client ?? createAdminClient();
  const { data, error } = await supabase.rpc("deduct_credits", {
    p_project_id: params.projectId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_ref_type: params.refType ?? null,
    p_ref_id: params.refId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[credits] deductCredits failed", { projectId: params.projectId, error });
    return null;
  }

  const newBalance = typeof data === "number" ? data : Number(data);
  if (newBalance < 0) return null;
  return newBalance;
}

/**
 * Grant credits (plan grant, trial grant, top-up, manual adjustment).
 * Always succeeds (unless DB error). Returns new balance.
 */
export async function grantCredits(params: {
  client?: SupabaseClient;
  projectId: string;
  amount: number;
  reason: CreditReason;
  refType?: string;
  refId?: string;
  metadata?: Record<string, unknown>;
}): Promise<number | null> {
  if (!BILLING_ENABLED) return UNLIMITED_BALANCE;
  if (params.amount <= 0) return null;

  const supabase = params.client ?? createAdminClient();
  const { data, error } = await supabase.rpc("grant_credits", {
    p_project_id: params.projectId,
    p_amount: params.amount,
    p_reason: params.reason,
    p_ref_type: params.refType ?? null,
    p_ref_id: params.refId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[credits] grantCredits failed", { projectId: params.projectId, error });
    return null;
  }

  return typeof data === "number" ? data : Number(data);
}

/**
 * Get current wallet balance. Returns 0 if no wallet row exists.
 */
export async function getCreditBalance(
  client: SupabaseClient,
  projectId: string,
): Promise<number> {
  const { data } = await client
    .from("credit_wallets")
    .select("balance")
    .eq("project_id", projectId)
    .maybeSingle();
  return data?.balance ?? 0;
}

/**
 * Record a usage event (independent of credit deduction, e.g. for analytics).
 * Best-effort — does not throw on error.
 */
export async function recordUsageEvent(params: {
  client?: SupabaseClient;
  projectId: string;
  channel: "email" | "whatsapp" | "sms" | "ai";
  messageType?: string;
  recipientId?: string;
  campaignId?: string;
  creditsCharged: number;
  providerMessageId?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!BILLING_ENABLED) return;
  const supabase = params.client ?? createAdminClient();
  const { error } = await supabase.from("usage_events").insert({
    project_id: params.projectId,
    channel: params.channel,
    message_type: params.messageType ?? null,
    recipient_id: params.recipientId ?? null,
    campaign_id: params.campaignId ?? null,
    credits_charged: params.creditsCharged,
    provider_message_id: params.providerMessageId ?? null,
    status: params.status ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) {
    console.error("[credits] recordUsageEvent failed", { projectId: params.projectId, error });
  }
}
