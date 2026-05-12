import { NextResponse } from "next/server";

import { CREDIT_PACKS, PLANS } from "@/lib/billing/config";
import { getActivePlanForProject } from "@/lib/billing/subscription";
import { BILLING_ENABLED } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: "Billing is disabled" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ subscription, plan }, wallet, ledger, plans, campaignsThisMonth] = await Promise.all([
    getActivePlanForProject(supabase, projectId),
    supabase.from("credit_wallets").select("balance, auto_recharge_enabled, auto_recharge_threshold, auto_recharge_pack_id").eq("project_id", projectId).maybeSingle(),
    supabase
      .from("credit_ledger")
      .select("id, delta, reason, ref_type, ref_id, balance_after, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("subscription_plans").select("*").order("sort_order"),
    supabase
      .from("project_campaign_counts_current_month")
      .select("campaigns_this_month")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    subscription,
    plan,
    wallet: wallet.data ?? { balance: 0, auto_recharge_enabled: false },
    ledger: ledger.data ?? [],
    plans: plans.data ?? [],
    role,
    campaigns_this_month: campaignsThisMonth.data?.campaigns_this_month ?? 0,
    credit_packs: CREDIT_PACKS,
    plan_catalog: PLANS,
  });
}
