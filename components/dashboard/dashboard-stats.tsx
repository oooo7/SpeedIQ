"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, MessageSquare, Percent, Users } from "lucide-react";
import { useProjectContext } from "@/lib/projects/project-context";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface WhatsAppOverview {
  total_contacts: number;
  total_campaigns: number;
  campaigns_completed: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  delivery_rate: number;
}

const defaultOverview: WhatsAppOverview = {
  total_contacts: 0,
  total_campaigns: 0,
  campaigns_completed: 0,
  messages_sent: 0,
  messages_delivered: 0,
  messages_failed: 0,
  delivery_rate: 0,
};

const statCards = [
  {
    key: "contacts",
    label: "Total contacts",
    sublabel: (o: WhatsAppOverview) => "In your audience",
    value: (o: WhatsAppOverview) => o.total_contacts,
    icon: Users,
  },
  {
    key: "campaigns",
    label: "Campaigns",
    sublabel: (o: WhatsAppOverview) => `${o.campaigns_completed} completed`,
    value: (o: WhatsAppOverview) => o.total_campaigns,
    icon: Megaphone,
  },
  {
    key: "messages",
    label: "Messages sent",
    sublabel: (o: WhatsAppOverview) =>
      o.messages_sent > 0
        ? `${o.messages_delivered} delivered${o.messages_failed > 0 ? ` · ${o.messages_failed} failed` : ""}`
        : "No messages yet",
    value: (o: WhatsAppOverview) => o.messages_sent,
    icon: MessageSquare,
  },
  {
    key: "delivery",
    label: "Delivery rate",
    sublabel: () => "Of sent messages",
    value: (o: WhatsAppOverview) => `${o.delivery_rate}%`,
    icon: Percent,
  },
];

export function DashboardStats() {
  const { activeProject } = useProjectContext();
  const [overview, setOverview] = useState<WhatsAppOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/analytics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setOverview(data.overview ?? null);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (!activeProject) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const o = overview ?? defaultOverview;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.key}
            className="bg-white dark:bg-gray-900"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-medium tabular-nums mt-2 text-foreground">
                    {stat.value(o)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.sublabel(o)}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
