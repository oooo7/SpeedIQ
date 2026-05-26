"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Check, Inbox, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/dashboard/page-header";

interface PendingInvite {
  id: string;
  project_id: string;
  project_name: string;
  role: string;
  email: string;
  token: string;
  expires_at: string;
  created_at: string;
  inviter_name: string;
  inviter_email: string | null;
}

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

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function formatExpiry(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (day >= 1) return `expires in ${day}d`;
  const hr = Math.floor(diff / (1000 * 60 * 60));
  return `expires in ${hr}h`;
}

export default function InvitationsPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyToken, setBusyToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/pending", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load invites");
      }
      setInvites(data.invites ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load invites";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (invite: PendingInvite) => {
    setBusyToken(invite.token);
    try {
      const res = await fetch(`/api/invite/${invite.token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to accept invite");
      }
      toast.success("Invite accepted", {
        description: `You joined "${invite.project_name}".`,
      });
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error("Could not accept invite", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyToken(null);
    }
  };

  const handleDecline = async (invite: PendingInvite) => {
    if (!window.confirm(`Decline invite to "${invite.project_name}"?`)) return;

    setBusyToken(invite.token);
    try {
      const res = await fetch(`/api/invite/${invite.token}/decline`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to decline invite");
      }
      toast.success("Invite declined");
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      toast.error("Could not decline invite", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusyToken(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Invitations" description="Project invitations sent to your email." />
        <LoadingState message="Loading invitations…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Invitations" description={error} />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Invitations"
        description="Project invitations sent to your email. Accept to join, or decline to dismiss."
      />

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base">Pending ({invites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Inbox className="size-8 text-gray-400 dark:text-gray-600" />
              <p className="text-sm font-medium">No pending invitations</p>
              <p className="text-xs text-muted-foreground">
                When someone invites you to a project, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => {
                const busy = busyToken === invite.token;
                return (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-3 border border-gray-100 dark:border-gray-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-9 bg-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(invite.inviter_name, invite.inviter_email ?? undefined)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{invite.project_name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {formatRole(invite.role)}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          Invited by {invite.inviter_name}
                          {invite.inviter_email ? ` (${invite.inviter_email})` : ""} · {formatRelative(invite.created_at)} · {formatExpiry(invite.expires_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDecline(invite)}
                        disabled={busy}
                        className="gap-1"
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(invite)}
                        disabled={busy}
                        className="gap-1"
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Accept
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
