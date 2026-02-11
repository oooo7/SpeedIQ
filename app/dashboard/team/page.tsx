"use client";

import { FormEvent, useState } from "react";

import { Copy, Loader2, MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";
import { useProjectTeam } from "@/hooks/use-project-team";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
] as const;

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getInitials(name: string | undefined, email: string | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "?";
}

export default function TeamPage() {
  const { activeProject } = useProjectContext();
  const { members, invites, loading, error, refetch, canManage, canInvite, canChangeRole } =
    useProjectTeam(activeProject?.id ?? null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader label="Team" title="Team" description="Select a project to manage its team." />
      </div>
    );
  }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setInviting(true);
    setInviteUrl(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create invite");
      }

      setEmail("");
      toast.success("Invite created");
      setInviteUrl(data.invite_url);
      refetch();
    } catch (err) {
      toast.error("Could not create invite", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    void navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied");
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to revoke");
      }
      toast.success("Invite revoked");
      refetch();
    } catch (err) {
      toast.error("Could not revoke invite", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleChangeRole = async (userId: string, newRole: "admin" | "editor" | "viewer") => {
    try {
      const res = await fetch(`/api/projects/${activeProject!.id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update role");
      }
      toast.success("Role updated");
      refetch();
    } catch (err) {
      toast.error("Could not update role", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("Remove this member from the project?")) return;

    try {
      const res = await fetch(`/api/projects/${activeProject.id}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove");
      }
      toast.success("Member removed");
      refetch();
    } catch (err) {
      toast.error("Could not remove member", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader label="Team" title="Team" description="Loading…" />
        <LoadingState message="Loading team…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader label="Team" title="Team" description={error} />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        label="Team"
        title="Team"
        description="Invite members and manage roles for this project."
      />

      {canInvite && (
        <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base">Invite member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="invite-email" className="mb-1 block text-xs text-muted-foreground">
                  Email
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={inviting}
                />
              </div>
              <div className="w-full sm:w-36">
                <label htmlFor="invite-role" className="mb-1 block text-xs text-muted-foreground">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "editor" | "viewer")}
                  className="flex h-9 w-full rounded-lg border border-gray-100 dark:border-gray-800/80 bg-transparent px-3 py-1 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" disabled={inviting} className="gap-2">
                {inviting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Invite
              </Button>
            </form>
            {inviteUrl && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
                <span className="flex-1 truncate text-sm text-muted-foreground">{inviteUrl}</span>
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1 shrink-0">
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 dark:border-gray-800/80 px-4 py-3"
                >
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 rounded-full bg-primary/10">
                    <AvatarFallback className="rounded-full bg-primary/10 text-primary">
                      {getInitials(member.name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {member.name ?? member.email ?? `User ${member.user_id.slice(0, 8)}...`}
                    </p>
                      <Badge variant="secondary" className="mt-0.5 text-xs">
                        {formatRole(member.role)}
                      </Badge>
                    </div>
                    {member.email && member.name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                    )}
                    
                  </div>
                </div>
                {canManage && member.role !== "owner" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canChangeRole && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Change role</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {ROLES.filter((r) => r.value !== member.role).map((r) => (
                              <DropdownMenuItem
                                key={r.value}
                                onClick={() => handleChangeRole(member.user_id, r.value)}
                              >
                                {r.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))
          )}
          </div>
        </CardContent>
      </Card>

      {canManage && invites.length > 0 && (
        <Card className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-base">Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-gray-100 dark:border-gray-800/80 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{invite.email}</p>
                    <Badge variant="secondary" className="mt-0.5 text-xs">
                      {formatRole(invite.role)} (pending)
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
