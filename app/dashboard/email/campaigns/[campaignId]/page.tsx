"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { useBreadcrumbOverride } from "@/lib/breadcrumb-override-context";
import { useProjectContext } from "@/lib/projects/project-context";

interface Recipient {
  id: string;
  subscriber_id: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
  email: string | null;
  subscriber_name: string | null;
}

interface CampaignDetail {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    template_id: string | null;
    status: string;
    scheduled_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
  };
  template: { id: string; name: string; subject: string; body_html: string | null } | null;
  recipients: Recipient[];
  stats: { total: number; pending: number; sent: number; failed: number };
  effective_from?: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  sent: "default",
  failed: "destructive",
  bounced: "secondary",
};

export default function EmailCampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const { setLastCrumbLabel } = useBreadcrumbOverride();
  const campaignId = params?.campaignId as string;
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingSubscriberId, setSendingSubscriberId] = useState<string | null>(null);

  const fetchDetail = useCallback(
    async (silent = false) => {
      if (!activeProject?.id || !campaignId) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/email/campaigns/${campaignId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        setData(json);
      } catch {
        if (!silent) setData(null);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeProject?.id, campaignId]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Poll when campaign is sending so status and recipient counts/errors update after cron runs
  useEffect(() => {
    if (!activeProject?.id || !campaignId || data?.campaign?.status !== "sending") return;
    const interval = setInterval(() => fetchDetail(true), 6000);
    return () => clearInterval(interval);
  }, [activeProject?.id, campaignId, data?.campaign?.status, fetchDetail]);

  useEffect(() => {
    if (data?.campaign?.name) {
      setLastCrumbLabel(data.campaign.name);
      return () => setLastCrumbLabel(null);
    }
  }, [data?.campaign?.name, setLastCrumbLabel]);

  const handleSendNow = async () => {
    if (!activeProject?.id || !campaignId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/campaigns/${campaignId}/send-to`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriber_ids: [], send_now: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start");
      const sent = typeof json.sent === "number" ? json.sent : 0;
      const failed = typeof json.failed === "number" ? json.failed : 0;
      if (sent > 0 && failed === 0) {
        toast.success(`Sent ${sent} email${sent === 1 ? "" : "s"}`);
      } else if (sent > 0 && failed > 0) {
        toast.warning(`Sent ${sent}, ${failed} failed — check Error column`);
      } else if (failed > 0) {
        toast.error(`${failed} failed — check Error column`);
      } else {
        toast.success("Campaign sent");
      }
      fetchDetail(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start");
    } finally {
      setSending(false);
    }
  };

  const handleSendToOne = async (subscriberId: string) => {
    if (!activeProject?.id || !campaignId) return;
    setSendingSubscriberId(subscriberId);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/email/campaigns/${campaignId}/send-one`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriber_id: subscriberId }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Email sent");
        fetchDetail(true);
      } else {
        const errMsg = json.error ?? "Send failed";
        const isDomainError = errMsg.includes("sending domain is not verified") || errMsg.includes("Go to Email settings");
        toast.error(errMsg, {
          ...(isDomainError && {
            action: {
              label: "Email settings",
              onClick: () => router.push("/dashboard/settings/email"),
            },
          }),
        });
        fetchDetail(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
      fetchDetail(true);
    } finally {
      setSendingSubscriberId(null);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Campaign" description="Select a project." />
      </div>
    );
  }

  if (loading || !data) {
    return <LoadingState message={loading ? "Loading campaign…" : "Campaign not found."} />;
  }

  const { campaign, template, recipients, stats, effective_from } = data;
  const isDraft = campaign.status === "draft";

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={campaign.name}
          description={campaign.description ?? "Email campaign"}
        />
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {effective_from && (
            <p className="text-xs text-muted-foreground">
              Sending from: <span className="font-mono">{effective_from}</span>
            </p>
          )}
          <Badge variant={STATUS_VARIANTS[campaign.status] ?? "outline"}>{campaign.status}</Badge>
          {campaign.status === "sending" && (
            <span className="text-xs text-muted-foreground">
              Sending in background — this page updates every few seconds.
            </span>
          )}
          {isDraft && stats.total > 0 && (
            <Button onClick={handleSendNow} disabled={sending} className="gap-1">
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send now
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/email/campaigns">Back to campaigns</Link>
          </Button>
        </div>
      </div>

      {(stats.sent > 0 || stats.failed > 0) && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-sm">
          <span className="font-medium">Summary:</span>{" "}
          {stats.sent > 0 && (
            <span className="text-green-600 dark:text-green-500">{stats.sent} sent</span>
          )}
          {stats.sent > 0 && stats.failed > 0 && " • "}
          {stats.failed > 0 && (
            <span className="text-red-600 dark:text-red-500">{stats.failed} failed</span>
          )}
          {stats.pending > 0 && (
            <>
              {" • "}
              <span className="text-muted-foreground">{stats.pending} pending</span>
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recipients</p>
            <p className="text-2xl font-medium tabular-nums mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sent</p>
            <p className="text-2xl font-medium tabular-nums mt-1">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-medium tabular-nums mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</p>
            <p className="text-2xl font-medium tabular-nums mt-1">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {template && (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Template</CardTitle>
            <p className="text-sm text-muted-foreground">{template.name}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm font-medium">Subject: {template.subject}</p>
            {template.body_html && (
              <div
                className="mt-3 p-4 border border-gray-200 dark:border-gray-800 text-sm prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: template.body_html.slice(0, 500) + (template.body_html.length > 500 ? "…" : "") }}
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-base">Recipients</CardTitle>
          <p className="text-sm text-muted-foreground">
            {recipients.length} recipient(s)
            {stats.failed > 0 && (
              <span className="text-red-600 dark:text-red-400 ml-2">
                — {stats.failed} failed
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Sent at</th>
                  <th className="text-left p-3 font-medium">Error</th>
                  <th className="text-right p-3 font-medium w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="p-3">{r.email ?? "—"}</td>
                    <td className="p-3">{r.subscriber_name ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>{r.status}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[320px]">
                      {r.status === "failed" && r.error_message ? (
                        <span className="text-red-600 dark:text-red-400 text-xs block break-words" title={r.error_message}>
                          {r.error_message}
                          {(r.error_message.includes("sending domain is not verified") || r.error_message.includes("Go to Email settings")) && (
                            <>
                              {" "}
                              <Link
                                href="/dashboard/settings/email"
                                className="underline font-medium text-foreground hover:no-underline"
                              >
                                Go to Email settings →
                              </Link>
                            </>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {r.status === "pending" && campaign.template_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sendingSubscriberId === r.subscriber_id}
                          onClick={() => handleSendToOne(r.subscriber_id)}
                          className="gap-1"
                        >
                          {sendingSubscriberId === r.subscriber_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Send
                        </Button>
                      )}
                      {r.status === "failed" && campaign.template_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sendingSubscriberId === r.subscriber_id}
                          onClick={() => handleSendToOne(r.subscriber_id)}
                          className="gap-1"
                          title="Retry sending to this contact"
                        >
                          {sendingSubscriberId === r.subscriber_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Retry
                        </Button>
                      )}
                      {r.status === "sent" && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
