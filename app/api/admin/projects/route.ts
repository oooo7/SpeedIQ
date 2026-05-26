import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * List projects with subscription + wallet rollup. Used for the admin
 * project search (refund/adjust flows) and transactions filter.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));

  const admin = createAdminClient();
  let projectsQ = admin
    .from("projects")
    .select("id, name, owner_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (search) projectsQ = projectsQ.ilike("name", `%${search}%`);
  const { data: projects, error, count } = await projectsQ;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (projects ?? []).map((p) => p.id as string);
  const [subsResp, walletsResp] = await Promise.all([
    ids.length
      ? admin
          .from("project_subscriptions")
          .select("project_id, plan_id, status, provider, currency, billing_cycle, current_period_end, trial_ends_at, cancel_at_period_end")
          .in("project_id", ids)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
    ids.length
      ? admin
          .from("credit_wallets")
          .select("project_id, balance, auto_recharge_enabled")
          .in("project_id", ids)
      : Promise.resolve({ data: [] as { project_id: string }[] }),
  ]);
  const subMap = new Map((subsResp.data ?? []).map((s) => [s.project_id, s]));
  const walletMap = new Map((walletsResp.data ?? []).map((w) => [w.project_id, w]));

  // Owner emails
  const ownerIds = Array.from(new Set((projects ?? []).map((p) => p.owner_id as string)));
  const ownerEmailMap = new Map<string, string>();
  for (const id of ownerIds) {
    const { data: u } = await admin.auth.admin.getUserById(id);
    if (u?.user?.email) ownerEmailMap.set(id, u.user.email);
  }

  return NextResponse.json({
    projects: (projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      owner_email: ownerEmailMap.get(p.owner_id as string) ?? null,
      created_at: p.created_at,
      subscription: subMap.get(p.id as string) ?? null,
      wallet: walletMap.get(p.id as string) ?? null,
    })),
    page,
    page_size: PAGE_SIZE,
    total: count ?? 0,
  });
}
