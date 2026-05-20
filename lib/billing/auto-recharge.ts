import { CREDIT_PACKS } from "@/lib/billing/config";
import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

import { getProviderFor } from "./providers/router";

import type { BillingCurrency } from "./config";

/**
 * Called after every credit deduction. If the project enabled auto-recharge
 * AND the new balance dropped at or below the configured threshold AND no
 * recharge attempt is already in flight, kick off a top-up checkout for the
 * configured pack.
 *
 * Notes:
 *  - We don't block the send on auto-recharge. The current send still goes
 *    through with whatever credits remain; auto-recharge buys the *next*
 *    batch headroom.
 *  - We use a 5-minute in-DB lock (auto_recharge_last_attempt_at, set via
 *    metadata in the wallet row) to avoid stampeding the provider when many
 *    sends fire in quick succession.
 *  - For Razorpay this creates a payment link and we email it to the owner;
 *    Razorpay payment links cannot be auto-charged like Stripe off-session
 *    payments can, so the user still has to click and pay. Track issue:
 *    eventually switch to off-session subscription invoices on both providers.
 */
const RECHARGE_LOCK_MS = 5 * 60 * 1000;

export async function maybeTriggerAutoRecharge(params: {
  projectId: string;
  newBalance: number;
}): Promise<void> {
  if (!BILLING_ENABLED) return;
  if (params.newBalance < 0) return;

  const admin = createAdminClient();
  const { data: wallet } = await admin
    .from("credit_wallets")
    .select("auto_recharge_enabled, auto_recharge_threshold, auto_recharge_pack_id, updated_at")
    .eq("project_id", params.projectId)
    .maybeSingle();

  if (!wallet?.auto_recharge_enabled) return;
  const threshold = wallet.auto_recharge_threshold ?? 0;
  if (threshold <= 0 || params.newBalance > threshold) return;
  const packId = wallet.auto_recharge_pack_id;
  if (!packId) return;

  // Stampede guard: look at the most recent auto_recharge ledger entry for
  // this project — if it's within the lock window, skip.
  const { data: recent } = await admin
    .from("credit_ledger")
    .select("created_at")
    .eq("project_id", params.projectId)
    .eq("reason", "auto_recharge")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.created_at) {
    const last = new Date(recent.created_at).getTime();
    if (Date.now() - last < RECHARGE_LOCK_MS) return;
  }

  // We need owner email + currency. Pull from project + subscription.
  const { data: sub } = await admin
    .from("project_subscriptions")
    .select("currency, provider, plan_id")
    .eq("project_id", params.projectId)
    .maybeSingle();
  const currency: BillingCurrency = (sub?.currency as BillingCurrency | null) ?? "inr";

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    console.warn("[auto-recharge] unknown pack id", packId);
    return;
  }

  // Owner email
  const { data: project } = await admin
    .from("projects")
    .select("id, name, owner_id")
    .eq("id", params.projectId)
    .maybeSingle();
  if (!project) return;
  const { data: owner } = await admin.auth.admin.getUserById(project.owner_id);
  const ownerEmail = owner?.user?.email ?? null;
  if (!ownerEmail) {
    console.warn("[auto-recharge] no owner email for project", params.projectId);
    return;
  }

  try {
    const provider = await getProviderFor(currency, params.projectId);
    const result = await provider.createTopUpCheckout({
      projectId: params.projectId,
      ownerEmail,
      projectName: project.name ?? "SpeedIQ Project",
      packId,
      currency,
      successPath: "/dashboard/billing?status=auto_recharge_success",
      cancelPath: "/dashboard/billing?status=auto_recharge_canceled",
    });

    // Record a marker in the ledger with delta=0 so the lock window works and
    // the user can see in their activity that an auto-recharge attempt was made.
    // (Real grant happens when the webhook fires after they pay.)
    await admin.from("credit_ledger").insert({
      project_id: params.projectId,
      delta: 0,
      reason: "auto_recharge",
      ref_type: "checkout_session",
      ref_id: result.kind === "redirect" ? result.sessionId : result.sessionId,
      balance_after: params.newBalance,
      metadata: {
        status: "checkout_started",
        provider: provider.id,
        pack_id: packId,
        currency,
        url: result.kind === "redirect" ? result.url : null,
      },
    });

    // Fire-and-forget: email the owner the checkout link so they can pay even
    // if they're not in-app right now.
    const { sendBillingEmail } = await import("./billing-emails");
    await sendBillingEmail({
      kind: "low_balance",
      projectId: params.projectId,
      to: ownerEmail,
      data: {
        balance: params.newBalance,
        threshold,
        packName: pack.name,
        packCredits: pack.credits,
        currency,
        url: result.kind === "redirect" ? result.url : null,
      },
    });
  } catch (err) {
    console.error("[auto-recharge] failed", { projectId: params.projectId, err });
  }
}
