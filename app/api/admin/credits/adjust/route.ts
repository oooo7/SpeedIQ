import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface AdjustBody {
  project_id?: string;
  delta?: number; // positive = grant, negative = deduct
  notes?: string;
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as AdjustBody | null;
  if (!body?.project_id || !body.delta || body.delta === 0) {
    return NextResponse.json({ error: "project_id and non-zero delta required" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (body.delta > 0) {
    const { data, error } = await admin.rpc("admin_grant_credits", {
      p_actor: auth.ctx.user.id,
      p_project_id: body.project_id,
      p_amount: body.delta,
      p_reason: "manual_adjustment",
      p_notes: body.notes ?? null,
      p_metadata: {},
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ new_balance: data });
  }

  const { data, error } = await admin.rpc("admin_deduct_credits", {
    p_actor: auth.ctx.user.id,
    p_project_id: body.project_id,
    p_amount: Math.abs(body.delta),
    p_notes: body.notes ?? null,
    p_metadata: {},
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ new_balance: data });
}
