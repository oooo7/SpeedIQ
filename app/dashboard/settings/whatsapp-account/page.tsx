"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, FileText, Image, Loader2, MessageSquare, MessageSquareQuote, Music, Pencil, RefreshCw, Send, Settings2, Video } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/dashboard/page-header";
import { WhatsAppConnectButton } from "@/components/whatsapp/whatsapp-connect-button";
import { useProjectContext } from "@/lib/projects/project-context";

type WhatsAppSettingsTab = "account" | "optin" | "automation";

type WhatsAppMessageType = "text" | "image" | "video" | "audio" | "file";

const WHATSAPP_MESSAGE_TYPE_OPTIONS: { value: WhatsAppMessageType; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "Text", icon: FileText },
  { value: "image", label: "Image", icon: Image },
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
  { value: "file", label: "File", icon: FileText },
];

interface WhatsAppSettings {
  respect_opt_out_for_campaigns: boolean;
  opt_out_keywords: string[];
  opt_out_response_enabled: boolean;
  opt_out_response_text: string | null;
  opt_out_response_type?: WhatsAppMessageType | null;
  opt_out_response_attachment_path?: string | null;
  opt_out_response_attachment_filename?: string | null;
  opt_in_keywords: string[];
  opt_in_response_enabled: boolean;
  opt_in_response_text: string | null;
  opt_in_response_type?: WhatsAppMessageType | null;
  opt_in_response_attachment_path?: string | null;
  opt_in_response_attachment_filename?: string | null;
  auto_resolve_chats: boolean;
  welcome_message_enabled: boolean;
  welcome_message_text: string | null;
  welcome_message_type?: WhatsAppMessageType | null;
  welcome_message_attachment_path?: string | null;
  welcome_message_attachment_filename?: string | null;
  off_hours_message_enabled: boolean;
  off_hours_message_text: string | null;
  off_hours_message_type?: WhatsAppMessageType | null;
  off_hours_message_attachment_path?: string | null;
  off_hours_message_attachment_filename?: string | null;
  timezone: string;
  working_hours: Record<string, { enabled: boolean; from?: string; to?: string }>;
}

interface WhatsAppOAuthConfig {
  appId: string;
  configId: string;
  solutionId?: string | null;
  callbackUrl?: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
  language: string;
  status: string;
}

interface WhatsAppAccountData {
  id?: string;
  project_id: string;
  phone_number_id?: string;
  waba_id?: string;
  phone_number?: string | null;
  display_name?: string | null;
  quality_rating?: string | null;
  tier?: string | null;
  platform_type?: string | null;
  verified_name?: string | null;
  code_verification_status?: string | null;
  status?: string | null;
  connected: boolean;
  connection_type?: "manual" | "embedded_signup";
  token_expires_at?: string | null;
}

function formatDisplayPhone(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return raw;
  if (digits.length <= 6) return `+${digits.slice(0, digits.length - 3)} ${digits.slice(-3)}`;
  if (digits.length <= 10)
    return `+${digits.slice(0, digits.length - 7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`;
  return `+${digits.slice(0, -10)} ${digits.slice(-10, -7)} ${digits.slice(-7, -4)} ${digits.slice(-4)}`;
}

function qualityLabel(rating: string | null | undefined): string {
  if (!rating) return "—";
  const labels: Record<string, string> = {
    GREEN: "Good",
    YELLOW: "Medium",
    RED: "Low",
    UNKNOWN: "Unknown",
    NA: "N/A",
  };
  return labels[rating] ?? rating;
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  const labels: Record<string, string> = {
    CONNECTED: "Connected",
    FLAGGED: "Flagged",
    RESTRICTED: "Restricted",
  };
  return labels[status] ?? status;
}

function codeVerificationLabel(code: string | null | undefined): string {
  if (!code) return "—";
  const labels: Record<string, string> = {
    VERIFIED: "Verified",
    UNVERIFIED: "Unverified",
  };
  return labels[code] ?? code;
}

