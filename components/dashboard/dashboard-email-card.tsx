"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Mail } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectContext } from "@/lib/projects/project-context";

interface EmailSettings {
  from_email: string;
  domain_verified: boolean;
  verification_status: "none" | "pending" | "verified";
  fallback_local_part: string;
  use_custom_from: boolean;
}

interface EmailSettingsResponse {
  fallback_domain: string;
  settings: EmailSettings | null;
}

export function DashboardEmailCard() {
  const { activeProject } = useProjectContext();
  const [data, setData] = useState<EmailSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${activeProject.id}/email/settings`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (!res.error) setData(res as EmailSettingsResponse);
        else setData(null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  if (!activeProject) return null;

  if (loading) {
    return (
      <Card className="h-full min-h-[200px] flex flex-col bg-blue-50 dark:bg-blue-950/40">
        <CardContent className="p-5 flex flex-col flex-1 gap-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full max-w-[200px]" />
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full max-w-[85%]" />
            <Skeleton className="h-3 w-full max-w-[70%]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const settings = data?.settings ?? null;
  const verified = settings?.verification_status === "verified";
  const pending = settings?.verification_status === "pending";
  const fallbackFrom =
    settings?.fallback_local_part && data?.fallback_domain
      ? `${settings.fallback_local_part}@${data.fallback_domain}`
      : null;
  const activeFrom =
    settings?.use_custom_from && verified
      ? settings?.from_email
      : fallbackFrom;
  const usingFallback = !verified && !!fallbackFrom;
  const connected = verified || usingFallback;

  return (
    <Card className="h-full flex flex-col bg-blue-50 dark:bg-blue-950/40">
      <CardContent className="p-5 flex flex-col flex-1 gap-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-blue-600 text-white">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-base text-foreground">Email</h3>
            <p className="text-sm text-blue-800/80 dark:text-blue-200/80 mt-0.5">
              {connected
                ? verified
                  ? "Custom domain verified, ready to send"
                  : "Sending from shared domain"
                : "Connect a domain to send branded emails"}
            </p>
          </div>
        </div>

        {connected ? (
          <>
            <div className="space-y-3 text-sm bg-white/60 dark:bg-black/20 p-4">
              <div>
                <p className="text-xs font-medium text-blue-800/70 dark:text-blue-200/70 uppercase tracking-wide">
                  From address
                </p>
                <p className="font-mono mt-1 text-foreground truncate">
                  {activeFrom ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-800/70 dark:text-blue-200/70 uppercase tracking-wide">
                  Domain
                </p>
                <p
                  className={`mt-1 font-medium ${
                    verified
                      ? "text-green-700 dark:text-green-400"
                      : pending
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {verified ? "Verified" : pending ? "Pending verification" : "Shared domain"}
                </p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-blue-600/20 dark:bg-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-800 dark:text-blue-100">
                <Check className="h-3.5 w-3.5" />
                {verified ? "Connected" : "Ready (shared)"}
              </span>
              <Link
                href="/dashboard/settings/email"
                className="text-sm font-medium text-blue-800 dark:text-blue-100 hover:underline"
              >
                Manage →
              </Link>
            </div>
          </>
        ) : (
          <>
            <ul className="text-sm text-blue-800/90 dark:text-blue-200/90 space-y-2 flex-1 list-none">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-blue-600 shrink-0" />
                Send branded broadcasts from your domain
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-blue-600 shrink-0" />
                Track opens, clicks, and bounces
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-blue-600 shrink-0" />
                Manage subscribers and segments
              </li>
            </ul>
            <Link
              href="/dashboard/settings/email"
              className="mt-auto inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 w-full sm:w-auto"
            >
              Set up email →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
