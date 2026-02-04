import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { fetchProjectById } from "@/lib/projects";
import { ACTIVE_PROJECT_COOKIE, ACTIVE_PROJECT_COOKIE_MAX_AGE } from "@/lib/projects/constants";
import { getProjectRole } from "@/lib/team";

/**
 * GET with ?projectId=xxx - sets the active project cookie and redirects to /dashboard.
 * Use this when navigating from /projects so the cookie is set before the dashboard loads.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? null;

  if (!projectId) {
    const res = NextResponse.redirect(new URL("/projects", request.url));
    res.cookies.set(ACTIVE_PROJECT_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const { data, error } = await fetchProjectById(supabase, projectId);
  if (error || !data) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  const redirectUrl = new URL("/dashboard", request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(ACTIVE_PROJECT_COOKIE, projectId, {
    path: "/",
    sameSite: "lax",
    maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
  });

  return response;
}
