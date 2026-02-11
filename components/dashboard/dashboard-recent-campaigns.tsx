"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useProjectContext } from "@/lib/projects/project-context";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CampaignItem {
  id: string;
  name: string;
  status: string;
}

const RECENT_LIMIT = 5;

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

export function DashboardRecentCampaigns() {
  const { activeProject } = useProjectContext();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/campaigns`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const list = (data.campaigns ?? []) as CampaignItem[];
      setCampaigns(list.slice(0, RECENT_LIMIT));
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
            {campaigns.length === 0 && !loading ? "No campaigns yet" : "Latest WhatsApp campaigns"}
          </p>
        </div>
        <Link
          href="/dashboard/whatsapp/campaigns"
          className="text-sm font-medium text-primary hover:underline shrink-0"
        >
          View all
        </Link>
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
              Create your first campaign to reach your contacts.
            </p>
            <Link
              href="/dashboard/whatsapp/campaigns"
              className="inline-flex items-center justify-center bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              Create campaign
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {campaigns.map((c) => (
              <li key={c.id} className="first:pt-0 py-3 flex items-center justify-between gap-4">
                <Link
                  href={`/dashboard/whatsapp/campaigns/${c.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground group-hover:bg-gray-200 dark:group-hover:bg-gray-700/50">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary truncate">
                    {c.name || "Unnamed campaign"}
                  </span>
                </Link>
                <Badge variant={statusVariant(c.status)} className="shrink-0">
                  {c.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
