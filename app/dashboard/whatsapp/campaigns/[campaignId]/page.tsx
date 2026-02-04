"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Loader2, Pencil, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const campaignId = params?.campaignId as string;
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTemplateId, setEditTemplateId] = useState("");
  const [editScheduleOption, setEditScheduleOption] = useState<"send_now" | "schedule" | "draft">("draft");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [triggering, setTriggering] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [debugResult, setDebugResult] = useState<{ sent: number; failed: number; errors: Array<{ phone: string; error: string }> } | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [sendingToContactId, setSendingToContactId] = useState<string | null>(null);

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
    if (!activeProject?.id || !editOpen) return;
    fetch(`/api/projects/${activeProject.id}/whatsapp/templates`)
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates ?? []))
      .catch(() => setTemplates([]));
  }, [activeProject?.id, editOpen]);

  const openEdit = () => {
    if (data?.campaign) {
      setEditName(data.campaign.name);
      setEditDescription(data.campaign.description ?? "");
      setEditTemplateId(data.campaign.template_id ?? "");
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
          template_id: editTemplateId || null,
          status,
          scheduled_at,
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
    if (!data?.campaign?.template_id) {
      toast.error("Add a template (Edit campaign) before you can send.");
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
      if ((json.failed ?? 0) > 0) {
        toast.error(`${json.failed} failed. See results below.`);
      } else if ((json.sent ?? 0) > 0) {
        toast.success(`Sent ${json.sent} message(s).`);
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

  const handleScheduleLater = async () => {
    if (!activeProject?.id || !campaignId) return;
    if (!data?.campaign?.template_id) {
      toast.error("Add a template (Edit campaign) before you can schedule.");
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
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Campaign</h1>
        <p className="text-sm text-muted-foreground">Select a project.</p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Campaign</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  const { campaign, template, recipients, stats } = data;
  const canEdit = campaign.status === "draft" || campaign.status === "scheduled" || campaign.status === "failed";
  const canSendOrSchedule = campaign.status === "draft" || campaign.status === "scheduled";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-xl font-semibold">{campaign.name}</h1>
          <Badge variant={STATUS_VARIANTS[campaign.status] ?? "outline"}>{campaign.status}</Badge>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={openEdit} className="gap-1">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
        {canSendOrSchedule && stats.total > 0 && campaign.template_id && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleSendNow}
              disabled={debugLoading || stats.total === 0}
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
                disabled={triggering}
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
                disabled={triggering}
                className="gap-1"
              >
                <Calendar className="h-4 w-4" />
                Reschedule
              </Button>
            )}
          </div>
        )}
      </div>

      {campaign.description && (
        <p className="text-sm text-muted-foreground">{campaign.description}</p>
      )}

      {canSendOrSchedule && !campaign.template_id && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Add a template (Edit campaign) before you can send or schedule this campaign.
        </p>
      )}
      {canSendOrSchedule && campaign.template_id && stats.total === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-500">
          Add at least one recipient (via Edit) before you can send or schedule this campaign.
        </p>
      )}

      {(stats.failed > 0 || debugResult) && (
        <div className={`rounded-lg border p-4 ${debugResult && debugResult.failed > 0 ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30" : "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30"}`}>
          <h2 className="text-sm font-medium mb-2">Send results</h2>
          {(recipients.some((r) => r.status === "failed" && (String(r.error_code ?? "").includes("132001") || String(r.error_code ?? "").includes("Template name does not exist"))) ||
            debugResult?.errors?.some((e) => String(e.error).includes("132001") || String(e.error).includes("Template name does not exist"))) && (
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
              <strong>Template not found in WhatsApp.</strong> The template you chose is not approved or doesn&apos;t exist in your WhatsApp Business Account. Approve your template in Meta Business Manager or choose another template in Edit campaign.
            </p>
          )}
          {recipients.filter((r) => r.status === "failed").length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Failed recipients (from DB):</p>
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
                <pre className="text-xs bg-white dark:bg-black/20 p-2 rounded border border-gray-200 dark:border-gray-800 overflow-auto max-h-40">
                  {debugResult.errors.map((e) => `${e.phone}: ${e.error}`).join("\n")}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">No errors from last run.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.sent + stats.delivered + stats.read}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered / Read</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.delivered + stats.read}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Details</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Template:</strong> {template ? `${template.name} (${template.status})` : "—"}</p>
          {template?.body && (
            <p className="mt-2"><strong>Template body:</strong> <span className="block mt-1 p-2 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">{template.body}</span></p>
          )}
          <p><strong>Created:</strong> {new Date(campaign.created_at).toLocaleString()}</p>
          {campaign.scheduled_at && (
            <p><strong>Scheduled:</strong> {new Date(campaign.scheduled_at).toLocaleString()}</p>
          )}
          {campaign.started_at && (
            <p><strong>Started:</strong> {new Date(campaign.started_at).toLocaleString()}</p>
          )}
          {campaign.completed_at && (
            <p><strong>Completed:</strong> {new Date(campaign.completed_at).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium">Recipients ({recipients.length})</h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
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
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recipients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
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
                        {r.status === "pending" && canSendOrSchedule && campaign.template_id ? (
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
        </div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
            <DialogDescription>
              Change name, description, template, or when to send. Draft and scheduled campaigns can be edited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Campaign name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Internal note"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-template">Template</Label>
              <select
                id="edit-template"
                value={editTemplateId}
                onChange={(e) => setEditTemplateId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-1 text-sm"
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
            <div className="space-y-2">
              <Label>When to send</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={editScheduleOption === "draft"}
                    onChange={() => setEditScheduleOption("draft")}
                  />
                  Keep as draft
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={editScheduleOption === "send_now"}
                    onChange={() => setEditScheduleOption("send_now")}
                  />
                  Send now
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={editScheduleOption === "schedule"}
                    onChange={() => setEditScheduleOption("schedule")}
                  />
                  Schedule for later
                </label>
                {editScheduleOption === "schedule" && (
                  <Input
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={(e) => setEditScheduledAt(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
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
