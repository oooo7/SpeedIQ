"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app-config";
import { useAuth } from "@/lib/auth/use-auth";

interface InviteInfo {
  project_name: string;
  inviter_name: string;
  email: string;
  role: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Invite not found");
        }
        const data = await res.json();
        setInvite(data);
      } catch (err) {
        toast.error("Invalid invite", {
          description: err instanceof Error ? err.message : "This invite may have expired.",
        });
        router.push("/projects");
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token, router]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/invite/${token}`);
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to accept");
      }

      toast.success("You joined the project", {
        description: `"${invite?.project_name}" is now active.`,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error("Could not accept invite", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    router.push("/projects");
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
            You&apos;re invited
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {invite.inviter_name} invited you to join <strong>{invite.project_name}</strong> as{" "}
            <strong>{invite.role}</strong>.
          </p>
        </div>

        {!user ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Sign in or create an account to accept this invite.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={handleAccept} className="w-full">
                Sign in to accept
              </Button>
              <Button variant="outline" onClick={handleDecline} className="w-full">
                Decline
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button onClick={handleAccept} disabled={accepting} className="w-full gap-2">
              {accepting ? <Loader2 className="size-4 animate-spin" /> : null}
              Accept invite
            </Button>
            <Button variant="outline" onClick={handleDecline} disabled={accepting} className="w-full">
              Decline
            </Button>
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
        {APP_CONFIG.name}
      </p>
    </div>
  );
}
