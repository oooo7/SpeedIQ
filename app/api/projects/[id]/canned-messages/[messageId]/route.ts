import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

const BUCKET = "canned-message-attachments";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, messageId } = await params;
  if (!projectId || !messageId) {
    return NextResponse.json({ error: "Project ID and message ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name?.trim();
  if (body.type !== undefined) updates.type = body.type;
  if (body.channel !== undefined) updates.channel = body.channel;
  if (body.body !== undefined) updates.body = body.body?.trim() ?? null;
  if (body.attachment_path !== undefined) updates.attachment_path = body.attachment_path?.trim() ?? null;
  if (body.attachment_filename !== undefined) updates.attachment_filename = body.attachment_filename?.trim() ?? null;

  const validTypes = ["text", "image", "file", "video", "audio"];
  if (updates.type && !validTypes.includes(updates.type as string)) {
    return NextResponse.json({ error: "type must be one of: text, image, file, video, audio" }, { status: 400 });
  }
  if (updates.channel && updates.channel !== "whatsapp" && updates.channel !== "email") {
    return NextResponse.json({ error: "channel must be whatsapp or email" }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("canned_messages")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", messageId)
    .select("id, project_id, name, type, channel, body, attachment_path, attachment_filename, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ canned_message: message });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, messageId } = await params;
  if (!projectId || !messageId) {
    return NextResponse.json({ error: "Project ID and message ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("canned_messages")
    .select("attachment_path")
    .eq("project_id", projectId)
    .eq("id", messageId)
    .single();

  if (!fetchError && existing?.attachment_path) {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([existing.attachment_path]);
  }

  const { error } = await supabase
    .from("canned_messages")
    .delete()
    .eq("project_id", projectId)
    .eq("id", messageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
