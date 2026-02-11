"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppConnectButton } from "@/components/whatsapp/whatsapp-connect-button";
import { useProjectContext } from "@/lib/projects/project-context";

interface WhatsAppOAuthConfig {
  appId: string;
  configId: string;
  solutionId?: string | null;
  callbackUrl?: string | null;
}

interface WhatsAppAccountData {
  id?: string;
  project_id: string;
  phone_number?: string | null;
  display_name?: string | null;
  quality_rating?: string | null;
  connected: boolean;
}

function formatDisplayPhone(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return raw;
  if (digits.length <= 6) return `+${digits.slice(0, digits.length - 3)} ${digits.slice(-3)}`;
  if (digits.length <= 10)
    return `+${digits.slice(0, digits.length - 7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`;
  return `+${digits.slice(0, -10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`;
}

function qualityLabel(rating: string | null | undefined): string {
  if (!rating) return "—";
  const labels: Record<string, string> = {
    GREEN: "Good",
    YELLOW: "Medium",
    RED: "Low",
    UNKNOWN: "Unknown",
    NA: "N/A",
  };
  return labels[rating] ?? rating;
}

export function DashboardWhatsAppCard() {
  const { activeProject } = useProjectContext();
  const [account, setAccount] = useState<WhatsAppAccountData | null>(null);
  const [oauthConfig, setOauthConfig] = useState<WhatsAppOAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccount = () => {
    if (!activeProject?.id) return;
    fetch(`/api/projects/${activeProject.id}/whatsapp/account`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && data.account) setAccount(data.account as WhatsAppAccountData);
        else setAccount(null);
      })
      .catch(() => setAccount(null));
  };

  useEffect(() => {
    if (!activeProject?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch(`/api/projects/${activeProject.id}/whatsapp/account`).then((r) => r.json()),
      fetch("/api/whatsapp/config").then((r) => r.json()),
    ]).then(([accountRes, configRes]) => {
      if (cancelled) return;
      if (!accountRes.error && accountRes.account) setAccount(accountRes.account as WhatsAppAccountData);
      else setAccount(null);
      if (!configRes.error) setOauthConfig(configRes);
      else setOauthConfig(null);
    }).catch(() => {
      if (!cancelled) setAccount(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeProject?.id]);

  if (!activeProject) return null;

  if (loading) {
    return (
      <Card className="h-full min-h-[200px] flex flex-col bg-green-50 dark:bg-green-950/40">
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

  return (
    <Card className="h-full flex flex-col bg-green-50 dark:bg-green-950/40">
      <CardContent className="p-5 flex flex-col flex-1 gap-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#25D366] text-white">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-base text-foreground">WhatsApp Account</h3>
            <p className="text-sm text-green-800/80 dark:text-green-200/80 mt-0.5">
              {account?.connected
                ? "Connected for campaigns and live chat"
                : "Connect to send campaigns and messages"}
            </p>
          </div>
        </div>

        {account?.connected ? (
          <>
            <div className="space-y-3 text-sm bg-white/60 dark:bg-black/20 p-4">
              <div>
                <p className="text-xs font-medium text-green-800/70 dark:text-green-200/70 uppercase tracking-wide">Phone</p>
                <p className="font-mono tabular-nums mt-1 text-foreground">
                  {formatDisplayPhone(account.phone_number)}
                </p>
              </div>
              {account.display_name?.trim() && (
                <div>
                  <p className="text-xs font-medium text-green-800/70 dark:text-green-200/70 uppercase tracking-wide">Display name</p>
                  <p className="mt-1 text-foreground">{account.display_name}</p>
                </div>
              )}
              {account.quality_rating && account.quality_rating !== "UNKNOWN" && account.quality_rating !== "NA" && (
                <div>
                  <p className="text-xs font-medium text-green-800/70 dark:text-green-200/70 uppercase tracking-wide">Quality</p>
                  <p
                    className={`mt-1 font-medium ${
                      account.quality_rating === "GREEN"
                        ? "text-green-700 dark:text-green-400"
                        : account.quality_rating === "YELLOW"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {qualityLabel(account.quality_rating)}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-[#25D366]/20 dark:bg-[#25D366]/30 px-3 py-1.5 text-xs font-medium text-green-800 dark:text-green-100">
                <Check className="h-3.5 w-3.5" />
                Connected
              </span>
              <Link
                href="/dashboard/settings/whatsapp-account"
                className="text-sm font-medium text-green-800 dark:text-green-100 hover:underline"
              >
                Manage →
              </Link>
            </div>
          </>
        ) : (
          <>
            <ul className="text-sm text-green-800/90 dark:text-green-200/90 space-y-2 flex-1 list-none">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-[#25D366] shrink-0" />
                Send broadcast campaigns to your contacts
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-[#25D366] shrink-0" />
                Live chat and reply from the inbox
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-[#25D366] shrink-0" />
                Use approved templates for notifications
              </li>
            </ul>
            {oauthConfig?.appId && oauthConfig?.configId ? (
              <div className="space-y-3 mt-auto">
                <WhatsAppConnectButton
                  projectId={activeProject.id}
                  appId={oauthConfig.appId}
                  configId={oauthConfig.configId}
                  solutionId={oauthConfig.solutionId}
                  callbackUrl={oauthConfig.callbackUrl}
                  onSuccess={() => {
                    toast.success("WhatsApp connected");
                    refreshAccount();
                  }}
                  hideHttpsWarning
                />
                <Link
                  href="/dashboard/settings/whatsapp-account"
                  className="block text-xs text-green-800/80 dark:text-green-200/80 hover:text-foreground underline"
                >
                  Advanced / manual setup
                </Link>
              </div>
            ) : (
              <Link
                href="/dashboard/settings/whatsapp-account"
                className="mt-auto inline-flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-medium px-4 py-2 w-full sm:w-auto"
              >
                Set up in Settings →
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
