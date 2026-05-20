"use client";

import { useEffect, useState } from "react";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  CreditCard,
  Globe,
  Info,
  Loader2,
  Package,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OverviewResponse {
  overview: {
    subscriptions: { trialing: number; active: number; past_due: number; canceled: number; total: number };
    wallets: { total_credits_outstanding: number; wallets_with_balance: number };
    ledger_30d: {
      plan_grants: number;
      top_ups: number;
      trial_grants: number;
      refunds: number;
      adjustments: number;
      credits_granted: number;
      credits_consumed: number;
    };
    usage_30d: Record<string, { events: number; credits: number }>;
  } | null;
  plans: Array<{
    id: string;
    name: string;
    monthly_credits: number;
    price_inr_monthly: number | null;
    price_usd_monthly: number | null;
    price_inr_yearly: number | null;
    price_usd_yearly: number | null;
    active: boolean;
  }>;
  credit_packs: Array<{
    id: string;
    name: string;
    credits: number;
    price_inr: number | null;
    price_usd: number | null;
    active: boolean;
  }>;
  credit_weights: Array<{
    id: number;
    channel: string;
    message_type: string;
    credits: number;
    description: string | null;
  }>;
  platform_settings: Record<string, unknown>;
  recent_ledger: Array<{
    id: number;
    project_id: string;
    delta: number;
    reason: string;
    balance_after: number;
    created_at: string;
  }>;
}

const REASON_LABEL: Record<string, string> = {
  plan_grant: "Plan grant",
  trial_grant: "Trial grant",
  top_up: "Top-up",
  auto_recharge: "Auto-recharge",
  manual_adjustment: "Manual adj.",
  refund: "Refund",
  email_send: "Email",
  whatsapp_send: "WhatsApp",
  sms_send: "SMS",
  ai_generation: "AI",
};

function fmtNum(n: number | undefined | null): string {
  return (n ?? 0).toLocaleString();
}

function fmtInr(n: number | null | undefined): string {
  return n == null ? "—" : `₹${n.toLocaleString("en-IN")}`;
}

function fmtUsd(n: number | null | undefined): string {
  return n == null ? "—" : `$${n.toLocaleString("en-US")}`;
}

