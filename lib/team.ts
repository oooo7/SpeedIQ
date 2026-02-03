import type { SupabaseClient } from "@supabase/supabase-js";

import { randomBytes } from "crypto";

export type ProjectRole = "owner" | "admin" | "editor" | "viewer";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  email?: string;
  name?: string;
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  role: string;
  invited_by: string;
  token: string;
  expires_at: string;
  created_at: string;
  inviter_name?: string;
}

type SupabaseResult<T> = {
  data: T | null;
  error: string | null;
};

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createProjectInvite(
  supabase: SupabaseClient,
  projectId: string,
  email: string,
  role: "admin" | "editor" | "viewer",
  invitedBy: string
): Promise<SupabaseResult<{ id: string; token: string; expires_at: string }>> {
  const token = generateInviteToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("project_invites")
    .insert({
      project_id: projectId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, token, expires_at")
    .single();

  return {
    data: data ?? null,
    error: error?.message ?? null,
  };
}

export async function getInviteByToken(
  supabase: SupabaseClient,
  token: string
): Promise<SupabaseResult<{ id: string; project_id: string; email: string; role: string; project_name: string; inviter_name: string }>> {
  const { data, error } = await supabase.rpc("get_invite_by_token", { invite_token: token });

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = (data ?? []) as { project_name: string; inviter_name: string; email: string; role: string }[];
  const invite = rows[0];

  if (!invite?.project_name) {
    return { data: null, error: "Invite not found or expired" };
  }

  return {
    data: {
      id: "",
      project_id: "",
      email: invite.email,
      role: invite.role,
      project_name: invite.project_name,
      inviter_name: invite.inviter_name ?? "A team member",
    },
    error: null,
  };
}

export async function acceptInviteRpc(supabase: SupabaseClient, token: string): Promise<SupabaseResult<{ project_id: string }>> {
  const { data, error } = await supabase.rpc("accept_project_invite", { invite_token: token });

  if (error) {
    return { data: null, error: error.message };
  }

  const rows = (data ?? []) as { project_id: string }[];
  const first = rows[0];
  if (!first?.project_id) {
    return { data: null, error: "Failed to accept invite" };
  }

  return {
    data: { project_id: first.project_id },
    error: null,
  };
}

export async function getProjectRole(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<ProjectRole | null> {
  const { data } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  if (data?.role) {
    return data.role as ProjectRole;
  }

  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id === userId) {
    return "owner";
  }

  return null;
}

export async function getProjectMembers(
  supabase: SupabaseClient,
  projectId: string
): Promise<SupabaseResult<ProjectMember[]>> {
  const { data, error } = await supabase.rpc("get_project_team_members", {
    p_project_id: projectId,
  });

  if (error) {
    return { data: [], error: error.message };
  }

  const rows = (data ?? []) as {
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    email: string | null;
    full_name: string | null;
  }[];

  return {
    data: rows.map((r) => ({
      id: r.id,
      project_id: r.project_id,
      user_id: r.user_id,
      role: r.role as ProjectRole,
      joined_at: r.joined_at,
      email: r.email ?? undefined,
      name: r.full_name ?? undefined,
    })),
    error: null,
  };
}

export async function getProjectInvites(
  supabase: SupabaseClient,
  projectId: string
): Promise<SupabaseResult<ProjectInvite[]>> {
  const { data, error } = await supabase
    .from("project_invites")
    .select("*")
    .eq("project_id", projectId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return {
    data: data ?? [],
    error: error?.message ?? null,
  };
}

export async function revokeInvite(
  supabase: SupabaseClient,
  inviteId: string,
  projectId: string,
  userId: string
): Promise<SupabaseResult<void>> {
  const role = await getProjectRole(supabase, projectId, userId);
  if (role !== "owner" && role !== "admin") {
    return { data: null, error: "Forbidden" };
  }

  const { error } = await supabase
    .from("project_invites")
    .delete()
    .eq("id", inviteId)
    .eq("project_id", projectId);

  return { data: null, error: error?.message ?? null };
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  projectId: string,
  memberUserId: string,
  newRole: "admin" | "editor" | "viewer",
  actorUserId: string
): Promise<SupabaseResult<void>> {
  const actorRole = await getProjectRole(supabase, projectId, actorUserId);
  if (actorRole !== "owner") {
    return { data: null, error: "Only the project owner can change roles" };
  }

  const memberRole = await getProjectRole(supabase, projectId, memberUserId);
  if (memberRole === "owner") {
    return { data: null, error: "Cannot change the owner's role" };
  }

  const { error } = await supabase
    .from("project_members")
    .update({ role: newRole })
    .eq("project_id", projectId)
    .eq("user_id", memberUserId);

  return { data: null, error: error?.message ?? null };
}

export async function removeMember(
  supabase: SupabaseClient,
  projectId: string,
  memberUserId: string,
  actorUserId: string
): Promise<SupabaseResult<void>> {
  const actorRole = await getProjectRole(supabase, projectId, actorUserId);
  if (actorRole !== "owner" && actorRole !== "admin") {
    return { data: null, error: "Forbidden" };
  }

  const memberRole = await getProjectRole(supabase, projectId, memberUserId);
  if (memberRole === "owner") {
    return { data: null, error: "Cannot remove project owner" };
  }
  if (actorRole === "admin" && memberRole === "admin") {
    return { data: null, error: "Admins cannot remove other admins" };
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", memberUserId);

  return { data: null, error: error?.message ?? null };
}
