import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RefundBody {
  project_id?: string;
  amount?: number;
  notes?: string;
  reference_ledger_id?: number; // optional: original charge being refunded
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as RefundBody | null;
  if (!body?.project_id || !body.amount || body.amount <= 0) {
    return NextResponse.json({ error: "project_id and positive amount required" }, { status: 400 });
  }

  const metadata: Record<string, unknown> = {};
  if (body.reference_ledger_id) metadata.reference_ledger_id = body.reference_ledger_id;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_grant_credits", {
    p_actor: auth.ctx.user.id,
    p_project_id: body.project_id,
    p_amount: body.amount,
    p_reason: "refund",
    p_notes: body.notes ?? null,
    p_metadata: metadata,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ new_balance: data });
}
