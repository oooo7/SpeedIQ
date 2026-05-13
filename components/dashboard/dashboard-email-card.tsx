"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Mail } from "lucide-react";

import { LockedChannelCard } from "@/components/dashboard/locked-channel-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EMAIL_ENABLED } from "@/lib/features";
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
  const [loading, setLoading] = useState(EMAIL_ENABLED);

  useEffect(() => {
    if (!EMAIL_ENABLED) return;
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
  if (!EMAIL_ENABLED) return <LockedChannelCard variant="email" />;

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
    <Card className="h-full flex flex-col bg-[var(--bg-elev)] border border-[var(--line)] rounded-lg">
      <CardContent className="p-5 flex flex-col flex-1 gap-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-blue-600 text-white rounded-sm">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-base text-[var(--fg)]">Email</h3>
            <p className="text-sm text-[var(--fg-3)] mt-0.5">
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
            <div className="space-y-3 text-sm bg-[var(--bg-sunken)] p-4 rounded-sm">
              <div>
                <p className="text-xs font-medium text-[var(--fg-3)] uppercase tracking-wide">
                  From address
                </p>
                <p className="font-mono mt-1 text-[var(--fg)] truncate">
                  {activeFrom ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--fg-3)] uppercase tracking-wide">
                  Domain
                </p>
                <p
                  className={`mt-1 font-medium ${
                    verified
                      ? "text-green-700 dark:text-green-400"
                      : pending
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-[var(--fg-3)]"
                  }`}
                >
                  {verified ? "Verified" : pending ? "Pending verification" : "Shared domain"}
                </p>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 border border-[var(--line-2)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                {verified ? "Connected" : "Ready (shared)"}
              </span>
              <Link
                href="/dashboard/settings/email"
                className="text-sm font-medium text-[var(--fg)] hover:underline"
              >
                Manage →
              </Link>
            </div>
          </>
        ) : (
          <>
            <ul className="text-sm text-[var(--fg-2)] space-y-2 flex-1 list-none">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                Send branded broadcasts from your domain
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                Track opens, clicks, and bounces
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                Manage subscribers and segments
              </li>
            </ul>
            <Link
              href="/dashboard/settings/email"
              className="mt-auto inline-flex items-center justify-center bg-[var(--fg)] hover:opacity-90 text-[var(--bg)] text-sm font-medium px-4 py-2 w-full sm:w-auto rounded-sm"
            >
              Set up email →
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
