import { NextResponse } from "next/server";

import { requireAdmin, writeAudit } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface PackBody {
  id: string;
  name?: string;
  credits?: number;
  price_inr?: number | null;
  price_usd?: number | null;
  provider_ids?: Record<string, Record<string, string>>;
  active?: boolean;
  sort_order?: number;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_packs")
    .select("*")
    .order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ packs: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as PackBody | null;
  if (!body?.id || !body.name || !body.credits) {
    return NextResponse.json({ error: "id, name, and credits are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_packs")
    .insert({
      id: body.id,
      name: body.name,
      credits: body.credits,
      price_inr: body.price_inr ?? null,
      price_usd: body.price_usd ?? null,
      provider_ids: body.provider_ids ?? {},
      active: body.active ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "credit_pack.create",
    targetType: "credit_pack",
    targetId: body.id,
    before: null,
    after: data,
  });
  return NextResponse.json({ pack: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as PackBody | null;
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("credit_packs")
    .select("*")
    .eq("id", body.id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "Pack not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  const allowed: (keyof PackBody)[] = [
    "name",
    "credits",
    "price_inr",
    "price_usd",
    "provider_ids",
    "active",
    "sort_order",
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  patch.updated_at = new Date().toISOString();

  const { data: updated, error } = await admin
    .from("credit_packs")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "credit_pack.update",
    targetType: "credit_pack",
    targetId: body.id,
    before,
    after: updated,
  });
  return NextResponse.json({ pack: updated });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("credit_packs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "Pack not found" }, { status: 404 });

  const { error } = await admin.from("credit_packs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "credit_pack.delete",
    targetType: "credit_pack",
    targetId: id,
    before,
    after: null,
  });
  return NextResponse.json({ ok: true });
}
