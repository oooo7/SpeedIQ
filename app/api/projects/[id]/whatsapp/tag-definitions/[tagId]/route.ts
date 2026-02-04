import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, tagId } = await params;
  if (!projectId || !tagId) {
    return NextResponse.json({ error: "Project ID and tag ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name?.trim();
  if (body.color !== undefined) updates.color = body.color?.trim() ?? null;

  const { data: tag, error } = await supabase
    .from("whatsapp_tag_definitions")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", tagId)
    .select("id, project_id, name, color, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Tag with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, tagId } = await params;
  if (!projectId || !tagId) {
    return NextResponse.json({ error: "Project ID and tag ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("whatsapp_tag_definitions")
    .delete()
    .eq("project_id", projectId)
    .eq("id", tagId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
