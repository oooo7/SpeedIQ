import { NextResponse } from "next/server";

import { requireAdmin, writeAudit } from "@/lib/billing/admin";
import { invalidateRoutingCache } from "@/lib/billing/providers/router";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface SettingsPatchBody {
  // Either patch a single key, or send a bulk record.
  updates?: Record<string, unknown>;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("key, value, description, updated_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as SettingsPatchBody | null;
  if (!body?.updates || Object.keys(body.updates).length === 0) {
    return NextResponse.json({ error: "updates required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const beforeRows = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", Object.keys(body.updates));
  const before = Object.fromEntries(
    (beforeRows.data ?? []).map((r) => [r.key as string, r.value as unknown]),
  );

  // Upsert each row. We do this serially for simplicity.
  for (const [key, value] of Object.entries(body.updates)) {
    const { error } = await admin
      .from("platform_settings")
      .upsert(
        { key, value, updated_by: auth.ctx.user.id, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) {
      console.error("[admin/settings] upsert failed", { key, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // If routing keys changed, invalidate the in-process cache so the change
  // takes effect immediately (this only flushes the local app instance —
  // serverless replicas will refresh on the next 60s cache miss).
  if ("preferred_provider_inr" in body.updates || "preferred_provider_usd" in body.updates) {
    invalidateRoutingCache();
  }

  await writeAudit({
    actorId: auth.ctx.user.id,
    action: "platform_setting.update",
    targetType: "platform_setting",
    targetId: Object.keys(body.updates).join(","),
    before,
    after: body.updates,
  });

  return NextResponse.json({ ok: true });
}
