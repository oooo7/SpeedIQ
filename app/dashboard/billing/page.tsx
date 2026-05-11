"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { useProjectContext } from "@/lib/projects/project-context";

type Currency = "inr" | "usd";
type Cycle = "monthly" | "yearly";

interface SubscriptionDTO {
  project_id: string;
  plan_id: string | null;
  status: string;
  billing_cycle: Cycle | null;
  currency: Currency | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
}

interface PlanDTO {
  id: string;
  name: string;
  monthly_credits: number;
  max_contacts: number | null;
  max_seats: number | null;
  max_campaigns_per_month: number | null;
  channels: Record<string, boolean>;
  features: Record<string, unknown>;
  price_inr_monthly: number | null;
  price_usd_monthly: number | null;
  price_inr_yearly: number | null;
  price_usd_yearly: number | null;
  sort_order?: number;
}

interface WalletDTO {
  balance: number;
  auto_recharge_enabled: boolean;
}

interface LedgerEntry {
  id: number;
  delta: number;
  reason: string;
  balance_after: number;
  created_at: string;
}

interface CreditPackDTO {
  id: string;
  credits: number;
  price_inr: number;
  price_usd: number;
}

interface BillingData {
  subscription: SubscriptionDTO | null;
  plan: PlanDTO | null;
  wallet: WalletDTO;
  ledger: LedgerEntry[];
  plans: PlanDTO[];
  campaigns_this_month: number;
  credit_packs: CreditPackDTO[];
  role: "owner" | "admin" | "editor" | "viewer";
}

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "warn" | "good" | "bad" }> = {
  trialing: { label: "Trial", tone: "good" },
  active: { label: "Active", tone: "good" },
  past_due: { label: "Past due", tone: "warn" },
  canceled: { label: "Canceled", tone: "bad" },
  inactive: { label: "Inactive", tone: "default" },
  incomplete: { label: "Incomplete", tone: "warn" },
  incomplete_expired: { label: "Expired", tone: "bad" },
  unpaid: { label: "Unpaid", tone: "bad" },
};

const REASON_LABEL: Record<string, string> = {
  plan_grant: "Plan credits",
  trial_grant: "Trial credits",
  top_up: "Top-up",
  auto_recharge: "Auto-recharge",
  manual_adjustment: "Manual adjustment",
  refund: "Refund",
  email_send: "Email sent",
  whatsapp_send: "WhatsApp sent",
  sms_send: "SMS sent",
  ai_generation: "AI generation",
};

function priceFor(plan: PlanDTO, cycle: Cycle, currency: Currency): number | null {
  if (currency === "inr") {
    return cycle === "monthly" ? plan.price_inr_monthly : plan.price_inr_yearly;
  }
  return cycle === "monthly" ? plan.price_usd_monthly : plan.price_usd_yearly;
}

