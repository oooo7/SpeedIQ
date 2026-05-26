import { NextResponse } from "next/server";

import { requireAdmin, writeAudit } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));

  const admin = createAdminClient();
  // The auth.users table isn't queryable directly without admin API; use
  // profiles + auth admin listUsers.
  const { data: { users }, error } = await admin.auth.admin.listUsers({
    page: page + 1,
    perPage: PAGE_SIZE,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = search
    ? users.filter((u) => (u.email ?? "").toLowerCase().includes(search.toLowerCase()))
    : users;

  // Bulk-fetch profiles for these users to attach is_platform_admin.
  const ids = filtered.map((u) => u.id);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, is_platform_admin").in("id", ids)
    : { data: [] };
  const adminMap = new Map((profiles ?? []).map((p) => [p.id as string, Boolean(p.is_platform_admin)]));

  const rows = filtered.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    is_platform_admin: adminMap.get(u.id) ?? false,
  }));

  return NextResponse.json({ users: rows, page, page_size: PAGE_SIZE });
}

interface UserPatchBody {
  user_id?: string;
  is_platform_admin?: boolean;
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as UserPatchBody | null;
  if (!body?.user_id || typeof body.is_platform_admin !== "boolean") {
    return NextResponse.json({ error: "user_id + is_platform_admin required" }, { status: 400 });
  }

  // Safety: don't let an admin demote themselves (would lock everyone out of admin UI).
  if (body.user_id === auth.ctx.user.id && body.is_platform_admin === false) {
    return NextResponse.json(
      { error: "You can't demote yourself. Ask another admin to do it." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("profiles")
    .select("id, is_platform_admin")
    .eq("id", body.user_id)
    .maybeSingle();

  const { error } = await admin
    .from("profiles")
    .upsert(
      { id: body.user_id, is_platform_admin: body.is_platform_admin },
      { onConflict: "id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: body.is_platform_admin ? "user.promote" : "user.demote",
    targetType: "user",
    targetId: body.user_id,
    before,
    after: { id: body.user_id, is_platform_admin: body.is_platform_admin },
  });

  return NextResponse.json({ ok: true });
}
