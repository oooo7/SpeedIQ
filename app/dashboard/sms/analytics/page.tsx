"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectContext } from "@/lib/projects/project-context";

type Totals = {
  contacts: number;
  subscribed_contacts: number;
  opted_out_contacts: number;
  campaigns: number;
  outbound_messages: number;
  inbound_messages: number;
  delivered_messages: number;
  failed_messages: number;
  delivery_rate: number;
};

type Series = { date: string; outbound: number; inbound: number; delivered: number; failed: number };

type CampaignBreakdown = { id: string; name: string; sent: number; failed: number; pending: number };

type RecentCampaign = {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

type Analytics = {
  totals: Totals;
  campaign_status: Record<string, number>;
  recipient_status: Record<string, number>;
  timeseries: Series[];
  by_campaign: CampaignBreakdown[];
  recent_campaigns: RecentCampaign[];
};

const RANGES = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

export default function SmsAnalyticsPage() {
  const { activeProject } = useProjectContext();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!activeProject?.id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/sms/analytics?range=${range}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load analytics");
        setAnalytics(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeProject?.id, range]);

  if (!activeProject) return <p className="text-sm text-muted-foreground">Select a project first.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="SMS Analytics" description="Track campaign delivery and engagement." />
        <div className="flex gap-1 border bg-white p-1 dark:bg-gray-900">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded px-3 py-1 text-xs ${range === r.value ? "bg-blue-600 text-white" : "text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      ) : !analytics ? (
        <p className="text-sm text-muted-foreground">No analytics available.</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Contacts" value={analytics.totals.contacts} sub={`${analytics.totals.subscribed_contacts} subscribed`} />
            <Stat label="Outbound" value={analytics.totals.outbound_messages} sub={`${analytics.totals.inbound_messages} inbound`} />
            <Stat
              label="Delivery rate"
              value={`${analytics.totals.delivery_rate}%`}
              sub={`${analytics.totals.delivered_messages} delivered · ${analytics.totals.failed_messages} failed`}
            />
            <Stat label="Opted out" value={analytics.totals.opted_out_contacts} sub={`${analytics.totals.campaigns} campaigns`} />
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium">Message volume ({range})</div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <Legend swatch="bg-blue-600" label="Outbound" />
                  <Legend swatch="bg-green-500" label="Delivered" />
                  <Legend swatch="bg-red-500" label="Failed" />
                  <Legend swatch="bg-gray-400" label="Inbound" />
                </div>
              </div>
              <Sparkline series={analytics.timeseries} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 text-sm font-medium">Campaign status</div>
                <div className="space-y-2">
                  {Object.entries(analytics.campaign_status).map(([status, count]) => (
                    <Bar key={status} label={status} value={count} max={Math.max(...Object.values(analytics.campaign_status), 1)} />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 text-sm font-medium">Recipient status</div>
                <div className="space-y-2">
                  {Object.entries(analytics.recipient_status).map(([status, count]) => (
                    <Bar key={status} label={status} value={count} max={Math.max(...Object.values(analytics.recipient_status), 1)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="mb-3 text-sm font-medium">Top campaigns</div>
              {analytics.by_campaign.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaign activity yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="p-2 text-left font-medium">Name</th>
                      <th className="p-2 text-left font-medium">Sent / Delivered</th>
                      <th className="p-2 text-left font-medium">Failed</th>
                      <th className="p-2 text-left font-medium">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.by_campaign.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="p-2">
                          <Link className="hover:underline" href={`/dashboard/sms/campaigns/${c.id}`}>{c.name}</Link>
                        </td>
                        <td className="p-2">{c.sent}</td>
                        <td className="p-2">{c.failed}</td>
                        <td className="p-2">{c.pending}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="mb-3 text-sm font-medium">Recent campaigns</div>
              {analytics.recent_campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaigns yet.</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.recent_campaigns.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                      <Link className="text-sm font-medium hover:underline" href={`/dashboard/sms/campaigns/${c.id}`}>
                        {c.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{c.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="mt-1 h-2 w-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 ${swatch}`} />
      {label}
    </span>
  );
}

function Sparkline({ series }: { series: Series[] }) {
  if (series.length === 0) return <div className="text-sm text-muted-foreground">No data.</div>;
  const max = Math.max(1, ...series.map((s) => Math.max(s.outbound, s.inbound)));
  const width = 100;
  const height = 100;
  const step = width / Math.max(1, series.length - 1);

  function path(values: number[]) {
    return values
      .map((v, i) => {
        const x = i * step;
        const y = height - (v / max) * height;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }

  const outbound = path(series.map((s) => s.outbound));
  const delivered = path(series.map((s) => s.delivered));
  const failed = path(series.map((s) => s.failed));
  const inbound = path(series.map((s) => s.inbound));

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-40 w-full">
        <path d={inbound} fill="none" stroke="rgb(156 163 175)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={failed} fill="none" stroke="rgb(239 68 68)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={delivered} fill="none" stroke="rgb(34 197 94)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d={outbound} fill="none" stroke="rgb(37 99 235)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{series[0]?.date}</span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}
