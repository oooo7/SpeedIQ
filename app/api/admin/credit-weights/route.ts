import { NextResponse } from "next/server";

import { requireAdmin, writeAudit } from "@/lib/billing/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface WeightBody {
  id?: number;
  channel?: string;
  message_type?: string;
  credits?: number;
  description?: string | null;
}

const ALLOWED_CHANNELS = new Set(["email", "whatsapp", "sms", "ai"]);

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_weights")
    .select("*")
    .order("channel")
    .order("message_type");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ weights: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as WeightBody | null;
  if (!body?.channel || !body.message_type || !body.credits) {
    return NextResponse.json({ error: "channel, message_type, credits required" }, { status: 400 });
  }
  if (!ALLOWED_CHANNELS.has(body.channel)) {
    return NextResponse.json({ error: "invalid channel" }, { status: 400 });
  }
  if (body.credits <= 0) {
    return NextResponse.json({ error: "credits must be positive" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_weights")
    .insert({
      channel: body.channel,
      message_type: body.message_type,
      credits: body.credits,
      description: body.description ?? null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "credit_weight.create",
    targetType: "credit_weight",
    targetId: String(data.id),
    before: null,
    after: data,
  });
  return NextResponse.json({ weight: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as WeightBody | null;
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("credit_weights")
    .select("*")
    .eq("id", body.id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "Weight not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.credits !== undefined) {
    if (body.credits <= 0) {
      return NextResponse.json({ error: "credits must be positive" }, { status: 400 });
    }
    patch.credits = body.credits;
  }
  if (body.description !== undefined) patch.description = body.description;
  patch.updated_at = new Date().toISOString();

  const { data: updated, error } = await admin
    .from("credit_weights")
    .update(patch)
    .eq("id", body.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "credit_weight.update",
    targetType: "credit_weight",
    targetId: String(body.id),
    before,
    after: updated,
  });
  return NextResponse.json({ weight: updated });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("credit_weights")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "Weight not found" }, { status: 404 });

  const { error } = await admin.from("credit_weights").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "credit_weight.delete",
    targetType: "credit_weight",
    targetId: id,
    before,
    after: null,
  });
  return NextResponse.json({ ok: true });
}
