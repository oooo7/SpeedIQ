"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Info, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface Setting {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

/**
 * Definitions of how each setting key should be rendered. Anything not in
 * this map falls back to a JSON textarea so admins can still edit it.
 */
const SCHEMA: Record<
  string,
  {
    label: string;
    help?: string;
    type: "boolean" | "number" | "string" | "select";
    options?: { value: string; label: string }[];
    section: "trial" | "currency" | "providers" | "policy" | "features";
  }
> = {
  trial_days: { label: "Trial length (days)", type: "number", section: "trial" },
  trial_credits: { label: "Trial credits granted", type: "number", section: "trial", help: "Granted once when the subscription enters trial" },
  default_currency: { label: "Default currency", type: "select", options: [{ value: "inr", label: "INR" }, { value: "usd", label: "USD" }], section: "currency" },
  annual_discount_pct: { label: "Annual discount (%)", type: "number", section: "currency", help: "Display-only; actual prices come from each plan" },
  gst_pct: { label: "India GST (%)", type: "number", section: "currency", help: "Display-only on invoices; Razorpay handles actual GST" },
  preferred_provider_inr: {
    label: "Provider for INR",
    type: "select",
    options: [{ value: "razorpay", label: "Razorpay" }, { value: "stripe", label: "Stripe" }],
    section: "providers",
  },
  preferred_provider_usd: {
    label: "Provider for USD",
    type: "select",
    options: [{ value: "stripe", label: "Stripe" }, { value: "razorpay", label: "Razorpay (unsupported)" }],
    section: "providers",
  },
  refund_policy: {
    label: "Refund policy",
    type: "select",
    options: [
      { value: "none", label: "No refunds" },
      { value: "prorated", label: "Prorated" },
      { value: "manual", label: "Manual" },
    ],
    section: "policy",
  },
  platform_name: { label: "Platform display name", type: "string", section: "policy", help: "Shown in invoices and emails" },
  feature_billing_enabled: { label: "Billing kill-switch", help: "Off = no charges, all sends free", type: "boolean", section: "features" },
  feature_email_enabled: { label: "Email channel enabled", type: "boolean", section: "features" },
  feature_sms_enabled: { label: "SMS channel enabled", type: "boolean", section: "features" },
};

const SECTIONS: { id: string; label: string; description: string }[] = [
  { id: "trial", label: "Trial", description: "Trial length and welcome credits" },
  { id: "currency", label: "Currency & discounts", description: "Defaults and display rules" },
  { id: "providers", label: "Payment providers", description: "Which provider handles each currency" },
  { id: "policy", label: "Policies", description: "Refund and branding" },
  { id: "features", label: "Feature flags", description: "Global kill switches" },
];

function coerceValue(raw: unknown): string | number | boolean {
  if (typeof raw === "boolean" || typeof raw === "number" || typeof raw === "string") return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { settings: Setting[] };
      setSettings(json.settings);
      setDrafts(Object.fromEntries(json.settings.map((s) => [s.key, s.value])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    const diff: Record<string, unknown> = {};
    for (const s of settings) {
      if (JSON.stringify(s.value) !== JSON.stringify(drafts[s.key])) {
        diff[s.key] = drafts[s.key];
      }
    }
    return diff;
  }, [settings, drafts]);

  const dirtyCount = Object.keys(dirty).length;

  const save = useCallback(async () => {
    if (dirtyCount === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates: dirty }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      toast.success(`Saved ${dirtyCount} setting(s)`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [dirty, dirtyCount, load]);

  const setKey = (key: string, value: unknown) =>
    setDrafts((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform-wide defaults that apply to every project.
          </p>
        </div>
        <Button onClick={save} disabled={dirtyCount === 0 || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {SECTIONS.map((section) => {
            const keys = settings.filter((s) => SCHEMA[s.key]?.section === section.id);
            if (keys.length === 0) return null;
            return (
              <Card key={section.id}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div>
                    <p className="text-sm font-medium">{section.label}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {keys.map((s) => (
                      <SettingField
                        key={s.key}
                        setting={s}
                        value={drafts[s.key]}
                        onChange={(v) => setKey(s.key, v)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Unknown keys */}
          {(() => {
            const unknownKeys = settings.filter((s) => !SCHEMA[s.key]);
            if (unknownKeys.length === 0) return null;
            return (
              <Card>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div>
                    <p className="text-sm font-medium">Other settings (raw JSON)</p>
                    <p className="text-xs text-muted-foreground">
                      Keys not yet typed in the admin UI — edit carefully.
                    </p>
                  </div>
                  <Separator />
                  {unknownKeys.map((s) => (
                    <div key={s.key} className="flex flex-col gap-1">
                      <Label className="text-xs font-mono">{s.key}</Label>
                      <Input
                        value={String(coerceValue(drafts[s.key]))}
                        onChange={(e) => {
                          try {
                            setKey(s.key, JSON.parse(e.target.value));
                          } catch {
                            setKey(s.key, e.target.value);
                          }
                        }}
                      />
                      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-amber-900 dark:text-amber-200">
            Provider routing is cached for 60 seconds across server instances. Setting changes
            take effect immediately on the instance that processed the request and within 60s
            everywhere else.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingField({
  setting,
  value,
  onChange,
}: {
  setting: Setting;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const def = SCHEMA[setting.key];
  if (!def) return null;

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{def.label}</Label>
      {def.type === "boolean" && (
        <div className="flex items-center gap-2 pt-1">
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          <span className="text-sm text-muted-foreground">{value ? "On" : "Off"}</span>
        </div>
      )}
      {def.type === "number" && (
        <Input
          type="number"
          value={typeof value === "number" ? value : Number(value) || 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
      {def.type === "string" && (
        <Input value={typeof value === "string" ? value : String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      )}
      {def.type === "select" && (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {def.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      {def.help && <p className="text-xs text-muted-foreground">{def.help}</p>}
    </div>
  );
}
