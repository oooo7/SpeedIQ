import { NextResponse } from "next/server";

import { requireAdmin, writeAudit } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_plans")
    .select("*")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data ?? [] });
}

interface PlanPatchBody {
  id: string;
  name?: string;
  active?: boolean;
  sort_order?: number;
  monthly_credits?: number;
  max_contacts?: number | null;
  max_seats?: number | null;
  max_campaigns_per_month?: number | null;
  channels?: Record<string, boolean>;
  features?: Record<string, unknown>;
  analytics_retention_days?: number | null;
  price_inr_monthly?: number | null;
  price_inr_yearly?: number | null;
  price_usd_monthly?: number | null;
  price_usd_yearly?: number | null;
  provider_ids?: Record<string, Record<string, string>>;
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as PlanPatchBody | null;
  if (!body?.id) {
    return NextResponse.json({ error: "Plan id required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("subscription_plans")
    .select("*")
    .eq("id", body.id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  const allowed: (keyof PlanPatchBody)[] = [
    "name",
    "active",
    "sort_order",
    "monthly_credits",
    "max_contacts",
    "max_seats",
    "max_campaigns_per_month",
    "channels",
    "features",
    "analytics_retention_days",
    "price_inr_monthly",
    "price_inr_yearly",
    "price_usd_monthly",
    "price_usd_yearly",
    "provider_ids",
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  patch.updated_at = new Date().toISOString();

  const { data: updated, error } = await admin
    .from("subscription_plans")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "plan.update",
    targetType: "plan",
    targetId: body.id,
    before,
    after: updated,
  });

  return NextResponse.json({ plan: updated });
}
