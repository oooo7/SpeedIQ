import { NextResponse } from "next/server";

import { sendBillingEmail } from "@/lib/billing/billing-emails";
import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends time-based billing emails:
 *   - trial_ending: subscriptions trialing with trial_ends_at within 2 days
 *   - trial_expired: trialing that just expired
 *   - low_balance: wallets with auto_recharge disabled where balance is below
 *     20% of plan monthly_credits
 *
 * Per-event de-duping is handled by sendBillingEmail (billing_email_log).
 * Run hourly; the de-dupe window is 24h for kinds without a ref_id.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!BILLING_ENABLED) {
    return NextResponse.json({ skipped: true, reason: "billing_disabled" });
  }

  const admin = createAdminClient();
  let trialEnding = 0;
  let trialExpired = 0;
  let lowBalance = 0;

  // ---- Trial ending in the next 2 days ----
  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const { data: trialingSoon } = await admin
    .from("project_subscriptions")
    .select("project_id, trial_ends_at")
    .eq("status", "trialing")
    .gte("trial_ends_at", now.toISOString())
    .lte("trial_ends_at", inTwoDays.toISOString());

  for (const row of trialingSoon ?? []) {
    const ownerEmail = await getOwnerEmail(admin, row.project_id as string);
    if (!ownerEmail) continue;
    const daysLeft = Math.max(
      1,
      Math.ceil((new Date(row.trial_ends_at as string).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const sent = await sendBillingEmail({
      kind: "trial_ending",
      projectId: row.project_id as string,
      to: ownerEmail,
      refId: `trial-${row.trial_ends_at}`,
      data: { daysLeft },
    });
    if (sent) trialEnding++;
  }

  // ---- Trial expired (status moved from trialing → past_due or trial_ends_at < now) ----
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { data: justExpired } = await admin
    .from("project_subscriptions")
    .select("project_id, trial_ends_at, status")
    .in("status", ["past_due", "incomplete_expired", "inactive"])
    .gte("trial_ends_at", oneDayAgo.toISOString())
    .lte("trial_ends_at", now.toISOString());

  for (const row of justExpired ?? []) {
    const ownerEmail = await getOwnerEmail(admin, row.project_id as string);
    if (!ownerEmail) continue;
    const sent = await sendBillingEmail({
      kind: "trial_expired",
      projectId: row.project_id as string,
      to: ownerEmail,
      refId: `expired-${row.trial_ends_at}`,
      data: {},
    });
    if (sent) trialExpired++;
  }

  // ---- Low balance (auto-recharge off) ----
  // Pull wallets joined with their plan's monthly_credits, then filter in JS
  // (simpler than a SQL join with conditional thresholds).
  const { data: wallets } = await admin
    .from("credit_wallets")
    .select("project_id, balance, auto_recharge_enabled")
    .eq("auto_recharge_enabled", false)
    .gt("balance", 0);

  for (const w of wallets ?? []) {
    const { data: sub } = await admin
      .from("project_subscriptions")
      .select("plan_id, status")
      .eq("project_id", w.project_id as string)
      .maybeSingle();
    if (!sub || sub.status !== "active") continue;
    if (!sub.plan_id) continue;
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("monthly_credits")
      .eq("id", sub.plan_id)
      .maybeSingle();
    const monthly = plan?.monthly_credits ?? 0;
    if (monthly === 0) continue;
    if ((w.balance as number) > monthly * 0.2) continue;

    const ownerEmail = await getOwnerEmail(admin, w.project_id as string);
    if (!ownerEmail) continue;
    const sent = await sendBillingEmail({
      kind: "low_balance",
      projectId: w.project_id as string,
      to: ownerEmail,
      // Bucket by week so we send at most one per week per project.
      refId: `weekly-${weekKey(now)}`,
      data: {
        balance: w.balance,
        threshold: Math.round(monthly * 0.2),
        packName: "credit top-up",
        packCredits: 0,
        currency: "inr",
        url: null,
      },
    });
    if (sent) lowBalance++;
  }

  return NextResponse.json({ trial_ending: trialEnding, trial_expired: trialExpired, low_balance: lowBalance });
}

function weekKey(d: Date): string {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}W${week}`;
}

async function getOwnerEmail(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
): Promise<string | null> {
  const { data: project } = await admin
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project?.owner_id) return null;
  const { data } = await admin.auth.admin.getUserById(project.owner_id as string);
  return data?.user?.email ?? null;
}
