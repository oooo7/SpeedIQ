import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { removeMember, updateMemberRole } from "@/lib/team";

const ALLOWED_ROLES = ["admin", "editor", "viewer"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, userId: memberUserId } = await params;
  if (!projectId || !memberUserId) {
    return NextResponse.json({ error: "Project ID and user ID are required" }, { status: 400 });
  }

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role = body?.role;
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role. Must be admin, editor, or viewer." }, { status: 400 });
  }

  const { error } = await updateMemberRole(supabase, projectId, memberUserId, role, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: error.includes("owner") ? 403 : 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, userId: memberUserId } = await params;
  if (!projectId || !memberUserId) {
    return NextResponse.json({ error: "Project ID and user ID are required" }, { status: 400 });
  }

  const { error } = await removeMember(supabase, projectId, memberUserId, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: error === "Forbidden" ? 403 : 500 });
  }

  return NextResponse.json({ success: true });
}
