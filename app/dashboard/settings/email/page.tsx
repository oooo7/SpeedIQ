"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";

interface DnsRecord {
  record: string;
  name: string;
  type: string;
  value: string;
  ttl?: string;
  status?: string;
  priority?: number;
}

interface Settings {
  from_email: string;
  domain_verified: boolean;
  verification_status: "none" | "pending" | "verified";
  resend_domain_id: string | null;
  fallback_local_part: string;
  use_custom_from: boolean;
}

type EmailChoice = "platform" | "custom";

export default function EmailSettingsPage() {
  const { activeProject } = useProjectContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [choice, setChoice] = useState<EmailChoice>("platform");
  const [fallback_local_part, setFallbackLocalPart] = useState("");
  const [from_email, setFromEmail] = useState("");
  const [verification_status, setVerificationStatus] = useState<Settings["verification_status"]>("none");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [fallbackDomain, setFallbackDomain] = useState("send.habiv.com");
  const [refreshingVerification, setRefreshingVerification] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/settings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      if (data.fallback_domain) setFallbackDomain(data.fallback_domain);
      const s: Settings = data.settings;
      setFallbackLocalPart(s.fallback_local_part ?? "");
      setFromEmail(s.from_email ?? "");
      setVerificationStatus(s.verification_status ?? "none");
      setChoice(s.use_custom_from ? "custom" : "platform");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  const fetchVerification = useCallback(async (silent = false) => {
    if (!activeProject?.id) return;
    if (!silent) setRefreshingVerification(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/verify-domain`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setVerificationStatus(data.verification_status ?? "none");
      if (data.records?.length) setDnsRecords(data.records);
      if (data.verification_status === "verified" && !silent) {
        toast.success("Domain is verified.");
        fetchSettings();
      }
    } catch {
      if (!silent) toast.error("Could not check verification status");
    } finally {
      if (!silent) setRefreshingVerification(false);
    }
  }, [activeProject?.id, fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // When custom domain is selected and we have a from_email, re-check verification status on load (GET verify-domain hits Resend and can update DB).
  useEffect(() => {
    if (activeProject?.id && choice === "custom" && from_email.trim()) {
      fetchVerification(true);
    }
  }, [activeProject?.id, choice, from_email, fetchVerification]);

  const saveSettings = useCallback(
    async (updates: { from_email?: string | null; fallback_local_part?: string | null; use_custom_from?: boolean }) => {
      if (!activeProject?.id) return;
      const res = await fetch(`/api/projects/${activeProject.id}/email/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_email: updates.from_email !== undefined ? updates.from_email : from_email.trim() || null,
          fallback_local_part: updates.fallback_local_part !== undefined ? updates.fallback_local_part : fallback_local_part.trim() || null,
          use_custom_from: updates.use_custom_from !== undefined ? updates.use_custom_from : choice === "custom",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      return data;
    },
    [activeProject?.id, from_email, fallback_local_part, choice]
  );

  const handleSavePlatform = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    setSaving(true);
    try {
      await saveSettings({
        fallback_local_part: fallback_local_part.trim() || null,
        use_custom_from: false,
      });
      toast.success("Platform address saved. Emails will send from this address.");
      fetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyCustom = async () => {
    if (!activeProject?.id) return;
    const email = from_email.trim();
    if (!email) {
      toast.error("Enter your from email address first.");
      return;
    }
    setVerifying(true);
    try {
      await saveSettings({
        from_email: email,
        use_custom_from: true,
      });
      const res = await fetch(`/api/projects/${activeProject.id}/email/verify-domain`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to verify");
      setVerificationStatus(data.verification_status ?? "pending");
      if (data.records?.length) setDnsRecords(data.records);
      if (data.verification_status === "verified") {
        toast.success("Domain verified. Emails will send from your address.");
        fetchSettings();
      } else {
        toast.success("Domain registered. Add the DNS records below and click Verify again.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify");
    } finally {
      setVerifying(false);
    }
  };

  const handleSwitchToCustom = async () => {
    if (choice === "custom") return;
    setChoice("custom");
    if (!activeProject?.id) return;
    try {
      await saveSettings({ use_custom_from: true });
      fetchSettings();
    } catch {
      setChoice("platform");
    }
  };

  const handleSwitchToPlatform = async () => {
    setChoice("platform");
    setDnsRecords([]);
    if (!activeProject?.id) return;
    try {
      await saveSettings({ use_custom_from: false });
      fetchSettings();
    } catch {
      // ignore
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(text);
    toast.success("Copied");
    setTimeout(() => setCopiedValue(null), 2000);
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Email settings" description="Select a project to configure email." />
      </div>
    );
  }

  if (loading) {
    return <LoadingState message="Loading email settings…" />;
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Email settings"
        description="All campaign emails use the option below: platform address when off, your custom domain when on (and verified)."
      />

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base">Send campaign emails from</CardTitle>
          <CardDescription>
            Choose one. Only the selected option is used for all sending; when &quot;My domain&quot; is on, we show the custom domain form below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => choice !== "platform" && handleSwitchToPlatform()}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border transition-colors ${
                choice === "platform"
                  ? "border-gray-900 dark:border-gray-200 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              Platform address
            </button>
            <button
              type="button"
              onClick={() => choice !== "custom" && handleSwitchToCustom()}
              className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border transition-colors ${
                choice === "custom"
                  ? "border-gray-900 dark:border-gray-200 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              My domain
            </button>
          </div>
        </CardContent>
      </Card>

      {choice === "platform" && (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Platform address
            </CardTitle>
            <CardDescription>
              With &quot;Platform address&quot; selected, all campaign emails send from this address. No verification needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePlatform} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fallback_local_part">Address</Label>
                <div className="flex flex-wrap items-center gap-2 max-w-md">
                  <Input
                    id="fallback_local_part"
                    type="text"
                    value={fallback_local_part}
                    onChange={(e) => setFallbackLocalPart(e.target.value)}
                    placeholder="e.g. acme or campaigns"
                    className="flex-1 min-w-[140px] font-mono"
                    maxLength={64}
                  />
                  <span className="text-muted-foreground text-sm whitespace-nowrap">@{fallbackDomain}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, dots, hyphens, underscores only. Leave empty to use an auto-generated address.
                </p>
                {fallback_local_part.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Emails will send from: <strong className="font-mono">{fallback_local_part.trim().toLowerCase()}@{fallbackDomain}</strong>
                  </p>
                )}
              </div>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save platform address"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {choice === "custom" && (
        <>
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-lg">Custom domain</CardTitle>
              <CardDescription>
                With &quot;My domain&quot; on, all campaign emails are sent from the address below once verified. Use a domain you own (e.g. campaigns@yourcompany.com). Until verified, the platform address is used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="from_email">From email address</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={from_email}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="e.g. campaigns@yourcompany.com"
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  Use a domain you own (not free email providers). Click Verify below to save and get DNS instructions.
                </p>
                {verification_status === "verified" && (
                  <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Domain verified — emails send from this address
                  </p>
                )}
                {verification_status === "pending" && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Add the DNS records below, then click Refresh or Verify again.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={verifying || !from_email.trim()}
                  onClick={handleVerifyCustom}
                  className="gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : verification_status === "none" ? (
                    "Save and verify domain"
                  ) : verification_status === "pending" ? (
                    "Verify domain again"
                  ) : (
                    "Re-verify domain"
                  )}
                </Button>
                {(verification_status === "pending" || verification_status === "verified") && from_email.trim() && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={refreshingVerification}
                    onClick={() => fetchVerification(false)}
                    className="gap-2"
                  >
                    {refreshingVerification ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh status
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {dnsRecords.length > 0 && verification_status === "pending" && (
            <>
              <Card className="bg-white dark:bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-base">How to add DNS records</CardTitle>
                  <CardDescription>
                    Add the records below in your domain&apos;s DNS settings so we can verify you own the domain. Changes can take a few minutes to propagate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Log in to your domain provider (where you bought the domain, e.g. GoDaddy, Namecheap, Cloudflare, Google Domains).</li>
                    <li>Open the DNS or DNS management section for this domain.</li>
                    <li>Add a new record for each row in the table below: choose the <strong className="text-foreground">Type</strong>, set <strong className="text-foreground">Name</strong> (or Host) and <strong className="text-foreground">Value</strong> exactly as shown. You can copy the Value with the copy button.</li>
                    <li>Save the DNS changes. Wait 5–15 minutes for propagation.</li>
                    <li>Click <strong className="text-foreground">Refresh status</strong> or <strong className="text-foreground">Verify domain again</strong> above to re-check. When verification succeeds, you can send from this address.</li>
                  </ol>
                </CardContent>
              </Card>
              <Card className="bg-white dark:bg-gray-900">
                <CardHeader>
                  <CardTitle className="text-base">DNS records to add</CardTitle>
                  <CardDescription>
                    Copy each value and add a matching record in your DNS. After adding, wait a few minutes and click Refresh status or Verify domain again.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200 dark:border-gray-800">
                        <tr>
                          <th className="text-left p-2 font-medium">Type</th>
                          <th className="text-left p-2 font-medium">Name</th>
                          <th className="text-left p-2 font-medium">Value</th>
                          <th className="w-10 p-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {dnsRecords.map((r, i) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50">
                            <td className="p-2 font-mono">{r.type}</td>
                            <td className="p-2 font-mono break-all">{r.name}</td>
                            <td className="p-2 font-mono break-all max-w-[300px]">{r.value}</td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => copyToClipboard(r.value)}
                              >
                                {copiedValue === r.value ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
