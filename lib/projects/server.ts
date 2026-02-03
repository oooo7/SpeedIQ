import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import { ACTIVE_PROJECT_COOKIE } from "@/lib/projects/constants";
import { fetchProjectById, fetchProjectsForUser } from "@/lib/projects";
import { getProjectRole } from "@/lib/team";
import type { Project } from "@/types/project";

async function hasProjectAccess(supabase: SupabaseClient, projectId: string, userId: string): Promise<boolean> {
  const role = await getProjectRole(supabase, projectId, userId);
  return role !== null;
}

export function getActiveProjectId(cookieStore: ReadonlyRequestCookies): string | null {
  return cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value ?? null;
}

export async function loadProjectsForUser(
  supabase: SupabaseClient,
  userId: string,
  cookieStore: ReadonlyRequestCookies,
): Promise<{
  projects: Project[];
  activeProject: Project | null;
  activeProjectId: string | null;
}> {
  const { data: projects } = await fetchProjectsForUser(supabase, userId);
  const activeProjectId = getActiveProjectId(cookieStore);

  let activeProject: Project | null = null;
  if (activeProjectId) {
    const { data } = await fetchProjectById(supabase, activeProjectId);
    if (data && (data.owner_id === userId || await hasProjectAccess(supabase, activeProjectId, userId))) {
      activeProject = data;
    }
  }

  return {
    projects: projects ?? [],
    activeProject,
    activeProjectId,
  };
}
