import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/billing/admin";
import { CREDIT_WEIGHTS } from "@/lib/billing/config";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();

  const [overview, plans, packs, weights, settings, recentLedger] = await Promise.all([
    admin.rpc("admin_billing_overview"),
    admin.from("subscription_plans").select("*").order("sort_order"),
    admin.from("credit_packs").select("*").order("sort_order"),
    admin.from("credit_weights").select("*").order("channel").order("message_type"),
    admin.from("platform_settings").select("key, value"),
    admin
      .from("credit_ledger")
      .select("id, project_id, delta, reason, balance_after, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    overview: overview.data ?? null,
    plans: plans.data ?? [],
    credit_packs: packs.data ?? [],
    credit_weights: weights.data ?? [],
    platform_settings: Object.fromEntries(
      (settings.data ?? []).map((s) => [s.key as string, s.value as unknown]),
    ),
    recent_ledger: recentLedger.data ?? [],
    static_credit_weights: CREDIT_WEIGHTS,
  });
}
