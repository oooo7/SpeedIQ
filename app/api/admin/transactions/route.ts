import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  const reason = url.searchParams.get("reason");
  const minDate = url.searchParams.get("from");
  const maxDate = url.searchParams.get("to");
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));

  const admin = createAdminClient();
  let q = admin
    .from("credit_ledger")
    .select("id, project_id, delta, reason, ref_type, ref_id, balance_after, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (projectId) q = q.eq("project_id", projectId);
  if (reason) q = q.eq("reason", reason);
  if (minDate) q = q.gte("created_at", minDate);
  if (maxDate) q = q.lte("created_at", maxDate);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Join project names + owner emails for display.
  const projectIds = Array.from(new Set((data ?? []).map((r) => r.project_id))).filter(
    (id): id is string => typeof id === "string",
  );
  const projectsResp = projectIds.length
    ? await admin.from("projects").select("id, name, owner_id").in("id", projectIds)
    : { data: [] };
  const projectMap = new Map(
    (projectsResp.data ?? []).map((p) => [p.id as string, p as { id: string; name: string; owner_id: string }]),
  );

  return NextResponse.json({
    rows: (data ?? []).map((r) => ({
      ...r,
      project_name: projectMap.get(r.project_id)?.name ?? null,
    })),
    page,
    page_size: PAGE_SIZE,
    total: count ?? 0,
  });
}
