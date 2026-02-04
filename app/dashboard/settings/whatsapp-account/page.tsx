"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { useProjectContext } from "@/lib/projects/project-context";

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
  connected: boolean;
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
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-500" />
              <CardTitle>Connected</CardTitle>
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
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm">
              {account.phone_number && (
                <p>
                  <span className="text-muted-foreground">Phone:</span> {account.phone_number}
                </p>
              )}
              {account.display_name && (
                <p>
                  <span className="text-muted-foreground">Display name:</span> {account.display_name}
                </p>
              )}
              {account.quality_rating && (
                <p>
                  <span className="text-muted-foreground">Quality:</span>{" "}
                  <span
                    className={
                      account.quality_rating === "GREEN"
                        ? "text-green-600 dark:text-green-500"
                        : account.quality_rating === "YELLOW"
                          ? "text-amber-600 dark:text-amber-500"
                          : "text-red-600 dark:text-red-500"
                    }
                  >
                    {account.quality_rating}
                  </span>
                </p>
              )}
              {account.quality_rating && account.quality_rating !== "GREEN" && (
                <p className="text-xs text-muted-foreground">
                  Keep response times low and avoid user reports to improve quality rating.
                </p>
              )}
              {account.tier && (
                <p>
                  <span className="text-muted-foreground">Tier:</span> {account.tier}
                </p>
              )}
            </div>
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

      {!account?.connected ? (
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
    </div>
  );
}
