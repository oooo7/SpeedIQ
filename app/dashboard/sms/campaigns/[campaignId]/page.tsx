"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Pause, Play, RotateCcw, Send, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectContext } from "@/lib/projects/project-context";

type Recipient = {
  id: string;
  contact_id: string;
  status: string;
  sent_at: string | null;
  error_code: string | null;
  error_message: string | null;
  twilio_message_sid: string | null;
  sms_contacts?: { phone?: string; name?: string | null };
};

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  scheduled: "outline",
  sending: "default",
  paused: "outline",
  completed: "default",
  failed: "destructive",
  canceled: "destructive",
};

export default function SmsCampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const { activeProject } = useProjectContext();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    if (!activeProject?.id || !params?.campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sms/campaigns/${params.campaignId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load campaign");
      setCampaign(data.campaign ?? null);
      setRecipients(data.recipients ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, params?.campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    if (!campaign || campaign.status !== "sending") return;
    const id = setInterval(loadCampaign, 5000);
    return () => clearInterval(id);
  }, [campaign, loadCampaign]);

  async function runAction(action: string) {
    if (!activeProject?.id || !params?.campaignId) return;
    setActing(action);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/sms/campaigns/${params.campaignId}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      toast.success(actionLabel(action) + " ✓");
      loadCampaign();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(null);
    }
  }

  if (!activeProject) return <p className="text-sm text-muted-foreground">Select a project first.</p>;

  const status = campaign?.status ?? "draft";
  const counts = recipients.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === "pending" || r.status === "queued") acc.pending += 1;
      else if (r.status === "sent" || r.status === "delivered") acc.sent += 1;
      else if (r.status === "failed" || r.status === "undelivered") acc.failed += 1;
      return acc;
    },
    { total: 0, pending: 0, sent: 0, failed: 0 }
  );

  const canSendNow = ["draft", "scheduled", "paused"].includes(status);
  const canPause = ["sending", "scheduled"].includes(status);
  const canResume = status === "paused";
  const canCancel = !["completed", "failed", "canceled"].includes(status);
  const canRetry = counts.failed > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={campaign?.name ?? "SMS Campaign"}
          description={campaign?.description ?? undefined}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{status}</Badge>
          {canSendNow && (
            <Button size="sm" onClick={() => runAction("send_now")} disabled={acting !== null}>
              {acting === "send_now" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send now
            </Button>
          )}
          {canPause && (
            <Button size="sm" variant="outline" onClick={() => runAction("pause")} disabled={acting !== null}>
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
          )}
          {canResume && (
            <Button size="sm" onClick={() => runAction("resume")} disabled={acting !== null}>
              <Play className="mr-2 h-4 w-4" /> Resume
            </Button>
          )}
          {canRetry && (
            <Button size="sm" variant="outline" onClick={() => runAction("retry_failed")} disabled={acting !== null}>
              <RotateCcw className="mr-2 h-4 w-4" /> Retry failed
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="destructive" onClick={() => runAction("cancel")} disabled={acting !== null}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <StatCard label="Recipients" value={counts.total} />
        <StatCard label="Sent / delivered" value={counts.sent} />
        <StatCard label="Pending" value={counts.pending} />
        <StatCard label="Failed" value={counts.failed} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading recipients...</p>
      ) : (
        <div className="overflow-hidden border bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="p-3 text-left font-medium">Contact</th>
                <th className="p-3 text-left font-medium">Phone</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Sent at</th>
                <th className="p-3 text-left font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3">{r.sms_contacts?.name || "—"}</td>
                  <td className="p-3">{r.sms_contacts?.phone || "—"}</td>
                  <td className="p-3">
                    <Badge variant={recipientVariant(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{r.error_message || r.error_code || "—"}</td>
                </tr>
              ))}
              {recipients.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                    No recipients on this campaign.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function actionLabel(action: string) {
  switch (action) {
    case "send_now":
      return "Sending";
    case "pause":
      return "Paused";
    case "resume":
      return "Resumed";
    case "cancel":
      return "Canceled";
    case "retry_failed":
      return "Retrying failed";
    default:
      return "Done";
  }
}

function recipientVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "delivered" || status === "sent") return "default";
  if (status === "failed" || status === "undelivered") return "destructive";
  if (status === "pending" || status === "queued") return "outline";
  return "secondary";
}
