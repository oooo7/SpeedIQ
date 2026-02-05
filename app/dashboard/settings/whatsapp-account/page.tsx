"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { WhatsAppIcon } from "@/components/whatsapp/whatsapp-connect-button";
import { useProjectContext } from "@/lib/projects/project-context";

interface WhatsAppOAuthConfig {
  appId: string;
  configId: string;
  solutionId?: string | null;
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
  };

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
        <h1 className="text-xl font-semibold">WhatsApp Account</h1>
        <p className="text-sm text-muted-foreground">Select a project to connect a WhatsApp Business account.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">WhatsApp Account</h1>
        <LoadingState message="Loading account…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">WhatsApp Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect a WhatsApp Business number to send campaigns and messages for this project.
        </p>
      </div>

      {account?.connected ? (
        <Card className="border border-gray-200 dark:border-gray-800">
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
              Click &quot;Refresh health&quot; to fetch the latest data from Meta. Some fields (e.g. verified name, status) only appear after a refresh.
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground font-medium">Phone number</dt>
              <dd className="font-mono tabular-nums">
                {formatDisplayPhone(account.phone_number)}
              </dd>

              <dt className="text-muted-foreground font-medium">Verified name</dt>
              <dd>{account.verified_name?.trim() || "—"}</dd>

              <dt className="text-muted-foreground font-medium">Display name (optional)</dt>
              <dd>{account.display_name?.trim() || "—"}</dd>

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

              <dt className="text-muted-foreground font-medium">Status</dt>
              <dd>{statusLabel(account.status)}</dd>

              <dt className="text-muted-foreground font-medium">Code verification</dt>
              <dd>{codeVerificationLabel(account.code_verification_status)}</dd>

              <dt className="text-muted-foreground font-medium">Platform</dt>
              <dd>{account.platform_type?.replace(/_/g, " ") ?? "—"}</dd>

              <dt className="text-muted-foreground font-medium">Tier</dt>
              <dd>{account.tier?.trim() || "—"}</dd>
            </dl>

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
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base">Send test message</CardTitle>
            <CardDescription>
              Same format as Meta dashboard. You must select a template — hello_world for testing or an approved template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendTest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-to">To (phone number) *</Label>
                <Input
                  id="test-to"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="e.g. 917470915225"
                />
              </div>
              <div className="space-y-2">
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
              <Button type="submit" disabled={testSending || !testTemplate} className="gap-1">
                {testSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send test message
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {!account?.connected && oauthConfig ? (
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle>Connect with WhatsApp</CardTitle>
            <CardDescription>
              Use Meta&apos;s secure login to connect your WhatsApp Business account in seconds. You&apos;ll be taken to a dedicated connect page (no auth required to load), then returned here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              asChild
              className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <Link
                href={`/auth/whatsapp/connect?projectId=${activeProject.id}&returnTo=${encodeURIComponent("/dashboard/settings/whatsapp-account")}`}
              >
                <WhatsAppIcon className="h-4 w-4" />
                Connect with WhatsApp
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              In Meta, add this single URL in <strong>Valid OAuth redirect URIs</strong>:{" "}
              <code className="break-all">{currentOrigin ? `${currentOrigin}/auth/whatsapp/connect` : "https://your-domain.com/auth/whatsapp/connect"}</code>
              {currentOrigin && (
                <Button variant="link" className="h-auto p-0 ml-1 text-xs" onClick={() => copyToClipboard(`${currentOrigin}/auth/whatsapp/connect`, "Redirect URI")}>
                  Copy
                </Button>
              )}
            </p>
            <Collapsible open={showDomainHelp} onOpenChange={setShowDomainHelp}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground text-xs p-0 h-auto">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDomainHelp ? "rotate-180" : ""}`} />
                  &quot;Can&apos;t load URL: domain isn&apos;t included&quot; — add your domain in all 3 places
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Meta checks your domain in <strong>three separate places</strong>. Use the same domain; for redirect URI use only the dedicated callback below.
                </p>
                {currentOrigin && (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Domain only (no https://):</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded break-all">{currentOrigin.replace(/^https?:\/\//, "")}</code>
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(currentOrigin.replace(/^https?:\/\//, ""), "Domain")}>
                        Copy
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">Valid OAuth redirect URI (single callback):</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded break-all">{currentOrigin}/auth/whatsapp/connect</code>
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => copyToClipboard(`${currentOrigin}/auth/whatsapp/connect`, "Redirect URI")}>
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>
                    <strong>Settings → Basic</strong> → <strong>App domains</strong>: add the <em>domain only</em>. No <code>https://</code> or path.
                  </li>
                  <li>
                    <strong>Facebook Login for Business</strong> → <strong>Settings</strong> → <strong>Client OAuth settings</strong> → <strong>Allowed domains</strong>: same <em>domain only</em>.
                  </li>
                  <li>
                    Same section → <strong>Valid OAuth redirect URIs</strong>: add exactly <code>{currentOrigin || "https://your-domain.com"}/auth/whatsapp/connect</code> (one URL for all environments).
                  </li>
                </ol>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ) : null}

      {!account?.connected && !oauthConfig ? (
        <Card className="border border-gray-200 dark:border-gray-800">
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
    </div>
  );
}
