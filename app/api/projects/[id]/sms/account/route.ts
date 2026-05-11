import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId, { requireSmsEnabled: false });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  }

  const { data, error } = await access.supabase
    .from("sms_accounts")
    .select("id, project_id, twilio_account_sid, messaging_service_sid, default_from, onboarding_state, created_at, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ account: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId, { requireSmsEnabled: false });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  }

  if (!["owner", "admin"].includes(access.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const onboardingState = body?.onboarding_state?.trim() || "connected";
  const record = {
    project_id: projectId,
    twilio_account_sid: body?.twilio_account_sid?.trim() || null,
    messaging_service_sid: body?.messaging_service_sid?.trim() || null,
    default_from: body?.default_from?.trim() || null,
    onboarding_state: onboardingState,
  };

  const { data, error } = await access.supabase
    .from("sms_accounts")
    .upsert(record, { onConflict: "project_id" })
    .select("id, project_id, twilio_account_sid, messaging_service_sid, default_from, onboarding_state, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.onboarding_state === "connected") {
    await access.supabase
      .from("projects")
      .update({ sms_channel_enabled: true })
      .eq("id", projectId);
  }

  return NextResponse.json({ account: data });
}
