"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectContext } from "@/lib/projects/project-context";

interface Campaign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  template_name: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  recipient_count: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  pending_count: number;
}

interface Template {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  body: string | null;
}

interface Contact {
  id: string;
  phone: string;
  name: string | null;
}

interface Segment {
  id: string;
  name: string;
  filter_json: Record<string, unknown>;
}

const WIZARD_STEPS = ["Details", "Audience", "Template", "Schedule", "Review"];
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  scheduled: "secondary",
  sending: "default",
  completed: "default",
  failed: "destructive",
};

export default function WhatsAppCampaignsPage() {
  const { activeProject } = useProjectContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [audienceType, setAudienceType] = useState<"contacts" | "segment">("contacts");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [segmentId, setSegmentId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [scheduleOption, setScheduleOption] = useState<"send_now" | "schedule" | "draft">("send_now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setCampaigns(data.campaigns ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load campaigns");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (!activeProject?.id || !wizardOpen) return;
    (async () => {
      const [contactsRes, templatesRes, segmentsRes] = await Promise.all([
        fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?limit=500`),
        fetch(`/api/projects/${activeProject.id}/whatsapp/templates?status=approved`),
        fetch(`/api/projects/${activeProject.id}/whatsapp/segments`),
      ]);
      const contactsData = await contactsRes.json();
      const templatesData = await templatesRes.json();
      const segmentsData = await segmentsRes.json();
      setContacts(contactsData.contacts ?? []);
      setTemplates(templatesData.templates ?? []);
      setSegments(segmentsData.segments ?? []);
    })();
  }, [activeProject?.id, wizardOpen]);

  const openWizard = () => {
    setStep(0);
    setName("");
    setDescription("");
    setAudienceType("contacts");
    setSelectedContactIds([]);
    setSegmentId("");
    setTemplateId("");
    setScheduleOption("send_now");
    setScheduledAt("");
    setWizardOpen(true);
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const recipientCount =
    audienceType === "segment" && segmentId
      ? "Segment"
      : audienceType === "contacts"
        ? selectedContactIds.length
        : 0;

  const handleSendNow = async (c: Campaign) => {
    if (!activeProject?.id || c.status !== "draft") return;
    if ((c.recipient_count ?? 0) === 0) {
      toast.error("Add recipients in the campaign first");
      return;
    }
    setSendingId(c.id);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "sending", scheduled_at: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start");
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start campaign");
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (campaignId: string, campaignName: string) => {
    if (!activeProject?.id) return;
    if (!confirm(`Delete campaign "${campaignName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete campaign");
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    const isDraft = scheduleOption === "draft";
    if (!isDraft) {
      if (audienceType === "contacts" && selectedContactIds.length === 0) {
        toast.error("Select at least one contact");
        return;
      }
      if (audienceType === "segment" && !segmentId) {
        toast.error("Select a segment");
        return;
      }
    }
    if (scheduleOption === "schedule" && !scheduledAt) {
      toast.error("Pick a date and time for scheduling");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          template_id: templateId || null,
          contact_ids: audienceType === "contacts" ? selectedContactIds : [],
          segment_id: audienceType === "segment" ? segmentId : null,
          send_now: scheduleOption === "send_now",
          save_as_draft: isDraft,
          scheduled_at: scheduleOption === "schedule" ? scheduledAt || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");
      toast.success("Campaign created");
      setWizardOpen(false);
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create campaign");
    } finally {
      setSaving(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Select a project to manage campaigns.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Campaigns</h1>
        <Button onClick={openWizard} className="gap-1">
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sending">Sending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No campaigns yet. Create one to send broadcast messages, or save as draft to finish later. Use &quot;All statuses&quot; or &quot;Draft&quot; to see draft campaigns.
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-left p-3 font-medium">Template</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Recipients</th>
                  <th className="text-right p-3 font-medium">Sent</th>
                  <th className="text-right p-3 font-medium">Delivered</th>
                  <th className="text-right p-3 font-medium">Failed</th>
                  <th className="text-left p-3 font-medium">Scheduled</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="w-24 p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <td className="p-3">
                      <Link href={`/dashboard/whatsapp/campaigns/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={c.description ?? undefined}>
                      {c.description ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">{c.template_name ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={STATUS_VARIANTS[c.status] ?? "outline"}>{c.status}</Badge>
                    </td>
                    <td className="p-3 text-right">{c.recipient_count ?? 0}</td>
                    <td className="p-3 text-right">{c.sent_count ?? 0}</td>
                    <td className="p-3 text-right">{c.delivered_count ?? 0}</td>
                    <td className="p-3 text-right">{c.failed_count ?? 0}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {c.scheduled_at && !c.started_at
                        ? new Date(c.scheduled_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            Actions
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/whatsapp/campaigns/${c.id}`} className="flex items-center gap-2">
                              <Pencil className="h-4 w-4" />
                              View / Edit
                            </Link>
                          </DropdownMenuItem>
                          {c.status === "draft" && (c.recipient_count ?? 0) > 0 && c.template_id && (
                            <DropdownMenuItem
                              disabled={sendingId === c.id}
                              onClick={() => handleSendNow(c)}
                              className="gap-2"
                            >
                              {sendingId === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Send now
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(c.id, c.name)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
            <DialogDescription>
              Step {step + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[step]}
            </DialogDescription>
          </DialogHeader>

          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="camp-name">Campaign name *</Label>
                <Input
                  id="camp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Summer promo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp-desc">Description (internal)</Label>
                <Input
                  id="camp-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={audienceType === "contacts"}
                    onChange={() => setAudienceType("contacts")}
                  />
                  Select contacts
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={audienceType === "segment"}
                    onChange={() => setAudienceType("segment")}
                  />
                  Use segment
                </label>
              </div>
              {audienceType === "segment" && (
                <div className="space-y-2">
                  <Label>Segment</Label>
                  <select
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="">Choose segment</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {audienceType === "contacts" && (
                <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-800 rounded-md p-2">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No contacts. Add contacts first.</p>
                  ) : (
                    contacts.slice(0, 100).map((contact) => (
                      <label key={contact.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => toggleContact(contact.id)}
                        />
                        {contact.name || contact.phone} ({contact.phone})
                      </label>
                    ))
                  )}
                  {contacts.length > 100 && (
                    <p className="text-xs text-muted-foreground">Showing first 100. Use a segment for more.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label>Template (optional for now)</Label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-1 text-sm"
              >
                <option value="">No template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Create and get templates approved in Templates first.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scheduleOption === "send_now"}
                  onChange={() => setScheduleOption("send_now")}
                />
                Send now
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scheduleOption === "schedule"}
                  onChange={() => setScheduleOption("schedule")}
                />
                Schedule for later
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scheduleOption === "draft"}
                  onChange={() => setScheduleOption("draft")}
                />
                Save as draft
              </label>
              {scheduleOption === "schedule" && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled-at">Date & time</Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 text-sm">
              <p><strong>Name:</strong> {name || "—"}</p>
              <p><strong>Description:</strong> {description || "—"}</p>
              <p><strong>Audience:</strong> {audienceType === "segment" ? `Segment ${segmentId}` : `${selectedContactIds.length} contacts`}</p>
              <p><strong>Template:</strong> {templateId ? templates.find((t) => t.id === templateId)?.name ?? templateId : "None"}</p>
              <p><strong>When:</strong> {scheduleOption === "send_now" ? "Send now" : scheduleOption === "schedule" && scheduledAt ? new Date(scheduledAt).toLocaleString() : scheduleOption === "draft" ? "Save as draft" : "—"}</p>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step < WIZARD_STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={step === 0 && !name.trim()}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create campaign"
                  )}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={() => setWizardOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
