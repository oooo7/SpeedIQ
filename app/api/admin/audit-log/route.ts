import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const targetType = url.searchParams.get("target_type");
  const actorId = url.searchParams.get("actor_id");
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));

  const admin = createAdminClient();
  let q = admin
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (action) q = q.eq("action", action);
  if (targetType) q = q.eq("target_type", targetType);
  if (actorId) q = q.eq("actor_id", actorId);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach actor emails for display.
  const actorIds = Array.from(new Set((data ?? []).map((r) => r.actor_id as string)));
  const actorEmailMap = new Map<string, string>();
  for (const id of actorIds) {
    const { data: u } = await admin.auth.admin.getUserById(id);
    if (u?.user?.email) actorEmailMap.set(id, u.user.email);
  }

  return NextResponse.json({
    rows: (data ?? []).map((r) => ({
      ...r,
      actor_email: actorEmailMap.get(r.actor_id as string) ?? null,
    })),
    page,
    page_size: PAGE_SIZE,
    total: count ?? 0,
  });
}