export default function WhatsAppAccountPage() {
  const { activeProject } = useProjectContext();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<WhatsAppAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone_number_id, setPhoneNumberId] = useState("");
  const [waba_id, setWabaId] = useState("");
  const [access_token, setAccessToken] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [display_name, setDisplayName] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testTemplate, setTestTemplate] = useState<string>("");
  const [testSending, setTestSending] = useState(false);
  const [approvedTemplates, setApprovedTemplates] = useState<TemplateOption[]>([]);
  const [oauthConfig, setOauthConfig] = useState<WhatsAppOAuthConfig | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState<string>("");
  const [currentRedirectUri, setCurrentRedirectUri] = useState<string>("");

  const tabParam = searchParams.get("tab");
  const tab: WhatsAppSettingsTab =
    tabParam === "optin" || tabParam === "automation" ? tabParam : "account";

  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [refreshingSettings, setRefreshingSettings] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!activeProject?.id) return;
    setSettingsLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/settings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
      setSettings(data.settings ?? null);
    } catch {
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, [activeProject?.id]);

  /** Refresh settings from DB without showing full loading (e.g. after changes from another tab/device). */
  const refreshSettings = useCallback(async () => {
    if (!activeProject?.id) return;
    setRefreshingSettings(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/settings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load settings");
      setSettings(data.settings ?? null);
      toast.success("Settings refreshed");
    } catch {
      toast.error("Could not refresh settings");
    } finally {
      setRefreshingSettings(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    if (tab === "optin" || tab === "automation") {
      fetchSettings();
    }
  }, [tab, fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<WhatsAppSettings>) => {
      if (!activeProject?.id) return;
      setSettingsSaving(true);
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to save");
        setSettings(data.settings ?? null);
        toast.success("Settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save settings");
      } finally {
        setSettingsSaving(false);
      }
    },
    [activeProject?.id]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
      setCurrentRedirectUri(window.location.origin + window.location.pathname);
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

  // Handle return from WhatsApp OAuth callback (?connected=1 or ?error=...)
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    if (connected === "1") {
      toast.success("WhatsApp account connected successfully!");
      refreshAccountData();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (error) {
      const msg = message ? decodeURIComponent(message) : error;
      toast.error(msg || "Connection failed");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  // Fetch OAuth config for Embedded Signup
  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setOauthConfig(data);
      })
      .catch(() => setOauthConfig(null));
  }, []);

  useEffect(() => {
    if (!activeProject?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/account`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setAccount(null);
          return;
        }
        const acc = data.account as WhatsAppAccountData;
        setAccount(acc);
        if (acc.connected) {
          setPhoneNumberId(acc.phone_number_id ?? "");
          setWabaId(acc.waba_id ?? "");
          setPhoneNumber(acc.phone_number ?? "");
          setDisplayName(acc.display_name ?? "");
        }
      } catch {
        if (!cancelled) setAccount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  useEffect(() => {
    if (!activeProject?.id || !account?.connected) return;
    fetch(`/api/projects/${activeProject.id}/whatsapp/templates?status=approved`)
      .then((r) => r.json())
      .then((d) => setApprovedTemplates(d.templates ?? []))
      .catch(() => setApprovedTemplates([]));
  }, [activeProject?.id, account?.connected]);

  const handleSendTest = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!testTo.trim()) {
      toast.error("Enter a phone number to send to");
      return;
    }
    if (!testTemplate) {
      toast.error("Select a template to send");
      return;
    }
    setTestSending(true);
    try {
      const body: { to: string; template_name?: string; template_id?: string } = { to: testTo.trim() };
      if (testTemplate === "hello_world") {
        body.template_name = "hello_world";
      } else {
        body.template_id = testTemplate;
      }
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      toast.success("Test message sent. Check WhatsApp.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send test message");
    } finally {
      setTestSending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!phone_number_id.trim() || !waba_id.trim()) {
      toast.error("Phone Number ID and WABA ID are required");
      return;
    }
    if (!account?.connected && !access_token.trim()) {
      toast.error("Access Token is required when connecting for the first time");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: phone_number_id.trim(),
          waba_id: waba_id.trim(),
          access_token: access_token.trim(),
          phone_number: phone_number.trim() || undefined,
          display_name: display_name.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setAccount(data.account);
      setAccessToken("");
      toast.success("WhatsApp account connected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect account");
    } finally {
      setSaving(false);
    }
  };

  const refreshAccountData = async () => {
    if (!activeProject?.id) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/account`);
      const data = await res.json();
      if (res.ok && data.account) {
        const acc = data.account as WhatsAppAccountData;
        setAccount(acc);
        if (acc.connected) {
          setPhoneNumberId(acc.phone_number_id ?? "");
          setWabaId(acc.waba_id ?? "");
          setPhoneNumber(acc.phone_number ?? "");
          setDisplayName(acc.display_name ?? "");
        }
      }
    } catch {
      // Ignore errors during refresh
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-medium">WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Select a project to connect a WhatsApp Business account.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-medium">WhatsApp</h1>
        <LoadingState message="Loading account…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 w-full">
      <PageHeader
        title="WhatsApp"
        description="Connect a WhatsApp Business number and configure opt-in, opt-out, and automated messages."
      />

      <nav className="border-b border-gray-200 dark:border-gray-800" aria-label="WhatsApp settings tabs">
        <div className="flex gap-0">
          <Link
            href="/dashboard/settings/whatsapp-account?tab=account"
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "account"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Account
          </Link>
          <Link
            href="/dashboard/settings/whatsapp-account?tab=optin"
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "optin"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            Opt-in & Opt-out
          </Link>
          <Link
            href="/dashboard/settings/whatsapp-account?tab=automation"
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "automation"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <MessageSquareQuote className="h-4 w-4 shrink-0" />
            Automated Messages
          </Link>
        </div>
      </nav>

      {tab === "account" && (
        <>
      {account?.connected ? (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-500" />
              <CardTitle>Connected</CardTitle>
              <Badge variant={account.connection_type === "embedded_signup" ? "default" : "secondary"}>
                {account.connection_type === "embedded_signup" ? "Via Meta" : "Manual"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={async () => {
                if (!activeProject?.id) return;
                setRefreshing(true);
                try {
                  const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/account/refresh`, {
                    method: "POST",
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? "Refresh failed");
                  setAccount((prev) =>
                    prev
                      ? {
                          ...prev,
                          quality_rating: data.quality_rating ?? prev.quality_rating,
                          phone_number: data.display_phone_number ?? prev.phone_number,
                          platform_type: data.platform_type ?? prev.platform_type,
                          verified_name: data.verified_name ?? prev.verified_name,
                          code_verification_status: data.code_verification_status ?? prev.code_verification_status,
                          status: data.status ?? prev.status,
                        }
                      : prev
                  );
                  toast.success("Account info refreshed");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not refresh");
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh health"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              This WhatsApp Business number is used when you send messages from this app (test message below, Chats, or Campaigns). Click &quot;Refresh health&quot; to fetch the latest data from Meta.
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm first:pt-0">
                <dt className="text-muted-foreground font-medium">Phone number</dt>
                <dd className="font-mono tabular-nums">
                  {formatDisplayPhone(account.phone_number)}
                </dd>
              </dl>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm">
                <dt className="text-muted-foreground font-medium">Verified name</dt>
                <dd>{account.verified_name?.trim() || "—"}</dd>
              </dl>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm">
                <dt className="text-muted-foreground font-medium">Display name (optional)</dt>
                <dd>{account.display_name?.trim() || "—"}</dd>
              </dl>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm">
                <dt className="text-muted-foreground font-medium">Quality rating</dt>
                <dd>
                  <span
                    className={
                      account.quality_rating === "GREEN"
                        ? "text-green-600 dark:text-green-500 font-medium"
                        : account.quality_rating === "YELLOW"
                          ? "text-amber-600 dark:text-amber-500 font-medium"
                          : account.quality_rating === "RED"
                            ? "text-red-600 dark:text-red-500 font-medium"
                            : "text-muted-foreground"
                    }
                  >
                    {qualityLabel(account.quality_rating)}
                  </span>
                </dd>
              </dl>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm">
                <dt className="text-muted-foreground font-medium">Status</dt>
                <dd>{statusLabel(account.status)}</dd>
              </dl>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm">
                <dt className="text-muted-foreground font-medium">Code verification</dt>
                <dd>{codeVerificationLabel(account.code_verification_status)}</dd>
              </dl>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm">
                <dt className="text-muted-foreground font-medium">Platform</dt>
                <dd>{account.platform_type?.replace(/_/g, " ") ?? "—"}</dd>
              </dl>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 py-3 text-sm last:pb-0">
                <dt className="text-muted-foreground font-medium">Tier</dt>
                <dd>{account.tier?.trim() || "—"}</dd>
              </dl>
            </div>

            {account.quality_rating === "UNKNOWN" && (
              <p className="text-xs text-muted-foreground">
                Meta shows &quot;Unknown&quot; for new or test numbers until there is enough messaging history. Send messages and wait; the rating will update to Good, Medium, or Low.
              </p>
            )}
            {account.quality_rating && account.quality_rating !== "GREEN" && account.quality_rating !== "UNKNOWN" && (
              <p className="text-xs text-muted-foreground">
                Keep response times low and avoid user reports to improve quality rating.
              </p>
            )}

            <p className="text-sm text-muted-foreground">
              To update credentials, use the form below and submit again. Leave access token empty to keep the
              current one.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {account?.connected ? (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Send test message</CardTitle>
            <CardDescription>
              Send a real message from your connected number to any phone number. The message is delivered to the recipient&apos;s WhatsApp app — use this to verify sending works.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendTest} className="divide-y divide-gray-100 dark:divide-gray-800">
              <div className="space-y-2 pb-4">
                <Label htmlFor="test-to">To (phone number) *</Label>
                <Input
                  id="test-to"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="e.g. 917470915225 (country code, no + or spaces)"
                />
              </div>
              <div className="space-y-2 py-4">
                <Label>Template *</Label>
                <p className="text-xs text-muted-foreground mb-1">Select a template. Only approved templates can be sent.</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="test-template"
                      checked={testTemplate === "hello_world"}
                      onChange={() => setTestTemplate("hello_world")}
                    />
                    hello_world (for testing)
                  </label>
                  {approvedTemplates.length > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">Approved templates:</span>
                      {approvedTemplates.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="test-template"
                            checked={testTemplate === t.id}
                            onChange={() => setTestTemplate(t.id)}
                          />
                          {t.name} ({t.language})
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="pt-4">
              <Button type="submit" disabled={testSending || !testTemplate} className="gap-1">
                {testSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send test message
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {!account?.connected && oauthConfig ? (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Connect with WhatsApp</CardTitle>
            <CardDescription>
              Use Meta&apos;s secure login to connect your WhatsApp Business account in seconds. This is the recommended way to connect.
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-2">
              If you don&apos;t see your WhatsApp account in the flow, it may have been created in the Meta developer app—those can&apos;t be used here. Create a new one in the flow or connect manually below.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <WhatsAppConnectButton
              projectId={activeProject.id}
              appId={oauthConfig.appId}
              configId={oauthConfig.configId}
              solutionId={oauthConfig.solutionId}
              callbackUrl={oauthConfig.callbackUrl}
              onSuccess={refreshAccountData}
            />
            <Collapsible open={showDomainHelp} onOpenChange={setShowDomainHelp}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground text-xs p-0 h-auto">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDomainHelp ? "rotate-180" : ""}`} />
                  &quot;Can&apos;t load URL: domain isn&apos;t included&quot; — add your domain in all 3 places
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Meta checks your domain in <strong>three separate places</strong>. Add the values below in each.
                </p>
                {currentOrigin && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Domain only (no https://):</span>
                      <code className="bg-muted px-1.5 py-0.5 break-all">{currentOrigin.replace(/^https?:\/\//, "")}</code>
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(currentOrigin.replace(/^https?:\/\//, ""), "Domain")}>
                        Copy
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Full redirect URI:</span>
                      <code className="bg-muted px-1.5 py-0.5 break-all">{currentRedirectUri}</code>
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(currentRedirectUri, "Redirect URI")}>
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>
                    <strong>Settings → Basic</strong> → <strong>App domains</strong>: add the <em>domain only</em> (e.g. <code>www.speediq.ai</code> or <code>xxxx.ngrok-free.app</code>). No <code>https://</code> or path.
                  </li>
                  <li>
                    <strong>Use cases</strong> → open <strong>Customize</strong> → <strong>Facebook Login for Business</strong> → <strong>Settings</strong> → <strong>Client OAuth settings</strong> → <strong>Allowed domains</strong>: add the same <em>domain only</em>.
                  </li>
                  <li>
                    In the same <strong>Client OAuth settings</strong> → <strong>Valid OAuth redirect URIs</strong>: add the <em>full redirect URI</em> (e.g. <code>https://www.speediq.ai/dashboard/settings/whatsapp-account</code>). Use &quot;Redirect URI Validator&quot; to check, then add the same URL here.
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Save after each section. If you use a new URL (e.g. new ngrok subdomain), add that domain and redirect URI in all three places again.
                </p>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ) : null}

      {!account?.connected && !oauthConfig ? (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle>Connect account</CardTitle>
            <CardDescription>
              Enter your WhatsApp Business API credentials from Meta. Token is stored securely and never sent to
              the client.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Manual credentials form - collapsible when OAuth is available */}
      {oauthConfig ? (
        <Collapsible open={showManualForm} onOpenChange={setShowManualForm}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform ${showManualForm ? "rotate-180" : ""}`} />
              {account?.connected ? "Update credentials manually" : "Or enter credentials manually"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                <Input
                  id="phone_number_id"
                  value={phone_number_id}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="From Meta Developer Console"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waba_id">WABA ID (WhatsApp Business Account ID) *</Label>
                <Input
                  id="waba_id"
                  value={waba_id}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="From Meta Business Suite"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Business Manager → Business Settings → Accounts → WhatsApp Business Accounts. Required for template submission and status.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="access_token">Access Token *</Label>
                <Input
                  id="access_token"
                  type="password"
                  value={access_token}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={account?.connected ? "Leave blank to keep current" : "Permanent or temporary token"}
                />
                <p className="text-xs text-muted-foreground">
                  Tokens expire (temporary ~1 hour; long-lived up to 60 days). If you see &quot;Session has expired&quot;, get a new token from Meta → your app → WhatsApp → API Setup and paste it here.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone number (optional)</Label>
                <Input
                  id="phone_number"
                  value={phone_number}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display name (optional)</Label>
                <Input
                  id="display_name"
                  value={display_name}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Business name"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : account?.connected ? (
                  "Update account"
                ) : (
                  "Connect account"
                )}
              </Button>
            </form>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number_id">Phone Number ID *</Label>
            <Input
              id="phone_number_id"
              value={phone_number_id}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="From Meta Developer Console"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waba_id">WABA ID (WhatsApp Business Account ID) *</Label>
            <Input
              id="waba_id"
              value={waba_id}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="From Meta Business Suite"
              required
            />
            <p className="text-xs text-muted-foreground">
              Business Manager → Business Settings → Accounts → WhatsApp Business Accounts. Required for template submission and status.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token *</Label>
            <Input
              id="access_token"
              type="password"
              value={access_token}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={account?.connected ? "Leave blank to keep current" : "Permanent or temporary token"}
            />
            <p className="text-xs text-muted-foreground">
              Tokens expire (temporary ~1 hour; long-lived up to 60 days). If you see &quot;Session has expired&quot;, get a new token from Meta → your app → WhatsApp → API Setup and paste it here.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone number (optional)</Label>
            <Input
              id="phone_number"
              value={phone_number}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name (optional)</Label>
            <Input
              id="display_name"
              value={display_name}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Business name"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : account?.connected ? (
              "Update account"
            ) : (
              "Connect account"
            )}
          </Button>
        </form>
      )}
        </>
      )}

      {tab === "optin" && (
        <OptInOptOutTab
          activeProjectId={activeProject?.id ?? null}
          settings={settings}
          settingsLoading={settingsLoading}
          settingsSaving={settingsSaving}
          onUpdate={updateSettings}
          onRefresh={refreshSettings}
          refreshingSettings={refreshingSettings}
        />
      )}

      {tab === "automation" && (
        <AutomationTab
          activeProjectId={activeProject?.id ?? null}
          settings={settings}
          settingsLoading={settingsLoading}
          settingsSaving={settingsSaving}
          onUpdate={updateSettings}
          onRefresh={refreshSettings}
          refreshingSettings={refreshingSettings}
        />
      )}
    </div>
  );
}

function ChatBubblePreview({
  text,
  type,
  attachmentFilename,
}: {
  text: string | null;
  type?: WhatsAppMessageType | null;
  attachmentFilename?: string | null;
}) {
  const isMedia = type && type !== "text";
  const display =
    isMedia && attachmentFilename
      ? `Attachment: ${attachmentFilename}${text?.trim() ? ` — ${text.trim()}` : ""}`
      : text?.trim() || "Your auto response is disabled";
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-lg bg-green-600 px-3 py-2 text-sm text-white">
        {display}
      </div>
    </div>
  );
}

type ResponseSlotKey = "opt_out_response" | "opt_in_response" | "welcome_message" | "off_hours_message";

function getAcceptForType(type: WhatsAppMessageType): string {
  switch (type) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    case "file":
      return "*";
    default:
      return "";
  }
}

function ResponseMessageConfigDialog({
  open,
  onOpenChange,
  title,
  description,
  slotKey,
  current,
  onSave,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  slotKey: ResponseSlotKey;
  current: {
    type: WhatsAppMessageType;
    text: string | null;
    attachment_path: string | null;
    attachment_filename: string | null;
  };
  onSave: (u: Partial<WhatsAppSettings>) => Promise<void>;
  projectId: string;
}) {
  const [type, setType] = useState<WhatsAppMessageType>(current.type ?? "text");
  const [text, setText] = useState(current.text ?? "");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(current.attachment_path);
  const [attachmentFilename, setAttachmentFilename] = useState<string | null>(current.attachment_filename);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setType((current.type ?? "text") as WhatsAppMessageType);
      setText(current.text ?? "");
      setAttachmentPath(current.attachment_path);
      setAttachmentFilename(current.attachment_filename);
    }
  }, [open, current.type, current.text, current.attachment_path, current.attachment_filename]);

  const handleSave = async () => {
    const typeKey = `${slotKey}_type` as keyof WhatsAppSettings;
    const textKey = `${slotKey}_text` as keyof WhatsAppSettings;
    const pathKey = `${slotKey}_attachment_path` as keyof WhatsAppSettings;
    const filenameKey = `${slotKey}_attachment_filename` as keyof WhatsAppSettings;
    await onSave({
      [typeKey]: type,
      [textKey]: text.trim() || null,
      [pathKey]: type === "text" ? null : attachmentPath,
      [filenameKey]: type === "text" ? null : attachmentFilename,
    } as Partial<WhatsAppSettings>);
    onOpenChange(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/projects/${projectId}/whatsapp/settings/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setAttachmentPath(data.path);
      setAttachmentFilename(data.filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setFileInputKey((k) => k + 1);
    }
  };

  const isText = type === "text";

  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Message type</Label>
            <div className="flex flex-wrap gap-2">
              {WHATSAPP_MESSAGE_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={type === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setType(opt.value as WhatsAppMessageType)}
                >
                  <opt.icon className="mr-1 h-4 w-4" />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          {isText ? (
            <div className="space-y-2">
              <Label>Message</Label>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter your message" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>File</Label>
                <input
                  key={fileInputKey}
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptForType(type)}
                  className="block w-full text-sm text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
                  onChange={handleFileChange}
                />
                {uploading && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </span>
                )}
                {attachmentFilename && !uploading && (
                  <p className="text-sm text-muted-foreground">Uploaded: {attachmentFilename}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Caption (optional)</Label>
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Caption for the attachment" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={uploading || (!isText && !attachmentPath)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
  );
}

function OptInOptOutTab({
  activeProjectId,
  settings,
  settingsLoading,
  settingsSaving,
  onUpdate,
  onRefresh,
  refreshingSettings,
}: {
  activeProjectId: string | null;
  settings: WhatsAppSettings | null;
  settingsLoading: boolean;
  settingsSaving: boolean;
  onUpdate: (u: Partial<WhatsAppSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
  refreshingSettings: boolean;
}) {
  const [optOutKeywords, setOptOutKeywords] = useState<string[]>(settings?.opt_out_keywords?.length ? [...settings.opt_out_keywords] : ["Stop"]);
  const [optInKeywords, setOptInKeywords] = useState<string[]>(settings?.opt_in_keywords?.length ? [...settings.opt_in_keywords] : ["Allow"]);
  const [optOutDialogOpen, setOptOutDialogOpen] = useState(false);
  const [optInDialogOpen, setOptInDialogOpen] = useState(false);

  useEffect(() => {
    if (settings?.opt_out_keywords?.length) setOptOutKeywords([...settings.opt_out_keywords]);
    else setOptOutKeywords(["Stop"]);
    if (settings?.opt_in_keywords?.length) setOptInKeywords([...settings.opt_in_keywords]);
    else setOptInKeywords(["Allow"]);
  }, [settings]);

  if (!activeProjectId) return null;
  if (settingsLoading || !settings) {
    return <LoadingState message="Loading settings…" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Stored in Habiv only. Use <strong>Refresh</strong> to load changes made from another device or tab.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshingSettings}
        >
          {refreshingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">{refreshingSettings ? "Refreshing…" : "Refresh settings"}</span>
        </Button>
      </div>
      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="flex flex-row items-center justify-between gap-4 pt-6">
          <div>
            <p className="font-medium">API Campaign Opt-out</p>
            <p className="text-sm text-muted-foreground">
              Enable this if you don&apos;t wish to send API campaign to opted-out contacts.
            </p>
          </div>
          <Switch
            checked={settings.respect_opt_out_for_campaigns}
            onCheckedChange={(checked) => onUpdate({ respect_opt_out_for_campaigns: checked })}
          />
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base">Opt-out Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label>Opt-out Keywords</Label>
              <p className="text-xs text-muted-foreground">
                The user will have to type exactly one of these messages on which they should be automatically opted-out.
              </p>
            </div>
            <div className="space-y-2">
              {optOutKeywords.map((kw, i) => (
                <Input
                  key={i}
                  value={kw}
                  onChange={(e) => {
                    const next = [...optOutKeywords];
                    next[i] = e.target.value;
                    setOptOutKeywords(next);
                  }}
                  placeholder="Keyword"
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOptOutKeywords((prev) => [...prev, ""])}
              >
                + Add more
              </Button>
            </div>
            <Button
              disabled={settingsSaving}
              onClick={() => onUpdate({ opt_out_keywords: optOutKeywords.filter((k) => k.trim()) })}
            >
              {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Opt-out Response</Label>
                <p className="text-xs text-muted-foreground">Setup a response message for opt-out user keywords.</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.opt_out_response_enabled}
                  onCheckedChange={(checked) => onUpdate({ opt_out_response_enabled: checked })}
                />
                <Dialog open={optOutDialogOpen} onOpenChange={setOptOutDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <ResponseMessageConfigDialog
                    open={optOutDialogOpen}
                    onOpenChange={setOptOutDialogOpen}
                    title="Opt-out Response"
                    description="Message sent when a contact opts out."
                    slotKey="opt_out_response"
                    current={{
                      type: (settings.opt_out_response_type as WhatsAppMessageType) ?? "text",
                      text: settings.opt_out_response_text,
                      attachment_path: settings.opt_out_response_attachment_path ?? null,
                      attachment_filename: settings.opt_out_response_attachment_filename ?? null,
                    }}
                    onSave={onUpdate}
                    projectId={activeProjectId}
                  />
                </Dialog>
              </div>
            </div>
            <ChatBubblePreview
              text={settings.opt_out_response_text}
              type={settings.opt_out_response_type}
              attachmentFilename={settings.opt_out_response_attachment_filename}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base">Opt-in Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label>Opt-in Keywords</Label>
              <p className="text-xs text-muted-foreground">
                The user will have to type exactly one of these messages on which they should be automatically opted-in.
              </p>
            </div>
            <div className="space-y-2">
              {optInKeywords.map((kw, i) => (
                <Input
                  key={i}
                  value={kw}
                  onChange={(e) => {
                    const next = [...optInKeywords];
                    next[i] = e.target.value;
                    setOptInKeywords(next);
                  }}
                  placeholder="Keyword"
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOptInKeywords((prev) => [...prev, ""])}
              >
                + Add more
              </Button>
            </div>
            <Button
              disabled={settingsSaving}
              onClick={() => onUpdate({ opt_in_keywords: optInKeywords.filter((k) => k.trim()) })}
            >
              {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Opt-in Response</Label>
                <p className="text-xs text-muted-foreground">Setup a response message for opt-in user keywords.</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.opt_in_response_enabled}
                  onCheckedChange={(checked) => onUpdate({ opt_in_response_enabled: checked })}
                />
                <Dialog open={optInDialogOpen} onOpenChange={setOptInDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <ResponseMessageConfigDialog
                    open={optInDialogOpen}
                    onOpenChange={setOptInDialogOpen}
                    title="Opt-in Response"
                    description="Message sent when a contact opts in."
                    slotKey="opt_in_response"
                    current={{
                      type: (settings.opt_in_response_type as WhatsAppMessageType) ?? "text",
                      text: settings.opt_in_response_text,
                      attachment_path: settings.opt_in_response_attachment_path ?? null,
                      attachment_filename: settings.opt_in_response_attachment_filename ?? null,
                    }}
                    onSave={onUpdate}
                    projectId={activeProjectId}
                  />
                </Dialog>
              </div>
            </div>
            <ChatBubblePreview
              text={settings.opt_in_response_text}
              type={settings.opt_in_response_type}
              attachmentFilename={settings.opt_in_response_attachment_filename}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const TIMEZONES = [
  "UTC",
  "Asia/Calcutta",
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
];

function AutomationTab({
  activeProjectId,
  settings,
  settingsLoading,
  settingsSaving,
  onUpdate,
  onRefresh,
  refreshingSettings,
}: {
  activeProjectId: string | null;
  settings: WhatsAppSettings | null;
  settingsLoading: boolean;
  settingsSaving: boolean;
  onUpdate: (u: Partial<WhatsAppSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
  refreshingSettings: boolean;
}) {
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [offHoursDialogOpen, setOffHoursDialogOpen] = useState(false);
  const [workingHours, setWorkingHours] = useState<Record<string, { enabled: boolean; from?: string; to?: string }>>(
    settings?.working_hours ?? {}
  );

  useEffect(() => {
    setWorkingHours(settings?.working_hours ?? {});
  }, [settings]);

  if (!activeProjectId) return null;
  if (settingsLoading || !settings) {
    return <LoadingState message="Loading settings…" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Stored in Habiv only. Use <strong>Refresh</strong> to load changes made from another device or tab.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshingSettings}
        >
          {refreshingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">{refreshingSettings ? "Refreshing…" : "Refresh settings"}</span>
        </Button>
      </div>
      <Card className="bg-white dark:bg-gray-900">
        <CardContent className="flex flex-row items-center justify-between gap-4 pt-6">
          <div>
            <p className="font-medium">Auto Resolve Chats</p>
            <p className="text-sm text-muted-foreground">Disable auto resolve intervened chats.</p>
          </div>
          <Switch
            checked={settings.auto_resolve_chats}
            onCheckedChange={(checked) => onUpdate({ auto_resolve_chats: checked })}
          />
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base">Automated Messages</CardTitle>
          <CardDescription>Welcome and off-hours replies for first-time messages.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="flex items-center gap-1">
                  <MessageSquareQuote className="h-4 w-4" />
                  Welcome Message
                </Label>
                <p className="text-xs text-muted-foreground">
                  Configure automated reply for user&apos;s first query during working hours.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.welcome_message_enabled}
                  onCheckedChange={(checked) => onUpdate({ welcome_message_enabled: checked })}
                />
                <Dialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <ResponseMessageConfigDialog
                    open={welcomeDialogOpen}
                    onOpenChange={setWelcomeDialogOpen}
                    title="Welcome Message"
                    description="Sent on first message during working hours."
                    slotKey="welcome_message"
                    current={{
                      type: (settings.welcome_message_type as WhatsAppMessageType) ?? "text",
                      text: settings.welcome_message_text,
                      attachment_path: settings.welcome_message_attachment_path ?? null,
                      attachment_filename: settings.welcome_message_attachment_filename ?? null,
                    }}
                    onSave={onUpdate}
                    projectId={activeProjectId}
                  />
                </Dialog>
              </div>
            </div>
            <ChatBubblePreview
              text={settings.welcome_message_text}
              type={settings.welcome_message_type}
              attachmentFilename={settings.welcome_message_attachment_filename}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="flex items-center gap-1">
                  <MessageSquareQuote className="h-4 w-4" />
                  Off Hours Message
                </Label>
                <p className="text-xs text-muted-foreground">
                  Configure automated reply for user&apos;s first query during off hours.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.off_hours_message_enabled}
                  onCheckedChange={(checked) => onUpdate({ off_hours_message_enabled: checked })}
                />
                <Dialog open={offHoursDialogOpen} onOpenChange={setOffHoursDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <ResponseMessageConfigDialog
                    open={offHoursDialogOpen}
                    onOpenChange={setOffHoursDialogOpen}
                    title="Off Hours Message"
                    description="Sent on first message outside working hours."
                    slotKey="off_hours_message"
                    current={{
                      type: (settings.off_hours_message_type as WhatsAppMessageType) ?? "text",
                      text: settings.off_hours_message_text,
                      attachment_path: settings.off_hours_message_attachment_path ?? null,
                      attachment_filename: settings.off_hours_message_attachment_filename ?? null,
                    }}
                    onSave={onUpdate}
                    projectId={activeProjectId}
                  />
                </Dialog>
              </div>
            </div>
            <ChatBubblePreview
              text={settings.off_hours_message_text}
              type={settings.off_hours_message_type}
              attachmentFilename={settings.off_hours_message_attachment_filename}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base">Working Hours</CardTitle>
          <CardDescription>Configure day-wise working hours for automated replies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label>Timezone</Label>
            <select
              className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm dark:border-gray-700"
              value={settings.timezone}
              onChange={(e) => onUpdate({ timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            {DAYS.map((day) => {
              const d = workingHours[day] ?? { enabled: false };
              return (
                <div key={day} className="flex flex-wrap items-center gap-3">
                  <Switch
                    checked={d.enabled}
                    onCheckedChange={(checked) => {
                      const next = { ...workingHours, [day]: { ...d, enabled: checked, from: d.from ?? "09:00", to: d.to ?? "18:00" } };
                      setWorkingHours(next);
                      onUpdate({ working_hours: next });
                    }}
                  />
                  <span className="capitalize w-24 text-sm">{day}</span>
                  {d.enabled ? (
                    <>
                      <Input
                        type="time"
                        className="w-32"
                        value={d.from ?? "09:00"}
                        onChange={(e) => {
                          const next = { ...workingHours, [day]: { ...d, from: e.target.value } };
                          setWorkingHours(next);
                          onUpdate({ working_hours: next });
                        }}
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        className="w-32"
                        value={d.to ?? "18:00"}
                        onChange={(e) => {
                          const next = { ...workingHours, [day]: { ...d, to: e.target.value } };
                          setWorkingHours(next);
                          onUpdate({ working_hours: next });
                        }}
                      />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