function fmtMoney(amount: number | null, currency: Currency): string {
  if (amount == null) return "—";
  if (currency === "inr") return `₹${amount.toLocaleString("en-IN")}`;
  return `$${amount.toLocaleString("en-US")}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const { activeProject } = useProjectContext();
  const projectId = activeProject?.id ?? null;
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("inr");
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchBilling = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/billing`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as BillingData;
      setData(json);
      if (json.subscription?.currency) setCurrency(json.subscription.currency);
      if (json.subscription?.billing_cycle) setCycle(json.subscription.billing_cycle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleStartCheckout = useCallback(
    async (plan: string) => {
      if (!projectId) return;
      setCheckoutLoading(plan);
      try {
        const res = await fetch(`/api/projects/${projectId}/billing/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ plan, cycle, currency }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Checkout failed");
        const { url } = (await res.json()) as { url: string };
        window.location.href = url;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Checkout failed");
        setCheckoutLoading(null);
      }
    },
    [projectId, cycle, currency],
  );

  const handleOpenPortal = useCallback(async () => {
    if (!projectId) return;
    setPortalLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/billing/portal`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Portal failed");
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open portal");
      setPortalLoading(false);
    }
  }, [projectId]);

  const handleTopUp = useCallback(
    async (packId: string) => {
      if (!projectId) return;
      setCheckoutLoading(packId);
      try {
        const res = await fetch(`/api/projects/${projectId}/billing/topup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pack_id: packId, currency }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Top-up failed");
        const { url } = (await res.json()) as { url: string };
        window.location.href = url;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Top-up failed");
        setCheckoutLoading(null);
      }
    },
    [projectId, currency],
  );

  const includedCredits = data?.plan?.monthly_credits ?? 0;
  const balance = data?.wallet.balance ?? 0;
  const balancePct = useMemo(() => {
    if (!includedCredits) return 0;
    return Math.min(100, Math.round((balance / includedCredits) * 100));
  }, [balance, includedCredits]);

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Billing" description="Manage your subscription, credits, and invoices." />
        <LoadingState />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Billing" description="Select a project to view billing." />
      </div>
    );
  }

  if (data && data.role !== "owner" && data.role !== "admin") {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Billing" description="Only project owners and admins can manage billing." />
      </div>
    );
  }

  const hasSubscription = !!data?.subscription?.plan_id;
  const statusKey = data?.subscription?.status ?? "inactive";
  const statusInfo = STATUS_LABEL[statusKey] ?? STATUS_LABEL.inactive;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Billing"
        description="Manage your subscription, credits, and invoices."
      />

      {!hasSubscription && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-medium">Choose a plan</h2>
            <p className="text-sm text-muted-foreground">
              All plans include a 7-day Pro trial. Cancel anytime.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex rounded-md border bg-card p-0.5">
              <Button
                size="sm"
                variant={cycle === "monthly" ? "default" : "ghost"}
                onClick={() => setCycle("monthly")}
              >
                Monthly
              </Button>
              <Button
                size="sm"
                variant={cycle === "yearly" ? "default" : "ghost"}
                onClick={() => setCycle("yearly")}
              >
                Yearly · 20% off
              </Button>
            </div>
            <div className="inline-flex rounded-md border bg-card p-0.5">
              <Button
                size="sm"
                variant={currency === "inr" ? "default" : "ghost"}
                onClick={() => setCurrency("inr")}
              >
                INR ₹
              </Button>
              <Button
                size="sm"
                variant={currency === "usd" ? "default" : "ghost"}
                onClick={() => setCurrency("usd")}
              >
                USD $
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(data?.plans ?? [])
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((plan) => {
                const price = priceFor(plan, cycle, currency);
                const monthlyEquivalent =
                  cycle === "yearly" && price != null ? Math.round(price / 12) : null;
                const isLoading = checkoutLoading === plan.id;
                const isMid = plan.id === "pro";
                return (
                  <Card
                    key={plan.id}
                    className={`bg-white dark:bg-gray-900 ${isMid ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="flex flex-col gap-5 p-6">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
                          <p className="text-3xl font-semibold">
                            {fmtMoney(price, currency)}
                            <span className="text-sm font-normal text-muted-foreground">
                              /{cycle === "monthly" ? "mo" : "yr"}
                            </span>
                          </p>
                          {monthlyEquivalent != null && (
                            <p className="text-xs text-muted-foreground">
                              ≈ {fmtMoney(monthlyEquivalent, currency)}/mo
                            </p>
                          )}
                        </div>
                        {isMid && (
                          <Badge variant="default" className="gap-1">
                            <Sparkles className="h-3 w-3" /> Popular
                          </Badge>
                        )}
                      </div>

                      <ul className="flex flex-col gap-2 text-sm">
                        <Feature>{plan.monthly_credits.toLocaleString()} credits / month</Feature>
                        <Feature>
                          {plan.max_contacts ? plan.max_contacts.toLocaleString() : "Unlimited"} contacts
                        </Feature>
                        <Feature>{plan.max_seats ? `${plan.max_seats} team seats` : "Unlimited seats"}</Feature>
                        <Feature>
                          {plan.max_campaigns_per_month
                            ? `${plan.max_campaigns_per_month} campaigns / month`
                            : "Unlimited campaigns"}
                        </Feature>
                        <Feature>
                          {Object.entries(plan.channels)
                            .filter(([, v]) => v === true)
                            .map(([k]) => k)
                            .join(", ") || "—"}
                        </Feature>
                        {(plan.features?.api as boolean) && <Feature>API + webhooks</Feature>}
                        {(plan.features?.custom_branding as boolean) && <Feature>Custom branding</Feature>}
                        {(plan.features?.custom_roles as boolean) && <Feature>Custom roles + audit log</Feature>}
                      </ul>

                      <Button
                        size="sm"
                        className="mt-auto"
                        disabled={isLoading || !!checkoutLoading}
                        onClick={() => handleStartCheckout(plan.id)}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start 7-day trial`}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {hasSubscription && data && (
        <div className="flex flex-col gap-6">
          {/* Plan + status */}
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium capitalize">{data.plan?.name ?? data.subscription?.plan_id}</p>
                    <Badge
                      variant={statusInfo.tone === "good" ? "default" : "secondary"}
                      className={
                        statusInfo.tone === "warn"
                          ? "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15"
                          : statusInfo.tone === "bad"
                            ? "bg-red-500/15 text-red-600 hover:bg-red-500/15"
                            : ""
                      }
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {data.subscription?.status === "trialing"
                      ? `Trial ends ${fmtDate(data.subscription.trial_ends_at)}`
                      : `Renews ${fmtDate(data.subscription?.current_period_end ?? null)}`}
                    {data.subscription?.cancel_at_period_end && " · Cancels at period end"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenPortal} disabled={portalLoading}>
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Manage in Stripe
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Credits */}
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Credit balance</p>
                    <p className="text-2xl font-semibold">{balance.toLocaleString()} credits</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setTopUpOpen(true)}>
                  <Zap className="h-4 w-4" />
                  Top up
                </Button>
              </div>
              {includedCredits > 0 && (
                <>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${balancePct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Plan includes {includedCredits.toLocaleString()} credits / month
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Usage summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <UsageStat
              label="Campaigns this month"
              value={data.campaigns_this_month}
              max={data.plan?.max_campaigns_per_month ?? null}
            />
            <UsageStat
              label="Plan seats"
              value={null}
              max={data.plan?.max_seats ?? null}
              hint="Manage seats in Team settings"
            />
            <UsageStat
              label="Plan contacts cap"
              value={null}
              max={data.plan?.max_contacts ?? null}
              hint="Across email + SMS + WhatsApp"
            />
          </div>

          {/* Recent activity */}
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Recent credit activity</p>
                <p className="text-xs text-muted-foreground">Last 20 entries</p>
              </div>
              <Separator />
              {data.ledger.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="flex flex-col">
                  {data.ledger.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{REASON_LABEL[entry.reason] ?? entry.reason}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(entry.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${entry.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bal {entry.balance_after.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy credits</DialogTitle>
            <DialogDescription>One-time top-up. Credits never expire while your subscription is active.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 inline-flex w-fit rounded-md border bg-card p-0.5">
            <Button size="sm" variant={currency === "inr" ? "default" : "ghost"} onClick={() => setCurrency("inr")}>
              INR ₹
            </Button>
            <Button size="sm" variant={currency === "usd" ? "default" : "ghost"} onClick={() => setCurrency("usd")}>
              USD $
            </Button>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {(data?.credit_packs ?? []).map((pack) => {
              const price = currency === "inr" ? pack.price_inr : pack.price_usd;
              const isLoading = checkoutLoading === pack.id;
              return (
                <button
                  key={pack.id}
                  className="flex items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-60"
                  disabled={isLoading || !!checkoutLoading}
                  onClick={() => handleTopUp(pack.id)}
                >
                  <div>
                    <p className="font-medium">{pack.credits.toLocaleString()} credits</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtMoney(price, currency)} · ≈ {currency === "inr" ? "₹" : "$"}
                      {((price / pack.credits) * 100).toFixed(currency === "inr" ? 2 : 3)} per 100
                    </p>
                  </div>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Badge variant="outline">{fmtMoney(price, currency)}</Badge>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

function UsageStat({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number | null;
  max: number | null;
  hint?: string;
}) {
  const pct = value != null && max ? Math.min(100, Math.round((value / max) * 100)) : null;
  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">
          {value != null ? value.toLocaleString() : "—"}
          {max != null && (
            <span className="text-sm font-normal text-muted-foreground"> / {max.toLocaleString()}</span>
          )}
          {max == null && value != null && (
            <span className="text-sm font-normal text-muted-foreground"> / unlimited</span>
          )}
        </p>
        {pct != null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
