"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Bell, Info, Loader2, Mail, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type Field =
  | "email_billing"
  | "email_low_balance"
  | "email_product_updates"
  | "email_team_invites"
  | "email_campaign_completed"
  | "email_weekly_digest"
  | "inapp_team_activity"
  | "inapp_campaign_status"
  | "inapp_credit_alerts"
  | "marketing_emails";

type Prefs = Record<Field, boolean>;

interface Section {
  id: "email" | "inapp" | "marketing";
  title: string;
  description: string;
  icon: typeof Mail;
  items: { key: Field; label: string; help: string }[];
}

const SECTIONS: Section[] = [
  {
    id: "email",
    title: "Email",
    description: "Transactional emails sent to your sign-in address.",
    icon: Mail,
    items: [
      {
        key: "email_billing",
        label: "Billing & receipts",
        help: "Trial reminders, payment receipts, invoices, payment failures.",
      },
      {
        key: "email_low_balance",
        label: "Low credit balance",
        help: "Heads-up when your balance is running low.",
      },
      {
        key: "email_team_invites",
        label: "Team invites & changes",
        help: "When someone invites you or changes your role.",
      },
      {
        key: "email_campaign_completed",
        label: "Campaign completion",
        help: "Summary email each time a campaign finishes sending.",
      },
      {
        key: "email_weekly_digest",
        label: "Weekly digest",
        help: "Monday morning summary of last week's activity.",
      },
      {
        key: "email_product_updates",
        label: "Product updates",
        help: "Major new features and important changes (low volume).",
      },
    ],
  },
  {
    id: "inapp",
    title: "In-app",
    description: "Bell-icon notifications inside the dashboard.",
    icon: Bell,
    items: [
      {
        key: "inapp_team_activity",
        label: "Team activity",
        help: "Members joining, leaving, or changing role on shared projects.",
      },
      {
        key: "inapp_campaign_status",
        label: "Campaign status changes",
        help: "Sent, paused, failed.",
      },
      {
        key: "inapp_credit_alerts",
        label: "Credit alerts",
        help: "Plan grants, top-ups, auto-recharges, low-balance pings.",
      },
    ],
  },
  {
    id: "marketing",
    title: "Marketing",
    description: "Optional, opt-in only.",
    icon: Sparkles,
    items: [
      {
        key: "marketing_emails",
        label: "Marketing emails",
        help: "Tips, case studies, occasional promos. You can unsubscribe any time.",
      },
    ],
  },
];

export default function NotificationsPage() {
  const [original, setOriginal] = useState<Prefs | null>(null);
  const [draft, setDraft] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/notifications", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as { preferences: Prefs };
      setOriginal(json.preferences);
      setDraft(json.preferences);
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
    if (!original || !draft) return false;
    return (Object.keys(original) as Field[]).some((k) => original[k] !== draft[k]);
  }, [original, draft]);

  const handleSave = useCallback(async () => {
    if (!draft || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      toast.success("Preferences saved");
      setOriginal(draft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [draft, dirty]);

  const handleToggle = (key: Field, value: boolean) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleQuickAction = (action: "mute_all" | "default" | "essential_only") => {
    setDraft(() => {
      if (action === "mute_all") {
        return Object.fromEntries(
          SECTIONS.flatMap((s) => s.items.map((i) => [i.key, false])),
        ) as Prefs;
      }
      if (action === "essential_only") {
        return {
          email_billing: true,
          email_low_balance: true,
          email_team_invites: true,
          email_campaign_completed: false,
          email_weekly_digest: false,
          email_product_updates: false,
          inapp_team_activity: true,
          inapp_campaign_status: true,
          inapp_credit_alerts: true,
          marketing_emails: false,
        };
      }
      // default
      return {
        email_billing: true,
        email_low_balance: true,
        email_team_invites: true,
        email_campaign_completed: false,
        email_weekly_digest: false,
        email_product_updates: true,
        inapp_team_activity: true,
        inapp_campaign_status: true,
        inapp_credit_alerts: true,
        marketing_emails: false,
      };
    });
  };

  if (loading || !draft) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Notifications" description="Choose what you want to hear about and how." />
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Notifications" description="Choose what you want to hear about and how." />

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-start gap-3 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-medium text-foreground">Quick presets</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Apply a preset, then fine-tune anything below before saving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => handleQuickAction("default")}>
              Default
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleQuickAction("essential_only")}>
              Essential only
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleQuickAction("mute_all")}>
              Mute all
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id} className="bg-white dark:bg-gray-900">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-base font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex flex-col">
                  {section.items.map((item, i) => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.help}</p>
                        </div>
                        <Switch
                          checked={draft[item.key]}
                          onCheckedChange={(v) => handleToggle(item.key, v)}
                        />
                      </div>
                      {i < section.items.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <span className="mr-auto text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes" : "All changes saved"}
        </span>
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save preferences
        </Button>
      </div>
    </div>
  );
}
