import type { SupabaseClient } from "@supabase/supabase-js";

import type { Project, ProjectInsert } from "@/types/project";

type SupabaseResult<T> = {
  data: T | null;
  error: string | null;
};

export async function fetchProjectsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<SupabaseResult<Project[]>> {
  const { data: owned, error: ownedError } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", userId);

  if (ownedError) {
    return { data: [], error: ownedError.message };
  }

  const { data: memberProjects } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId)
    .neq("role", "owner");

  const memberIds = (memberProjects ?? []).map((m) => m.project_id).filter(Boolean);
  if (memberIds.length === 0) {
    return {
      data: (owned ?? []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      error: null,
    };
  }

  const { data: shared } = await supabase
    .from("projects")
    .select("*")
    .in("id", memberIds);

  const seen = new Set<string>();
  const combined = [...(owned ?? []), ...(shared ?? [])].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return { data: combined, error: null };
}

export async function fetchProjectById(
  supabase: SupabaseClient,
  projectId: string,
): Promise<SupabaseResult<Project>> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  return {
    data: data ?? null,
    error: error?.message ?? null,
  };
}

export async function createProject(
  supabase: SupabaseClient,
  _userId: string,
  payload: ProjectInsert,
): Promise<SupabaseResult<Project>> {
  const { data, error } = await supabase.rpc("create_project", {
    p_name: payload.name,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = (data ?? []) as { project_id: string }[];
  const first = rows[0];
  if (!first?.project_id) {
    return { data: null, error: "Failed to create project" };
  }

  return fetchProjectById(supabase, first.project_id);
}

export async function deleteProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<SupabaseResult<void>> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", userId);

  return {
    data: null,
    error: error?.message ?? null,
  };
}
