import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { deleteProject, fetchProjectById } from "@/lib/projects";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/projects/constants";

export async function DELETE(
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

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const { data: project, error: fetchError } = await fetchProjectById(supabase, id);
  if (fetchError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await deleteProject(supabase, id, user.id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;
  if (activeProjectId === id) {
    response.cookies.set(ACTIVE_PROJECT_COOKIE, "", { path: "/", maxAge: 0 });
  }

  return response;
}
