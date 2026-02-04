"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, Loader2, Mail, MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: AnalyticsTab =
    tabParam === "email" ? "email" : "whatsapp";

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
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Select a project to view analytics.</p>
      </div>
    );
  }

  const o = whatsappOverview ?? {
    total_contacts: 0,
    total_campaigns: 0,
    campaigns_completed: 0,
    messages_sent: 0,
    messages_delivered: 0,
    messages_failed: 0,
    delivery_rate: 0,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        View per-channel analytics for this project.
      </p>

      <div className="flex gap-2 border border-gray-200 dark:border-gray-800 rounded-md p-1">
        <a
          href="/dashboard/analytics?tab=whatsapp"
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${
            tab === "whatsapp"
              ? "bg-gray-200 dark:bg-gray-800 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href="/dashboard/analytics?tab=email"
          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md ${
            tab === "email"
              ? "bg-gray-200 dark:bg-gray-800 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="h-4 w-4" />
          Email
        </a>
      </div>

      {tab === "whatsapp" ? (
        loading ? (
          <LoadingState message="Loading analytics…" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{o.total_contacts}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {o.campaigns_completed} / {o.total_campaigns} completed
                </p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Messages sent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{o.messages_sent}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{o.messages_delivered}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{o.messages_failed}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 dark:border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivery rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{o.delivery_rate}%</p>
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 border-dashed p-12 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Email Analytics</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Email analytics will be available when email campaigns are implemented.
          </p>
        </div>
      )}
    </div>
  );
}
