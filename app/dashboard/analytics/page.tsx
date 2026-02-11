"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Mail,
  MessageSquare,
  Percent,
  Megaphone,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { useProjectContext } from "@/lib/projects/project-context";

type AnalyticsTab = "whatsapp" | "email";

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
    sublabel: (o: WhatsAppOverview) => "In audience",
    value: (o: WhatsAppOverview) => o.total_contacts,
    icon: Users,
  },
  {
    key: "campaigns",
    label: "Campaigns",
    sublabel: (o: WhatsAppOverview) => `${o.campaigns_completed} / ${o.total_campaigns} completed`,
    value: (o: WhatsAppOverview) => o.total_campaigns,
    icon: Megaphone,
  },
  {
    key: "sent",
    label: "Messages sent",
    sublabel: (o: WhatsAppOverview) => `${o.messages_delivered} delivered`,
    value: (o: WhatsAppOverview) => o.messages_sent,
    icon: MessageSquare,
  },
  {
    key: "delivered",
    label: "Delivered",
    sublabel: (o: WhatsAppOverview) => "Successfully delivered",
    value: (o: WhatsAppOverview) => o.messages_delivered,
    icon: MessageSquare,
  },
  {
    key: "failed",
    label: "Failed",
    sublabel: (o: WhatsAppOverview) => "Delivery failed",
    value: (o: WhatsAppOverview) => o.messages_failed,
    icon: MessageSquare,
  },
  {
    key: "rate",
    label: "Delivery rate",
    sublabel: () => "Of sent messages",
    value: (o: WhatsAppOverview) => `${o.delivery_rate}%`,
    icon: Percent,
  },
];

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: AnalyticsTab = tabParam === "email" ? "email" : "whatsapp";

  const { activeProject } = useProjectContext();
  const [whatsappOverview, setWhatsappOverview] = useState<WhatsAppOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWhatsAppOverview = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/analytics`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setWhatsappOverview(data.overview ?? null);
    } catch {
      setWhatsappOverview(null);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    if (tab === "whatsapp") fetchWhatsAppOverview();
    else setLoading(false);
  }, [tab, fetchWhatsAppOverview]);

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader
          title="Analytics"
          description="Select a project to view analytics."
        />
      </div>
    );
  }

  const o = whatsappOverview ?? defaultOverview;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Analytics"
        description="View per-channel analytics for this project."
      />

      <div className="flex gap-1 bg-gray-50 dark:bg-gray-800/30 p-1 w-fit">
        <Link
          href="/dashboard/analytics?tab=whatsapp"
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "whatsapp"
              ? "bg-white dark:bg-gray-800 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          WhatsApp
        </Link>
        <Link
          href="/dashboard/analytics?tab=email"
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "email"
              ? "bg-white dark:bg-gray-800 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          Email
        </Link>
      </div>

      {tab === "whatsapp" ? (
        loading ? (
          <LoadingState message="Loading analytics…" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        )
      ) : (
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-10 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground mb-4">
              <BarChart3 className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">Email analytics coming soon</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Email analytics will be available when email campaigns are implemented.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
