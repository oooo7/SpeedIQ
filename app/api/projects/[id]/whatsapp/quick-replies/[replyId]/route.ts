import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, replyId } = await params;
  if (!projectId || !replyId) {
    return NextResponse.json({ error: "Project ID and reply ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title?.trim();
  if (body.body !== undefined) updates.body = body.body?.trim();
  if (body.category !== undefined) updates.category = body.category?.trim() ?? null;

  const { data: quickReply, error } = await supabase
    .from("whatsapp_quick_replies")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", replyId)
    .select("id, project_id, title, body, category, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quick_reply: quickReply });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, replyId } = await params;
  if (!projectId || !replyId) {
    return NextResponse.json({ error: "Project ID and reply ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("whatsapp_quick_replies")
    .delete()
    .eq("project_id", projectId)
    .eq("id", replyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
