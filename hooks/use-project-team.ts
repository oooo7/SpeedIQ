"use client";

import { useCallback, useEffect, useState } from "react";

import type { ProjectInvite } from "@/lib/team";
import type { ProjectMember } from "@/lib/team";

interface TeamData {
  members: ProjectMember[];
  invites: ProjectInvite[];
  role: string | null;
}

export function useProjectTeam(projectId: string | null) {
  const [data, setData] = useState<TeamData>({ members: [], invites: [], role: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!projectId) {
      setData({ members: [], invites: [], role: null });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/team`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to load team");
      }
      const json = await res.json();
      setData({
        members: json.members ?? [],
        invites: json.invites ?? [],
        role: json.role ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
      setData({ members: [], invites: [], role: null });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const canInvite = data.role === "owner" || data.role === "admin";
  const canChangeRole = data.role === "owner";
  const canManage = canInvite;

  return { ...data, loading, error, refetch: fetchTeam, canManage, canInvite, canChangeRole };
}
