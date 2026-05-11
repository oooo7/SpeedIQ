import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId, { requireSmsEnabled: false });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { data, error } = await access.supabase
    .from("sms_account_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId, { requireSmsEnabled: false });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  if (!["owner", "admin"].includes(access.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const patch = {
    project_id: projectId,
    respect_opt_out_for_campaigns: body?.respect_opt_out_for_campaigns,
    advanced_opt_out_enabled: body?.advanced_opt_out_enabled,
    opt_out_keywords: body?.opt_out_keywords,
    opt_in_keywords: body?.opt_in_keywords,
    help_keywords: body?.help_keywords,
    opt_out_response_enabled: body?.opt_out_response_enabled,
    opt_out_response_text: body?.opt_out_response_text,
    opt_in_response_enabled: body?.opt_in_response_enabled,
    opt_in_response_text: body?.opt_in_response_text,
    help_response_enabled: body?.help_response_enabled,
    help_response_text: body?.help_response_text,
    welcome_message_enabled: body?.welcome_message_enabled,
    welcome_message_text: body?.welcome_message_text,
    off_hours_message_enabled: body?.off_hours_message_enabled,
    off_hours_message_text: body?.off_hours_message_text,
    timezone: body?.timezone,
    working_hours: body?.working_hours,
    auto_resolve_chats: body?.auto_resolve_chats,
  };

  const { data, error } = await access.supabase
    .from("sms_account_settings")
    .upsert(patch, { onConflict: "project_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
