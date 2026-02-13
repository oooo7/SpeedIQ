import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

const MESSAGE_TYPE = ["text", "image", "video", "audio", "file"] as const;
type MessageType = (typeof MESSAGE_TYPE)[number];

function messageType(v: unknown): MessageType {
  return MESSAGE_TYPE.includes(v as MessageType) ? (v as MessageType) : "text";
}

const DEFAULT_SETTINGS = {
  respect_opt_out_for_campaigns: false,
  opt_out_keywords: [] as string[],
  opt_out_response_enabled: false,
  opt_out_response_type: "text" as MessageType,
  opt_out_response_text: null as string | null,
  opt_out_response_attachment_path: null as string | null,
  opt_out_response_attachment_filename: null as string | null,
  opt_in_keywords: [] as string[],
  opt_in_response_enabled: false,
  opt_in_response_type: "text" as MessageType,
  opt_in_response_text: null as string | null,
  opt_in_response_attachment_path: null as string | null,
  opt_in_response_attachment_filename: null as string | null,
  auto_resolve_chats: false,
  welcome_message_enabled: false,
  welcome_message_type: "text" as MessageType,
  welcome_message_text: null as string | null,
  welcome_message_attachment_path: null as string | null,
  welcome_message_attachment_filename: null as string | null,
  off_hours_message_enabled: false,
  off_hours_message_type: "text" as MessageType,
  off_hours_message_text: null as string | null,
  off_hours_message_attachment_path: null as string | null,
  off_hours_message_attachment_filename: null as string | null,
  timezone: "UTC",
  working_hours: {} as Record<string, { enabled: boolean; from?: string; to?: string }>,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from("whatsapp_account_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }

  const workingHours = (row.working_hours as Record<string, { enabled: boolean; from?: string; to?: string }>) ?? {};

  const r = row as Record<string, unknown>;
  return NextResponse.json({
    settings: {
      respect_opt_out_for_campaigns: !!row.respect_opt_out_for_campaigns,
      opt_out_keywords: Array.isArray(row.opt_out_keywords) ? row.opt_out_keywords : [],
      opt_out_response_enabled: !!row.opt_out_response_enabled,
      opt_out_response_type: messageType(r.opt_out_response_type),
      opt_out_response_text: row.opt_out_response_text ?? null,
      opt_out_response_attachment_path: (r.opt_out_response_attachment_path as string) ?? null,
      opt_out_response_attachment_filename: (r.opt_out_response_attachment_filename as string) ?? null,
      opt_in_keywords: Array.isArray(row.opt_in_keywords) ? row.opt_in_keywords : [],
      opt_in_response_enabled: !!row.opt_in_response_enabled,
      opt_in_response_type: messageType(r.opt_in_response_type),
      opt_in_response_text: row.opt_in_response_text ?? null,
      opt_in_response_attachment_path: (r.opt_in_response_attachment_path as string) ?? null,
      opt_in_response_attachment_filename: (r.opt_in_response_attachment_filename as string) ?? null,
      auto_resolve_chats: !!row.auto_resolve_chats,
      welcome_message_enabled: !!row.welcome_message_enabled,
      welcome_message_type: messageType(r.welcome_message_type),
      welcome_message_text: row.welcome_message_text ?? null,
      welcome_message_attachment_path: (r.welcome_message_attachment_path as string) ?? null,
      welcome_message_attachment_filename: (r.welcome_message_attachment_filename as string) ?? null,
      off_hours_message_enabled: !!row.off_hours_message_enabled,
      off_hours_message_type: messageType(r.off_hours_message_type),
      off_hours_message_text: row.off_hours_message_text ?? null,
      off_hours_message_attachment_path: (r.off_hours_message_attachment_path as string) ?? null,
      off_hours_message_attachment_filename: (r.off_hours_message_attachment_filename as string) ?? null,
      timezone: row.timezone ?? "UTC",
      working_hours: workingHours,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role || (role !== "owner" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));

  const payload: Record<string, unknown> = {
    project_id: projectId,
    updated_at: new Date().toISOString(),
  };

  if (typeof body.respect_opt_out_for_campaigns === "boolean") {
    payload.respect_opt_out_for_campaigns = body.respect_opt_out_for_campaigns;
  }
  if (Array.isArray(body.opt_out_keywords)) {
    payload.opt_out_keywords = body.opt_out_keywords.filter((k: unknown) => typeof k === "string").map((k: string) => k.trim()).filter(Boolean);
  }
  if (typeof body.opt_out_response_enabled === "boolean") {
    payload.opt_out_response_enabled = body.opt_out_response_enabled;
  }
  if (body.opt_out_response_text !== undefined) {
    payload.opt_out_response_text = typeof body.opt_out_response_text === "string" ? body.opt_out_response_text.trim() || null : null;
  }
  if (body.opt_out_response_type !== undefined) {
    payload.opt_out_response_type = messageType(body.opt_out_response_type);
  }
  if (body.opt_out_response_attachment_path !== undefined) {
    payload.opt_out_response_attachment_path = typeof body.opt_out_response_attachment_path === "string" ? body.opt_out_response_attachment_path.trim() || null : null;
  }
  if (body.opt_out_response_attachment_filename !== undefined) {
    payload.opt_out_response_attachment_filename = typeof body.opt_out_response_attachment_filename === "string" ? body.opt_out_response_attachment_filename.trim() || null : null;
  }
  if (Array.isArray(body.opt_in_keywords)) {
    payload.opt_in_keywords = body.opt_in_keywords.filter((k: unknown) => typeof k === "string").map((k: string) => k.trim()).filter(Boolean);
  }
  if (typeof body.opt_in_response_enabled === "boolean") {
    payload.opt_in_response_enabled = body.opt_in_response_enabled;
  }
  if (body.opt_in_response_text !== undefined) {
    payload.opt_in_response_text = typeof body.opt_in_response_text === "string" ? body.opt_in_response_text.trim() || null : null;
  }
  if (body.opt_in_response_type !== undefined) {
    payload.opt_in_response_type = messageType(body.opt_in_response_type);
  }
  if (body.opt_in_response_attachment_path !== undefined) {
    payload.opt_in_response_attachment_path = typeof body.opt_in_response_attachment_path === "string" ? body.opt_in_response_attachment_path.trim() || null : null;
  }
  if (body.opt_in_response_attachment_filename !== undefined) {
    payload.opt_in_response_attachment_filename = typeof body.opt_in_response_attachment_filename === "string" ? body.opt_in_response_attachment_filename.trim() || null : null;
  }
  if (typeof body.auto_resolve_chats === "boolean") {
    payload.auto_resolve_chats = body.auto_resolve_chats;
  }
  if (typeof body.welcome_message_enabled === "boolean") {
    payload.welcome_message_enabled = body.welcome_message_enabled;
  }
  if (body.welcome_message_text !== undefined) {
    payload.welcome_message_text = typeof body.welcome_message_text === "string" ? body.welcome_message_text.trim() || null : null;
  }
  if (body.welcome_message_type !== undefined) {
    payload.welcome_message_type = messageType(body.welcome_message_type);
  }
  if (body.welcome_message_attachment_path !== undefined) {
    payload.welcome_message_attachment_path = typeof body.welcome_message_attachment_path === "string" ? body.welcome_message_attachment_path.trim() || null : null;
  }
  if (body.welcome_message_attachment_filename !== undefined) {
    payload.welcome_message_attachment_filename = typeof body.welcome_message_attachment_filename === "string" ? body.welcome_message_attachment_filename.trim() || null : null;
  }
  if (typeof body.off_hours_message_enabled === "boolean") {
    payload.off_hours_message_enabled = body.off_hours_message_enabled;
  }
  if (body.off_hours_message_text !== undefined) {
    payload.off_hours_message_text = typeof body.off_hours_message_text === "string" ? body.off_hours_message_text.trim() || null : null;
  }
  if (body.off_hours_message_type !== undefined) {
    payload.off_hours_message_type = messageType(body.off_hours_message_type);
  }
  if (body.off_hours_message_attachment_path !== undefined) {
    payload.off_hours_message_attachment_path = typeof body.off_hours_message_attachment_path === "string" ? body.off_hours_message_attachment_path.trim() || null : null;
  }
  if (body.off_hours_message_attachment_filename !== undefined) {
    payload.off_hours_message_attachment_filename = typeof body.off_hours_message_attachment_filename === "string" ? body.off_hours_message_attachment_filename.trim() || null : null;
  }
  if (typeof body.timezone === "string") {
    payload.timezone = body.timezone.trim() || "UTC";
  }
  if (body.working_hours !== undefined && typeof body.working_hours === "object" && body.working_hours !== null) {
    payload.working_hours = body.working_hours;
  }

  const { data: row, error } = await supabase
    .from("whatsapp_account_settings")
    .upsert(payload as Record<string, unknown>, { onConflict: "project_id", ignoreDuplicates: false })
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workingHours = (row?.working_hours as Record<string, { enabled: boolean; from?: string; to?: string }>) ?? {};
  const resRow = row as Record<string, unknown>;

  return NextResponse.json({
    settings: {
      respect_opt_out_for_campaigns: !!row?.respect_opt_out_for_campaigns,
      opt_out_keywords: Array.isArray(row?.opt_out_keywords) ? row.opt_out_keywords : [],
      opt_out_response_enabled: !!row?.opt_out_response_enabled,
      opt_out_response_type: messageType(resRow?.opt_out_response_type),
      opt_out_response_text: row?.opt_out_response_text ?? null,
      opt_out_response_attachment_path: (resRow?.opt_out_response_attachment_path as string) ?? null,
      opt_out_response_attachment_filename: (resRow?.opt_out_response_attachment_filename as string) ?? null,
      opt_in_keywords: Array.isArray(row?.opt_in_keywords) ? row.opt_in_keywords : [],
      opt_in_response_enabled: !!row?.opt_in_response_enabled,
      opt_in_response_type: messageType(resRow?.opt_in_response_type),
      opt_in_response_text: row?.opt_in_response_text ?? null,
      opt_in_response_attachment_path: (resRow?.opt_in_response_attachment_path as string) ?? null,
      opt_in_response_attachment_filename: (resRow?.opt_in_response_attachment_filename as string) ?? null,
      auto_resolve_chats: !!row?.auto_resolve_chats,
      welcome_message_enabled: !!row?.welcome_message_enabled,
      welcome_message_type: messageType(resRow?.welcome_message_type),
      welcome_message_text: row?.welcome_message_text ?? null,
      welcome_message_attachment_path: (resRow?.welcome_message_attachment_path as string) ?? null,
      welcome_message_attachment_filename: (resRow?.welcome_message_attachment_filename as string) ?? null,
      off_hours_message_enabled: !!row?.off_hours_message_enabled,
      off_hours_message_type: messageType(resRow?.off_hours_message_type),
      off_hours_message_text: row?.off_hours_message_text ?? null,
      off_hours_message_attachment_path: (resRow?.off_hours_message_attachment_path as string) ?? null,
      off_hours_message_attachment_filename: (resRow?.off_hours_message_attachment_filename as string) ?? null,
      timezone: row?.timezone ?? "UTC",
      working_hours: workingHours,
    },
  });
}
