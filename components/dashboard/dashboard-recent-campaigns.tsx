"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Megaphone, MessageSquare, Smartphone } from "lucide-react";
import { useProjectContext } from "@/lib/projects/project-context";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Channel = "whatsapp" | "email" | "sms";

interface CampaignItem {
  id: string;
  name: string;
  status: string;
  channel: Channel;
  created_at: string;
}

const RECENT_LIMIT = 6;

const channelMeta: Record<Channel, { label: string; icon: typeof Mail; href: (id: string) => string; listHref: string; iconBg: string; iconText: string }> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageSquare,
    href: (id) => `/dashboard/whatsapp/campaigns/${id}`,
    listHref: "/dashboard/whatsapp/campaigns",
    iconBg: "bg-[#25D366]/15 dark:bg-[#25D366]/25",
    iconText: "text-[#128C7E] dark:text-[#25D366]",
  },
  email: {
    label: "Email",
    icon: Mail,
    href: (id) => `/dashboard/email/campaigns/${id}`,
    listHref: "/dashboard/email/campaigns",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconText: "text-blue-700 dark:text-blue-300",
  },
  sms: {
    label: "SMS",
    icon: Smartphone,
    href: (id) => `/dashboard/sms/campaigns/${id}`,
    listHref: "/dashboard/sms/campaigns",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    iconText: "text-purple-700 dark:text-purple-300",
  },
};

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "completed":
      return "default";
    case "scheduled":
    case "sending":
      return "secondary";
    case "failed":
    case "draft":
      return "outline";
    default:
      return "secondary";
  }
}

interface RawCampaign {
  id: string;
  name?: string | null;
  status?: string | null;
  created_at?: string | null;
}

async function fetchChannel(
  projectId: string,
  channel: Channel
): Promise<CampaignItem[]> {
  try {
    const res = await fetch(`/api/projects/${projectId}/${channel}/campaigns`);
    if (!res.ok) return [];
    const data = await res.json();
    const list = (data.campaigns ?? []) as RawCampaign[];
    return list.map((c) => ({
      id: c.id,
      name: c.name ?? "Unnamed campaign",
      status: c.status ?? "draft",
      channel,
      created_at: c.created_at ?? "",
    }));
  } catch {
    return [];
  }
}

export function DashboardRecentCampaigns() {
  const { activeProject } = useProjectContext();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const [wa, em, sm] = await Promise.all([
        fetchChannel(activeProject.id, "whatsapp"),
        fetchChannel(activeProject.id, "email"),
        fetchChannel(activeProject.id, "sms"),
      ]);
      const merged = [...wa, ...em, ...sm].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
      setCampaigns(merged.slice(0, RECENT_LIMIT));
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  if (!activeProject) return null;

  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-5 px-6 pt-6 border-b border-gray-200 dark:border-gray-800 mb-5">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground">
              <Megaphone className="h-4 w-4" />
            </div>
            Recent campaigns
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {campaigns.length === 0 && !loading
              ? "No campaigns yet"
              : "Latest activity across WhatsApp, Email, and SMS"}
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {loading ? (
          <ul className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-9 w-9 shrink-0" />
                <Skeleton className="h-4 flex-1 max-w-[180px]" />
                <Skeleton className="h-5 w-16 shrink-0" />
              </li>
            ))}
          </ul>
        ) : campaigns.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Create your first campaign on any channel to see it here.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/dashboard/whatsapp/campaigns"
                className="inline-flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                WhatsApp
              </Link>
              <Link
                href="/dashboard/email/campaigns"
                className="inline-flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                Email
              </Link>
              <Link
                href="/dashboard/sms/campaigns"
                className="inline-flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                SMS
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {campaigns.map((c) => {
              const meta = channelMeta[c.channel];
              const Icon = meta.icon;
              return (
                <li
                  key={`${c.channel}-${c.id}`}
                  className="first:pt-0 py-3 flex items-center justify-between gap-4"
                >
                  <Link
                    href={meta.href(c.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 group"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center ${meta.iconBg} ${meta.iconText}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground group-hover:text-primary truncate">
                        {c.name || "Unnamed campaign"}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {meta.label}
                      </span>
                    </div>
                  </Link>
                  <Badge variant={statusVariant(c.status)} className="shrink-0">
                    {c.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
