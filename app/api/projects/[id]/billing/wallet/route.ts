import { NextResponse } from "next/server";

import { BILLING_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

interface WalletPatchBody {
  auto_recharge_enabled?: boolean;
  auto_recharge_threshold?: number | null;
  auto_recharge_pack_id?: string | null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: "Billing is disabled" }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  if (!projectId) return NextResponse.json({ error: "Project ID required" }, { status: 400 });

  const role = await getProjectRole(supabase, projectId, user.id);
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Only owners and admins can edit wallet" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as WalletPatchBody | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.auto_recharge_enabled !== undefined) patch.auto_recharge_enabled = body.auto_recharge_enabled;
  if (body.auto_recharge_threshold !== undefined) patch.auto_recharge_threshold = body.auto_recharge_threshold;
  if (body.auto_recharge_pack_id !== undefined) patch.auto_recharge_pack_id = body.auto_recharge_pack_id;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  // Ensure wallet row exists; upsert handles both cases.
  const { error } = await admin
    .from("credit_wallets")
    .upsert({ project_id: projectId, balance: 0, ...patch }, { onConflict: "project_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
