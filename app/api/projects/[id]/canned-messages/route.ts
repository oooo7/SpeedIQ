import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

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

  const { searchParams } = new URL(_request.url);
  const channel = searchParams.get("channel");
  const type = searchParams.get("type");

  let query = supabase
    .from("canned_messages")
    .select("id, project_id, name, type, channel, body, attachment_path, attachment_filename, created_at, updated_at")
    .eq("project_id", projectId)
    .order("name");

  if (channel && (channel === "whatsapp" || channel === "email")) {
    query = query.eq("channel", channel);
  }
  if (type && ["text", "image", "file", "video", "audio"].includes(type)) {
    query = query.eq("type", type);
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ canned_messages: messages ?? [] });
}

export async function POST(
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
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body?.name?.trim();
  const type = body?.type ?? "text";
  const channel = body?.channel ?? "whatsapp";
  const cannedBody = body?.body?.trim() ?? null;
  const attachmentPath = body?.attachment_path?.trim() ?? null;
  const attachmentFilename = body?.attachment_filename?.trim() ?? null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const validTypes = ["text", "image", "file", "video", "audio"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "type must be one of: text, image, file, video, audio" }, { status: 400 });
  }
  if (channel !== "whatsapp" && channel !== "email") {
    return NextResponse.json({ error: "channel must be whatsapp or email" }, { status: 400 });
  }
  if (type !== "text" && !attachmentPath) {
    return NextResponse.json({ error: "attachment_path is required for non-text types" }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("canned_messages")
    .insert({
      project_id: projectId,
      name,
      type,
      channel,
      body: cannedBody,
      attachment_path: attachmentPath || null,
      attachment_filename: attachmentFilename || null,
    })
    .select("id, project_id, name, type, channel, body, attachment_path, attachment_filename, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ canned_message: message }, { status: 201 });
}
