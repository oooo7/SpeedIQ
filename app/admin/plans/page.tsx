"use client";

import { useCallback, useEffect, useState } from "react";

import { Info, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface Plan {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
  monthly_credits: number;
  max_contacts: number | null;
  max_seats: number | null;
  max_campaigns_per_month: number | null;
  channels: Record<string, boolean>;
  features: Record<string, unknown>;
  analytics_retention_days: number | null;
  price_inr_monthly: number | null;
  price_inr_yearly: number | null;
  price_usd_monthly: number | null;
  price_usd_yearly: number | null;
  provider_ids: Record<string, Record<string, string>>;
}

const CHANNEL_KEYS = ["email", "whatsapp", "sms", "ai_assist"] as const;
const FEATURE_KEYS = ["api", "custom_branding", "custom_email_domain", "live_inbox", "custom_roles", "audit_log", "sla"] as const;

function numOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Plan>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plans", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { plans: Plan[] };
      setPlans(json.plans);
      setDrafts(Object.fromEntries(json.plans.map((p) => [p.id, structuredClone(p)])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (id: string) => {
      const draft = drafts[id];
      if (!draft) return;
      setSavingId(id);
      try {
        const res = await fetch("/api/admin/plans", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
        toast.success(`${draft.name} saved`);
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSavingId(null);
      }
    },
    [drafts, load],
  );

  const isDirty = useCallback(
    (id: string) => {
      const original = plans.find((p) => p.id === id);
      const draft = drafts[id];
      return JSON.stringify(original) !== JSON.stringify(draft);
    },
    [plans, drafts],
  );

  const updateDraft = useCallback((id: string, mutator: (p: Plan) => Plan) => {
    setDrafts((prev) => ({ ...prev, [id]: mutator(prev[id]) }));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscription plans users can buy. Edit prices, limits, channels, and provider price IDs.
        </p>
      </header>

      <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-amber-900 dark:text-amber-200">
            <strong>Heads up.</strong> Changing prices here updates what users see on the pricing
            and billing pages. The actual amount charged comes from your provider — make sure the{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/30">provider_ids</code> for
            Stripe / Razorpay point at the matching price/plan in each gateway.
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.values(drafts).map((p) => (
            <PlanEditor
              key={p.id}
              plan={p}
              dirty={isDirty(p.id)}
              saving={savingId === p.id}
              onChange={(mut) => updateDraft(p.id, mut)}
              onSave={() => save(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanEditor({
  plan,
  dirty,
  saving,
  onChange,
  onSave,
}: {
  plan: Plan;
  dirty: boolean;
  saving: boolean;
  onChange: (mutator: (p: Plan) => Plan) => void;
  onSave: () => void;
}) {
  const providerIds = plan.provider_ids ?? {};

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">{plan.name}</h2>
            {plan.active ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
            <span className="font-mono text-xs text-muted-foreground">id: {plan.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={plan.active}
                onCheckedChange={(v) => onChange((p) => ({ ...p, active: v }))}
                id={`active-${plan.id}`}
              />
              <Label htmlFor={`active-${plan.id}`} className="text-sm">
                Active
              </Label>
            </div>
            <Button onClick={onSave} disabled={!dirty || saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field
            label="Display name"
            value={plan.name}
            onChange={(v) => onChange((p) => ({ ...p, name: v }))}
          />
          <Field
            label="Sort order"
            value={String(plan.sort_order)}
            onChange={(v) => onChange((p) => ({ ...p, sort_order: Number(v) || 0 }))}
            type="number"
          />
          <Field
            label="Monthly credits"
            value={String(plan.monthly_credits)}
            onChange={(v) => onChange((p) => ({ ...p, monthly_credits: Number(v) || 0 }))}
            type="number"
          />
          <Field
            label="Analytics retention (days)"
            value={plan.analytics_retention_days?.toString() ?? ""}
            onChange={(v) => onChange((p) => ({ ...p, analytics_retention_days: numOrNull(v) }))}
            type="number"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field
            label="Max contacts (blank = unlimited)"
            value={plan.max_contacts?.toString() ?? ""}
            onChange={(v) => onChange((p) => ({ ...p, max_contacts: numOrNull(v) }))}
            type="number"
          />
          <Field
            label="Max seats (blank = unlimited)"
            value={plan.max_seats?.toString() ?? ""}
            onChange={(v) => onChange((p) => ({ ...p, max_seats: numOrNull(v) }))}
            type="number"
          />
          <Field
            label="Max campaigns / month"
            value={plan.max_campaigns_per_month?.toString() ?? ""}
            onChange={(v) => onChange((p) => ({ ...p, max_campaigns_per_month: numOrNull(v) }))}
            type="number"
          />
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Pricing</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field
              label="INR / month"
              value={plan.price_inr_monthly?.toString() ?? ""}
              onChange={(v) => onChange((p) => ({ ...p, price_inr_monthly: numOrNull(v) }))}
              type="number"
              prefix="₹"
            />
            <Field
              label="INR / year"
              value={plan.price_inr_yearly?.toString() ?? ""}
              onChange={(v) => onChange((p) => ({ ...p, price_inr_yearly: numOrNull(v) }))}
              type="number"
              prefix="₹"
            />
            <Field
              label="USD / month"
              value={plan.price_usd_monthly?.toString() ?? ""}
              onChange={(v) => onChange((p) => ({ ...p, price_usd_monthly: numOrNull(v) }))}
              type="number"
              prefix="$"
            />
            <Field
              label="USD / year"
              value={plan.price_usd_yearly?.toString() ?? ""}
              onChange={(v) => onChange((p) => ({ ...p, price_usd_yearly: numOrNull(v) }))}
              type="number"
              prefix="$"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Channels included</p>
          <div className="flex flex-wrap gap-3">
            {CHANNEL_KEYS.map((ch) => (
              <label key={ch} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(plan.channels?.[ch])}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      channels: { ...(p.channels ?? {}), [ch]: e.target.checked },
                    }))
                  }
                />
                <span className="capitalize">{ch.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Feature flags</p>
          <div className="flex flex-wrap gap-3">
            {FEATURE_KEYS.map((fk) => (
              <label key={fk} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(plan.features?.[fk])}
                  onChange={(e) =>
                    onChange((p) => ({
                      ...p,
                      features: { ...(p.features ?? {}), [fk]: e.target.checked },
                    }))
                  }
                />
                <span className="capitalize">{fk.replace(/_/g, " ")}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Provider price IDs</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ProviderIdGroup
              label="Stripe"
              ids={providerIds.stripe ?? {}}
              fields={["monthly_inr", "yearly_inr", "monthly_usd", "yearly_usd"]}
              onChange={(field, value) =>
                onChange((p) => ({
                  ...p,
                  provider_ids: {
                    ...providerIds,
                    stripe: { ...(providerIds.stripe ?? {}), [field]: value },
                  },
                }))
              }
            />
            <ProviderIdGroup
              label="Razorpay (INR only)"
              ids={providerIds.razorpay ?? {}}
              fields={["monthly_inr", "yearly_inr"]}
              onChange={(field, value) =>
                onChange((p) => ({
                  ...p,
                  provider_ids: {
                    ...providerIds,
                    razorpay: { ...(providerIds.razorpay ?? {}), [field]: value },
                  },
                }))
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={prefix ? "pl-6" : ""}
        />
      </div>
    </div>
  );
}

function ProviderIdGroup({
  label,
  ids,
  fields,
  onChange,
}: {
  label: string;
  ids: Record<string, string>;
  fields: string[];
  onChange: (field: string, value: string) => void;
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="flex flex-col gap-2 p-4">
        <p className="text-xs font-medium">{label}</p>
        {fields.map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span className="w-24 text-xs text-muted-foreground">{f.replace(/_/g, " · ")}</span>
            <Input
              value={ids[f] ?? ""}
              placeholder={label.startsWith("Stripe") ? "price_..." : "plan_..."}
              onChange={(e) => onChange(f, e.target.value)}
              className="text-xs"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
