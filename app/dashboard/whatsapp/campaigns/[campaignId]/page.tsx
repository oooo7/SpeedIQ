"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Calendar, Loader2, Pencil, RefreshCw, Send, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/dashboard/page-header";
import { useBreadcrumbOverride } from "@/lib/breadcrumb-override-context";
import { useProjectContext } from "@/lib/projects/project-context";

interface Template {
  id: string;
  name: string;
  body: string | null;
  status: string;
  language: string;
  category: string;
}

interface Recipient {
  id: string;
  contact_id: string;
  status: string;
  sent_at: string | null;
  error_code: string | null;
  retry_count: number | null;
  created_at: string;
  phone: string | null;
  contact_name: string | null;
}

interface CampaignDetail {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    template_id: string | null;
    use_hello_world?: boolean;
    status: string;
    scheduled_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  };
  template: Template | null;
  recipients: Recipient[];
  stats: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  sent: "secondary",
  delivered: "default",
  read: "default",
  failed: "destructive",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const { activeProject } = useProjectContext();
  const { setLastCrumbLabel } = useBreadcrumbOverride();
  const campaignId = params?.campaignId as string;
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTemplateId, setEditTemplateId] = useState("");
  const [editUseHelloWorld, setEditUseHelloWorld] = useState(false);
  const [editScheduleOption, setEditScheduleOption] = useState<"send_now" | "schedule" | "draft">("draft");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [triggering, setTriggering] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [debugResult, setDebugResult] = useState<{ sent: number; failed: number; errors: Array<{ phone: string; error: string }> } | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [sendingToContactId, setSendingToContactId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editContactIds, setEditContactIds] = useState<string[]>([]);
  const [editTagDefinitions, setEditTagDefinitions] = useState<Array<{ id: string; name: string; color: string | null; contact_count?: number }>>([]);
  const [editContacts, setEditContacts] = useState<Array<{ id: string; phone: string; name: string | null }>>([]);
  const [editRecipientsLoading, setEditRecipientsLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!activeProject?.id || !campaignId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${campaignId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json);
      setEditName(json.campaign?.name ?? "");
      setEditDescription(json.campaign?.description ?? "");
      setEditTemplateId(json.campaign?.template_id ?? "");
      setEditUseHelloWorld(!!json.campaign?.use_hello_world);
      setEditScheduleOption(
        json.campaign?.status === "scheduled" ? "schedule" : json.campaign?.status === "sending" ? "send_now" : "draft"
      );
      setEditScheduledAt(json.campaign?.scheduled_at ? new Date(json.campaign.scheduled_at).toISOString().slice(0, 16) : "");
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, campaignId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (data?.campaign?.name) {
      setLastCrumbLabel(data.campaign.name);
      return () => setLastCrumbLabel(null);
    }
  }, [data?.campaign?.name, setLastCrumbLabel]);

  useEffect(() => {
    if (!activeProject?.id || !editOpen) return;
    setEditRecipientsLoading(true);
    Promise.all([
      fetch(`/api/projects/${activeProject.id}/whatsapp/templates`).then((r) => r.json()).then((d) => setTemplates(d.templates ?? [])).catch(() => setTemplates([])),
      fetch(`/api/projects/${activeProject.id}/whatsapp/tag-definitions`).then((r) => r.json()).then((d) => setEditTagDefinitions(d?.tags ?? [])).catch(() => setEditTagDefinitions([])),
      fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?limit=200`).then((r) => r.json()).then((d) => setEditContacts(d.contacts ?? [])).catch(() => setEditContacts([])),
    ]).finally(() => setEditRecipientsLoading(false));
  }, [activeProject?.id, editOpen]);

  const openEdit = () => {
    if (data?.campaign) {
      setEditName(data.campaign.name);
      setEditDescription(data.campaign.description ?? "");
      setEditTemplateId(data.campaign.template_id ?? "");
      setEditUseHelloWorld(!!data.campaign.use_hello_world);
      setEditScheduleOption(
        data.campaign.status === "scheduled" ? "schedule" : data.campaign.status === "sending" ? "send_now" : "draft"
      );
      setEditScheduledAt(data.campaign.scheduled_at ? new Date(data.campaign.scheduled_at).toISOString().slice(0, 16) : "");
      setEditOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!activeProject?.id || !campaignId) return;
    if (data?.campaign.status !== "draft" && data?.campaign.status !== "scheduled" && data?.campaign.status !== "failed") {
      toast.error("Only draft, scheduled, or failed campaigns can be edited");
      return;
    }
    if (editScheduleOption === "schedule" && !editScheduledAt) {
      toast.error("Pick a date and time for scheduling");
      return;
    }
    const status =
      editScheduleOption === "send_now" ? "sending" : editScheduleOption === "schedule" ? "scheduled" : "draft";
    const scheduled_at = editScheduleOption === "schedule" ? editScheduledAt : null;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          template_id: editUseHelloWorld ? null : (editTemplateId || null),
          use_hello_world: editUseHelloWorld,
          status,
          scheduled_at,
          tag_ids: editTagIds,
          contact_ids: editContactIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update");
      toast.success("Campaign updated");
      setEditOpen(false);
      fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!activeProject?.id || !campaignId) return;
    const hasTemplate = data?.campaign?.use_hello_world || data?.campaign?.template_id;
    if (!hasTemplate) {
      toast.error("Add a template or enable the default hello_world template (Edit campaign) before you can send.");
      return;
    }
    if (!data?.campaign?.use_hello_world && data?.template?.status && data.template.status !== "approved") {
      toast.error("Only approved templates can be used for sending. Get your template approved first.");
      return;
    }
    if (data?.stats?.total === 0) {
      toast.error("Add at least one recipient first");
      return;
    }
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${campaignId}/send-now-debug`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Send failed");
        setDebugResult({
          sent: json.sent ?? 0,
          failed: json.failed ?? 0,
          errors: Array.isArray(json.errors) ? json.errors : [{ phone: "-", error: json.error ?? "Request failed" }],
        });
        fetchDetail();
        return;
      }
      setDebugResult({
        sent: json.sent ?? 0,
        failed: json.failed ?? 0,
        errors: Array.isArray(json.errors) ? json.errors : [],
      });
      const deferred = typeof json.deferred === "number" ? json.deferred : 0;
      if ((json.failed ?? 0) > 0) {
        toast.error(`${json.failed} failed. See results below.`);
      } else if ((json.sent ?? 0) > 0) {
        toast.success(
          deferred > 0
            ? `Sent ${json.sent}. ${deferred} more will send via cron within the next minute.`
            : `Sent ${json.sent} message(s).`
        );
      } else if (deferred > 0) {
        toast.success(`Campaign started. ${deferred} recipient${deferred === 1 ? "" : "s"} will send via cron within the next minute.`);
      }
      fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
      setDebugResult({ sent: 0, failed: 0, errors: [{ phone: "-", error: String(err) }] });
    } finally {
      setDebugLoading(false);
    }
  };

  const handleSendToContact = async (contactId: string) => {
    if (!activeProject?.id || !campaignId) return;
    if (!data?.campaign?.template_id) {
      toast.error("Add a template (Edit campaign) before you can send.");
      return;
    }
    setSendingToContactId(contactId);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${campaignId}/send-to`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(json.message ?? "Message sent to this contact.");
      } else {
        toast.error(json.error ?? json.error_code ?? "Send failed");
        setDebugResult((prev) => ({
          sent: prev?.sent ?? 0,
          failed: (prev?.failed ?? 0) + 1,
          errors: [...(prev?.errors ?? []), { phone: json.phone ?? contactId, error: json.error ?? json.error_code ?? "Unknown" }],
        }));
      }
      fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSendingToContactId(null);
    }
  };

  const handleCancel = async () => {
    if (!activeProject?.id || !campaignId) return;
    if (!confirm("Cancel this send? The campaign will move back to draft. Recipients already sent stay sent.")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${campaignId}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to cancel");
      toast.success("Campaign moved back to draft.");
      fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setCancelling(false);
    }
  };

  const handleScheduleLater = async () => {
    if (!activeProject?.id || !campaignId) return;
    const hasTemplate = data?.campaign?.use_hello_world || data?.campaign?.template_id;
    if (!hasTemplate) {
      toast.error("Add a template or enable the default hello_world template (Edit campaign) before you can schedule.");
      return;
    }
    if (!scheduleAt) {
      toast.error("Pick a date and time");
      return;
    }
    setTriggering(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled", scheduled_at: scheduleAt }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to schedule");
      toast.success("Campaign scheduled for " + new Date(scheduleAt).toLocaleString());
      setScheduleDialogOpen(false);
      setScheduleAt("");
      fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule");
    } finally {
      setTriggering(false);
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
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Campaign" description="Loading…" />
        <LoadingState message="Loading campaign…" />
      </div>
    );
  }

  const { campaign, template, recipients, stats } = data;
  const canEdit = campaign.status === "draft" || campaign.status === "scheduled" || campaign.status === "failed";
  const canSendOrSchedule = campaign.status === "draft" || campaign.status === "scheduled";
  const canCancel = campaign.status === "sending" || campaign.status === "scheduled";
  const hasTemplate = campaign.use_hello_world || campaign.template_id;
  const isStuckSending = (() => {
    if (campaign.status !== "sending") return false;
    if (stats.pending === 0) return false;
    const sinceIso = campaign.started_at ?? campaign.updated_at;
    if (!sinceIso) return false;
    const ageMs = Date.now() - new Date(sinceIso).getTime();
    return ageMs > 5 * 60 * 1000;
  })();
  const hasAlerts =
    (canSendOrSchedule && !hasTemplate) ||
    (canSendOrSchedule && hasTemplate && stats.total === 0) ||
    (!campaign.use_hello_world && template?.status !== "approved") ||
    stats.failed > 0 ||
    isStuckSending ||
    debugResult;

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-medium truncate">{campaign.name}</h1>
              <Badge variant={STATUS_VARIANTS[campaign.status] ?? "outline"} className="shrink-0">{campaign.status}</Badge>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={openEdit} className="gap-1 shrink-0">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {canSendOrSchedule && (
              <>
                <Button
                  onClick={handleSendNow}
                  disabled={debugLoading || stats.total === 0 || !hasTemplate || (!campaign.use_hello_world && template?.status !== "approved")}
                  className="gap-1"
                >
                  {debugLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send now
                </Button>
                {campaign.status === "draft" && (
                  <Button
                    variant="outline"
                    onClick={() => setScheduleDialogOpen(true)}
                    disabled={triggering || !hasTemplate}
                    className="gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule for later
                  </Button>
                )}
                {campaign.status === "scheduled" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setScheduleAt(campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : "");
                      setScheduleDialogOpen(true);
                    }}
                    disabled={triggering || !hasTemplate}
                    className="gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    Reschedule
                  </Button>
                )}
              </>
            )}
            {canCancel && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="gap-1"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                {campaign.status === "sending" ? "Cancel send" : "Cancel schedule"}
              </Button>
            )}
          </div>
        </div>
        {campaign.description && (
          <p className="text-sm text-muted-foreground max-w-2xl">{campaign.description}</p>
        )}
      </header>

      {/* Alerts: template approval, missing template/recipients, send results */}
      {hasAlerts && (
        <section className="space-y-3">
          {isStuckSending && (
            <div className="border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">
                    This campaign is taking longer than usual — {stats.pending} recipient{stats.pending === 1 ? "" : "s"} still pending after 5 minutes.
                  </p>
                  <p>
                    Click &quot;Cancel send&quot; above to move it back to draft, or contact support if the issue persists.
                  </p>
                </div>
              </div>
            </div>
          )}
          {canSendOrSchedule && !hasTemplate && (
            <div className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Add a template or enable the default hello_world template (Edit campaign) before you can send or schedule.
            </div>
          )}
          {canSendOrSchedule && hasTemplate && stats.total === 0 && (
            <div className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Add at least one recipient before you can send or schedule. Open Edit and select one or more tags under Recipients.
            </div>
          )}
          {canSendOrSchedule && campaign.template_id && !campaign.use_hello_world && template?.status !== "approved" && (
            <div className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Approve the template first to send. Use the Templates page to submit your draft for approval.
            </div>
          )}
          {(stats.failed > 0 || debugResult) && (
            <div className={`border px-4 py-4 ${debugResult && debugResult.failed > 0 ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30" : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30"}`}>
              <h3 className="text-sm font-medium mb-2">Send results</h3>
              {(recipients.some((r) => r.status === "failed" && (String(r.error_code ?? "").includes("132001") || String(r.error_code ?? "").includes("Template name does not exist"))) ||
                debugResult?.errors?.some((e) => String(e.error).includes("132001") || String(e.error).includes("Template name does not exist"))) && (
                <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                  <strong>Template not found in WhatsApp.</strong> The template is not approved or doesn&apos;t exist in your WhatsApp Business Account. Approve it in Meta Business Manager or choose another template in Edit campaign.
                </p>
              )}
              {recipients.filter((r) => r.status === "failed").length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Failed recipients:</p>
                  <ul className="text-sm list-disc list-inside">
                    {recipients
                      .filter((r) => r.status === "failed")
                      .map((r) => (
                        <li key={r.id}>
                          {r.phone ?? r.contact_name ?? r.contact_id}: {r.error_code ?? "Unknown error"}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {debugResult && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">
                    Last run: {debugResult.sent} sent, {debugResult.failed} failed
                  </p>
                  {debugResult.errors.length > 0 ? (
                    <pre className="text-xs bg-white dark:bg-black/20 p-2 border border-gray-200 dark:border-gray-800 overflow-auto max-h-40">
                      {debugResult.errors.map((e) => `${e.phone}: ${e.error}`).join("\n")}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No errors from last run.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Overview metrics */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total recipients</p>
              <p className="text-2xl font-medium mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sent</p>
              <p className="text-2xl font-medium mt-1">{stats.sent + stats.delivered + stats.read}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivered / Read</p>
              <p className="text-2xl font-medium mt-1">{stats.delivered + stats.read}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Failed</p>
              <p className="text-2xl font-medium mt-1">{stats.failed}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Details + Recipients: two-column on large screens */}
      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-5 xl:col-span-4">
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">

              <div className="flex flex-row items-center gap-2 justify-between">
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Template Name</p>

              {template && (
                  <Badge variant="outline" className="text-xs">{template.status}</Badge>
                )}

               
              </div>
              <p className="font-medium text-sm">
                {template ? (campaign.use_hello_world ? `${template.name} (default)` : template.name) : "—"}
              </p>

              {template?.body && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Message preview</p>
                  <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-3 text-muted-foreground whitespace-pre-wrap">
                    {template.body}
                  </div>
                </div>
              )}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 divide-y divide-gray-100 dark:divide-gray-800">
                <p className="py-2 first:pt-0 last:pb-0"><span className="text-muted-foreground">Created</span> {new Date(campaign.created_at).toLocaleString()}</p>
                {campaign.scheduled_at && (
                  <p className="py-2 last:pb-0"><span className="text-muted-foreground">Scheduled</span> {new Date(campaign.scheduled_at).toLocaleString()}</p>
                )}
                {campaign.started_at && (
                  <p className="py-2 last:pb-0"><span className="text-muted-foreground">Started</span> {new Date(campaign.started_at).toLocaleString()}</p>
                )}
                {campaign.completed_at && (
                  <p className="py-2 last:pb-0"><span className="text-muted-foreground">Completed</span> {new Date(campaign.completed_at).toLocaleString()}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-7 xl:col-span-8">
          <Card className="bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-base">Recipients ({recipients.length})</CardTitle>
             
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Contact</th>
                      <th className="text-left p-3 font-medium">Phone</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Retries</th>
                      <th className="text-left p-3 font-medium">Sent at</th>
                      <th className="text-left p-3 font-medium">Error</th>
                      <th className="text-left p-3 font-medium w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No recipients.
                        </td>
                      </tr>
                    ) : (
                      recipients.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                        >
                          <td className="p-3">{r.contact_name ?? "—"}</td>
                          <td className="p-3">{r.phone ?? "—"}</td>
                          <td className="p-3">
                            <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}>{r.status}</Badge>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {r.retry_count ?? 0}
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                          </td>
                          <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={r.error_code ?? undefined}>
                            {r.error_code ?? "—"}
                          </td>
                          <td className="p-3">
                            {r.status === "pending" && canSendOrSchedule && hasTemplate ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={sendingToContactId === r.contact_id}
                                onClick={() => handleSendToContact(r.contact_id)}
                                className="gap-1"
                              >
                                {sendingToContactId === r.contact_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Send className="h-3.5 w-3.5" />
                                )}
                                Send
                              </Button>
                            ) : r.status === "failed" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={sendingToContactId === r.contact_id}
                                onClick={() => handleSendToContact(r.contact_id)}
                                className="gap-1"
                                title="Retry sending to this contact"
                              >
                                {sendingToContactId === r.contact_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5" />
                                )}
                                Retry
                              </Button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{campaign.status === "scheduled" ? "Reschedule campaign" : "Schedule for later"}</DialogTitle>
            <DialogDescription>
              Choose when the campaign should be sent. The send job will run at the scheduled time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-at">Date & time</Label>
              <Input
                id="schedule-at"
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleLater} disabled={!scheduleAt || triggering}>
              {triggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scheduling…
                </>
              ) : (
                "Schedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="p-6 pb-4 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit campaign</DialogTitle>
              <DialogDescription>
                Change name, description, template, recipients, or when to send. Save to update.
              </DialogDescription>
            </DialogHeader>
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Campaign name"
                    required
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc">Description</Label>
                  <Input
                    id="edit-desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Internal note"
                    className="h-10"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Template */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Template</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer border border-gray-200 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <input
                    type="checkbox"
                    checked={editUseHelloWorld}
                    onChange={(e) => setEditUseHelloWorld(e.target.checked)}
                  />
                  <div>
                    <span className="text-sm font-medium">Use default Hello World template</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send Meta&apos;s built-in &quot;Hello World&quot; message to all recipients for testing.
                    </p>
                  </div>
                </label>
                <div className="space-y-2">
                  <Label htmlFor="edit-template">Custom template</Label>
                  <select
                    id="edit-template"
                    value={editTemplateId}
                    onChange={(e) => setEditTemplateId(e.target.value)}
                    disabled={editUseHelloWorld}
                    className="flex h-10 w-full max-w-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No template</option>
                    {templates.filter((t) => t.status === "approved").map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    {templates.filter((t) => t.status !== "approved").map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <Separator />

            {/* Recipients */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recipients</h3>
              <p className="text-sm text-muted-foreground">
                Add recipients by selecting tags and/or individual contacts. Contacts from tags and the manual list are combined. Save to update the recipient list.
              </p>

              {editRecipientsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading tags and contacts…
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* By tags */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-base font-medium">By tags</Label>
                      {editTagDefinitions.length > 0 && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditTagIds(editTagDefinitions.map((t) => t.id))}
                          >
                            Select all
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditTagIds([])}
                          >
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>
                    {editTagDefinitions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No tags yet. Create tags in Settings → Tags first.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/30">
                        {editTagDefinitions.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 cursor-pointer shrink-0">
                            <Checkbox
                              checked={editTagIds.includes(t.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setEditTagIds((prev) => [...prev, t.id]);
                                else setEditTagIds((prev) => prev.filter((id) => id !== t.id));
                              }}
                            />
                            <span className="text-sm whitespace-nowrap">
                              {t.name}
                              {typeof t.contact_count === "number" && (
                                <span className="text-muted-foreground ml-1">({t.contact_count})</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual contacts */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Add contacts manually</Label>
                    {editContacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No contacts in this project yet.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-800 p-3 space-y-1.5 bg-gray-50 dark:bg-gray-900/30">
                        {editContacts.slice(0, 100).map((c) => (
                          <label key={c.id} className="flex items-center gap-2 cursor-pointer py-1">
                            <Checkbox
                              checked={editContactIds.includes(c.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setEditContactIds((prev) => [...prev, c.id]);
                                else setEditContactIds((prev) => prev.filter((id) => id !== c.id));
                              }}
                            />
                            <span className="text-sm truncate">{c.name || c.phone || c.id}</span>
                            <span className="text-xs text-muted-foreground truncate">{c.phone}</span>
                          </label>
                        ))}
                        {editContacts.length > 100 && (
                          <p className="text-xs text-muted-foreground pt-1">Showing first 100. Use tags to target more.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <Separator />

            {/* When to send */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">When to send</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={editScheduleOption === "draft"} onChange={() => setEditScheduleOption("draft")} />
                  <span className="text-sm font-medium">Keep as draft</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={editScheduleOption === "send_now"} onChange={() => setEditScheduleOption("send_now")} />
                  <span className="text-sm font-medium">Send now</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={editScheduleOption === "schedule"} onChange={() => setEditScheduleOption("schedule")} />
                  <span className="text-sm font-medium">Schedule for later</span>
                </label>
                {editScheduleOption === "schedule" && (
                  <div className="pl-6 pt-1">
                    <Input
                      type="datetime-local"
                      value={editScheduledAt}
                      onChange={(e) => setEditScheduledAt(e.target.value)}
                      className="h-10 max-w-xs"
                    />
                  </div>
                )}
              </div>
            </section>
          </div>

          <Separator />
          <DialogFooter className="p-6 shrink-0">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
