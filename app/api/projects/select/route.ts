import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { fetchProjectById } from "@/lib/projects";
import { ACTIVE_PROJECT_COOKIE, ACTIVE_PROJECT_COOKIE_MAX_AGE } from "@/lib/projects/constants";
import { getProjectRole } from "@/lib/team";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const projectId = typeof body?.projectId === "string" ? body.projectId : null;

  if (projectId) {
    const { data, error } = await fetchProjectById(supabase, projectId);
    if (error || !data) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const role = await getProjectRole(supabase, projectId, user.id);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const response = NextResponse.json({ success: true });

  if (projectId) {
    response.cookies.set(ACTIVE_PROJECT_COOKIE, projectId, {
      path: "/",
      sameSite: "lax",
      maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
    });
  } else {
    response.cookies.set(ACTIVE_PROJECT_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
