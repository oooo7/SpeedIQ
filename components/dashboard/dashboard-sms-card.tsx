"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Smartphone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectContext } from "@/lib/projects/project-context";

interface SmsAccount {
  id: string;
  project_id: string;
  twilio_account_sid: string | null;
  messaging_service_sid: string | null;
  default_from: string | null;
  onboarding_state: string | null;
}

export function DashboardSmsCard() {
  const { activeProject } = useProjectContext();
  const [account, setAccount] = useState<SmsAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!activeProject?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${activeProject.id}/sms/account`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 403) {
          setForbidden(true);
          setAccount(null);
          return;
        }
        const data = await r.json();
        if (!data.error) setAccount((data.account as SmsAccount) ?? null);
        else setAccount(null);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
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
      <Card className="h-full min-h-[200px] flex flex-col bg-purple-50 dark:bg-purple-950/40">
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

  const connected = !!account && account.onboarding_state === "connected";

  return (
    <Card className="h-full flex flex-col bg-purple-50 dark:bg-purple-950/40">
      <CardContent className="p-5 flex flex-col flex-1 gap-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-purple-600 text-white">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-base text-foreground">SMS</h3>
            <p className="text-sm text-purple-800/80 dark:text-purple-200/80 mt-0.5">
              {forbidden
                ? "Available on Pro and Business plans"
                : connected
                  ? "Twilio connected for campaigns and replies"
                  : "Connect Twilio to send SMS campaigns"}
            </p>
          </div>
        </div>

        {connected ? (
          <>
            <div className="space-y-3 text-sm bg-white/60 dark:bg-black/20 p-4">
              {account?.default_from && (
                <div>
                  <p className="text-xs font-medium text-purple-800/70 dark:text-purple-200/70 uppercase tracking-wide">
                    Sender
                  </p>
                  <p className="font-mono mt-1 text-foreground truncate">{account.default_from}</p>
                </div>
              )}
              {account?.messaging_service_sid && (
                <div>
                  <p className="text-xs font-medium text-purple-800/70 dark:text-purple-200/70 uppercase tracking-wide">
                    Messaging service
                  </p>
                  <p className="font-mono mt-1 text-foreground truncate text-xs">
                    {account.messaging_service_sid}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-purple-600/20 dark:bg-purple-500/30 px-3 py-1.5 text-xs font-medium text-purple-800 dark:text-purple-100">
                <Check className="h-3.5 w-3.5" />
                Connected
              </span>
              <Link
                href="/dashboard/settings/sms"
                className="text-sm font-medium text-purple-800 dark:text-purple-100 hover:underline"
              >
                Manage →
              </Link>
            </div>
          </>
        ) : (
          <>
            <ul className="text-sm text-purple-800/90 dark:text-purple-200/90 space-y-2 flex-1 list-none">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-purple-600 shrink-0" />
                Send DLT-compliant SMS in India
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-purple-600 shrink-0" />
                Two-way conversations in the live inbox
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-purple-600 shrink-0" />
                Auto opt-in / STOP / HELP handling
              </li>
            </ul>
            <Link
              href="/dashboard/settings/sms"
              className={`mt-auto inline-flex items-center justify-center text-white text-sm font-medium px-4 py-2 w-full sm:w-auto ${
                forbidden
                  ? "bg-purple-400 hover:bg-purple-500 pointer-events-none opacity-70"
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {forbidden ? "Upgrade to enable" : "Set up SMS →"}
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