function settingStr(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/overview", { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        setData((await res.json()) as OverviewResponse);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }

  const o = data.overview;
  const settings = data.platform_settings;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live billing health for the whole platform.
        </p>
      </header>

      {/* How billing works info card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">How this billing system works</p>
              <p className="mt-1 text-muted-foreground">
                Every project has a <strong>credit wallet</strong>. Subscriptions grant credits monthly
                (<em>plan_grant</em>) and trials grant a one-time bonus (<em>trial_grant</em>). Users buy
                more anytime via <strong>credit packs</strong> (<em>top_up</em>). Each send (email/WhatsApp/SMS/AI)
                deducts credits per the <strong>credit weights</strong> table below.
              </p>
              <p className="mt-2 text-muted-foreground">
                Provider routing: <strong>INR → {settingStr(settings.preferred_provider_inr)}</strong>,{" "}
                <strong>USD → {settingStr(settings.preferred_provider_usd)}</strong>. Change this in{" "}
                <a href="/admin/settings" className="underline">Settings</a>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Active subscriptions"
          value={fmtNum(o?.subscriptions.active)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          hint={`${fmtNum(o?.subscriptions.trialing)} trialing · ${fmtNum(o?.subscriptions.past_due)} past due`}
        />
        <Stat
          label="Credits outstanding"
          value={fmtNum(o?.wallets.total_credits_outstanding)}
          icon={<Wallet className="h-4 w-4" />}
          hint={`across ${fmtNum(o?.wallets.wallets_with_balance)} wallets`}
        />
        <Stat
          label="30d credits granted"
          value={fmtNum(o?.ledger_30d.credits_granted)}
          icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />}
          hint={`${fmtNum(o?.ledger_30d.plan_grants)} plans · ${fmtNum(o?.ledger_30d.top_ups)} top-ups · ${fmtNum(o?.ledger_30d.refunds)} refunds`}
        />
        <Stat
          label="30d credits consumed"
          value={fmtNum(o?.ledger_30d.credits_consumed)}
          icon={<ArrowDownRight className="h-4 w-4 text-red-600" />}
          hint="across all channels"
        />
      </div>

      {/* 30d usage by channel */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Last 30 days · sends by channel</p>
            <Button size="sm" variant="ghost" asChild>
              <a href="/admin/transactions">View ledger</a>
            </Button>
          </div>
          <Separator />
          {Object.keys(o?.usage_30d ?? {}).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No sends in the last 30 days.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["email", "whatsapp", "sms", "ai"] as const).map((ch) => {
                const row = o?.usage_30d?.[ch];
                return (
                  <div key={ch} className="rounded-md border bg-card p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{ch}</p>
                    <p className="mt-1 text-lg font-semibold">{fmtNum(row?.events)}</p>
                    <p className="text-xs text-muted-foreground">{fmtNum(row?.credits)} credits</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans + costs */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Plans</p>
              <p className="text-xs text-muted-foreground">What users see at checkout. Edit in Plans.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href="/admin/plans">Edit plans</a>
            </Button>
          </div>
          <Separator />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-normal">Plan</th>
                  <th className="py-2 pr-3 font-normal">Credits / mo</th>
                  <th className="py-2 pr-3 font-normal">INR monthly</th>
                  <th className="py-2 pr-3 font-normal">INR yearly</th>
                  <th className="py-2 pr-3 font-normal">USD monthly</th>
                  <th className="py-2 pr-3 font-normal">USD yearly</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.plans.map((p) => (
                  <tr key={p.id} className="border-t border-muted/60">
                    <td className="py-2 pr-3 font-medium">{p.name}</td>
                    <td className="py-2 pr-3">{fmtNum(p.monthly_credits)}</td>
                    <td className="py-2 pr-3">{fmtInr(p.price_inr_monthly)}</td>
                    <td className="py-2 pr-3">{fmtInr(p.price_inr_yearly)}</td>
                    <td className="py-2 pr-3">{fmtUsd(p.price_usd_monthly)}</td>
                    <td className="py-2 pr-3">{fmtUsd(p.price_usd_yearly)}</td>
                    <td className="py-2 pr-3">
                      {p.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Credit packs */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Credit packs (top-ups)</p>
              <p className="text-xs text-muted-foreground">One-time purchases users can make to add credits.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href="/admin/credit-packs">Edit packs</a>
            </Button>
          </div>
          <Separator />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-normal">Pack</th>
                  <th className="py-2 pr-3 font-normal">Credits</th>
                  <th className="py-2 pr-3 font-normal">INR price</th>
                  <th className="py-2 pr-3 font-normal">Per 1k (INR)</th>
                  <th className="py-2 pr-3 font-normal">USD price</th>
                  <th className="py-2 pr-3 font-normal">Per 1k (USD)</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.credit_packs.map((p) => (
                  <tr key={p.id} className="border-t border-muted/60">
                    <td className="py-2 pr-3 font-medium">{p.name}</td>
                    <td className="py-2 pr-3">{fmtNum(p.credits)}</td>
                    <td className="py-2 pr-3">{fmtInr(p.price_inr)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {p.price_inr != null ? `₹${((p.price_inr / p.credits) * 1000).toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2 pr-3">{fmtUsd(p.price_usd)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {p.price_usd != null ? `$${((p.price_usd / p.credits) * 1000).toFixed(3)}` : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {p.active ? <Badge variant="default">Active</Badge> : <Badge variant="outline">Off</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Credit weights (cost per send) */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Credit weights (cost per send)</p>
              <p className="text-xs text-muted-foreground">How many credits each send deducts from a project&apos;s wallet.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href="/admin/credit-weights">Edit weights</a>
            </Button>
          </div>
          <Separator />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {data.credit_weights.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-md border bg-card p-3 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">
                    {w.channel} · {w.message_type.replace(/_/g, " ")}
                  </p>
                  {w.description && (
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium">{w.credits}</span>
                  <span className="text-xs text-muted-foreground">cr</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform settings snapshot */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Platform settings</p>
              <p className="text-xs text-muted-foreground">Defaults applied across all projects.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <a href="/admin/settings">Edit settings</a>
            </Button>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KV k="Trial days" v={settingStr(settings.trial_days)} icon={<CircleDashed className="h-3.5 w-3.5" />} />
            <KV k="Trial credits" v={settingStr(settings.trial_credits)} icon={<Wallet className="h-3.5 w-3.5" />} />
            <KV k="Annual discount" v={`${settingStr(settings.annual_discount_pct)}%`} icon={<Package className="h-3.5 w-3.5" />} />
            <KV k="Default currency" v={String(settingStr(settings.default_currency)).toUpperCase()} icon={<Globe className="h-3.5 w-3.5" />} />
            <KV k="Provider · INR" v={settingStr(settings.preferred_provider_inr)} icon={<CreditCard className="h-3.5 w-3.5" />} />
            <KV k="Provider · USD" v={settingStr(settings.preferred_provider_usd)} icon={<CreditCard className="h-3.5 w-3.5" />} />
            <KV k="Refund policy" v={settingStr(settings.refund_policy)} icon={<Info className="h-3.5 w-3.5" />} />
            <KV k="GST (display)" v={`${settingStr(settings.gst_pct)}%`} icon={<Info className="h-3.5 w-3.5" />} />
            <KV k="Billing kill-switch" v={settingStr(settings.feature_billing_enabled)} icon={<Info className="h-3.5 w-3.5" />} />
          </div>
        </CardContent>
      </Card>

      {/* Recent ledger */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Recent credit activity</p>
            <Button size="sm" variant="ghost" asChild>
              <a href="/admin/transactions">All transactions</a>
            </Button>
          </div>
          <Separator />
          {data.recent_ledger.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="flex flex-col">
              {data.recent_ledger.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-muted/60 py-2 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{REASON_LABEL[r.reason] ?? r.reason}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.project_id.slice(0, 8)}…</p>
                  </div>
                  <div className="text-right">
                    <p className={r.delta >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                      {r.delta >= 0 ? `+${r.delta}` : r.delta}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          {icon} {label}
        </div>
        <p className="text-2xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function KV({ k, v, icon }: { k: string; v: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {k}
      </div>
      <p className="mt-1 text-sm font-medium capitalize">{v}</p>
    </div>
  );
}
