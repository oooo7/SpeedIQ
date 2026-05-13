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

interface EmailOverview {
  total_subscribers: number;
  total_campaigns: number;
  campaigns_completed: number;
  emails_sent: number;
  emails_delivered: number;
  emails_failed: number;
  delivery_rate: number;
}

interface SmsTotals {
  contacts: number;
  campaigns: number;
  outbound_messages: number;
  delivered_messages: number;
  failed_messages: number;
  delivery_rate: number;
}

interface Aggregated {
  total_contacts: number;
  total_campaigns: number;
  campaigns_completed: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  delivery_rate: number;
  breakdown: {
    whatsapp: { contacts: number; messages: number };
    email: { contacts: number; messages: number };
    sms: { contacts: number; messages: number };
  };
}

const defaultAggregated: Aggregated = {
  total_contacts: 0,
  total_campaigns: 0,
  campaigns_completed: 0,
  messages_sent: 0,
  messages_delivered: 0,
  messages_failed: 0,
  delivery_rate: 0,
  breakdown: {
    whatsapp: { contacts: 0, messages: 0 },
    email: { contacts: 0, messages: 0 },
    sms: { contacts: 0, messages: 0 },
  },
};

const statCards = [
  {
    key: "contacts",
    label: "Total contacts",
    sublabel: (o: Aggregated) =>
      `WA ${o.breakdown.whatsapp.contacts} · Email ${o.breakdown.email.contacts} · SMS ${o.breakdown.sms.contacts}`,
    value: (o: Aggregated) => o.total_contacts.toLocaleString(),
    icon: Users,
  },
  {
    key: "campaigns",
    label: "Campaigns",
    sublabel: (o: Aggregated) => `${o.campaigns_completed} completed`,
    value: (o: Aggregated) => o.total_campaigns.toLocaleString(),
    icon: Megaphone,
  },
  {
    key: "messages",
    label: "Messages sent",
    sublabel: (o: Aggregated) =>
      o.messages_sent > 0
        ? `${o.messages_delivered.toLocaleString()} delivered${o.messages_failed > 0 ? ` · ${o.messages_failed.toLocaleString()} failed` : ""}`
        : "No messages yet",
    value: (o: Aggregated) => o.messages_sent.toLocaleString(),
    icon: MessageSquare,
  },
  {
    key: "delivery",
    label: "Delivery rate",
    sublabel: () => "Across all channels",
    value: (o: Aggregated) => `${o.delivery_rate}%`,
    icon: Percent,
  },
];

async function fetchJsonSafe<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function DashboardStats() {
  const { activeProject } = useProjectContext();
  const [overview, setOverview] = useState<Aggregated | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const [waRes, emailRes, smsRes] = await Promise.all([
        fetchJsonSafe<{ overview: WhatsAppOverview }>(
          `/api/projects/${activeProject.id}/whatsapp/analytics`
        ),
        fetchJsonSafe<{ overview: EmailOverview }>(
          `/api/projects/${activeProject.id}/email/analytics`
        ),
        fetchJsonSafe<{ totals: SmsTotals }>(
          `/api/projects/${activeProject.id}/sms/analytics`
        ),
      ]);

      const wa = waRes?.overview;
      const em = emailRes?.overview;
      const sm = smsRes?.totals;

      const waSent = wa?.messages_sent ?? 0;
      const emSent = em?.emails_sent ?? 0;
      const smSent = sm?.outbound_messages ?? 0;
      const totalSent = waSent + emSent + smSent;

      const waDelivered = wa?.messages_delivered ?? 0;
      const emDelivered = em?.emails_delivered ?? 0;
      const smDelivered = sm?.delivered_messages ?? 0;
      const totalDelivered = waDelivered + emDelivered + smDelivered;

      const totalFailed =
        (wa?.messages_failed ?? 0) + (em?.emails_failed ?? 0) + (sm?.failed_messages ?? 0);

      const waContacts = wa?.total_contacts ?? 0;
      const emContacts = em?.total_subscribers ?? 0;
      const smContacts = sm?.contacts ?? 0;

      setOverview({
        total_contacts: waContacts + emContacts + smContacts,
        total_campaigns:
          (wa?.total_campaigns ?? 0) + (em?.total_campaigns ?? 0) + (sm?.campaigns ?? 0),
        campaigns_completed:
          (wa?.campaigns_completed ?? 0) + (em?.campaigns_completed ?? 0),
        messages_sent: totalSent,
        messages_delivered: totalDelivered,
        messages_failed: totalFailed,
        delivery_rate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
        breakdown: {
          whatsapp: { contacts: waContacts, messages: waSent },
          email: { contacts: emContacts, messages: emSent },
          sms: { contacts: smContacts, messages: smSent },
        },
      });
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
          <Card key={i} className="bg-[var(--bg-elev)] border border-[var(--line)] rounded-lg">
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

  const o = overview ?? defaultAggregated;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.key}
            className="bg-[var(--bg-elev)] border border-[var(--line)] rounded-lg"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--fg-3)] uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-medium tabular-nums mt-2 text-[var(--fg)] tracking-tight">
                    {stat.value(o)}
                  </p>
                  <p className="text-xs text-[var(--fg-3)] mt-1 truncate">
                    {stat.sublabel(o)}
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center bg-[var(--bg-sunken)] text-[var(--fg-3)] rounded-sm">
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
