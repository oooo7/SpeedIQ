import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createProject, fetchProjectsForUser } from "@/lib/projects";
import { ACTIVE_PROJECT_COOKIE, ACTIVE_PROJECT_COOKIE_MAX_AGE } from "@/lib/projects/constants";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: projects, error } = await fetchProjectsForUser(supabase, user.id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const cookieStore = await cookies();
  const activeProjectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;

  return NextResponse.json({
    projects,
    activeProjectId,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = (body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  const { data: project, error } = await createProject(supabase, user.id, { name });
  if (error || !project) {
    return NextResponse.json({ error: error ?? "Unable to create project" }, { status: 500 });
  }

  const response = NextResponse.json({ project }, { status: 201 });
  response.cookies.set(ACTIVE_PROJECT_COOKIE, project.id, {
    path: "/",
    sameSite: "lax",
    maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
  });

  return response;
}
