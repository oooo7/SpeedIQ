"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, FileText, LayoutTemplate, Loader2, Megaphone, Pencil, Plus, Send, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { useProjectContext } from "@/lib/projects/project-context";

interface Campaign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  template_name: string | null;
  template_status?: string | null;
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

const WIZARD_STEPS = [
  { title: "Details", icon: FileText },
  { title: "Audience", icon: Users },
  { title: "Template", icon: LayoutTemplate },
  { title: "Schedule", icon: Calendar },
  { title: "Review", icon: CheckCircle },
];
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
  const [includeDraftTemplates, setIncludeDraftTemplates] = useState(false);
  const [showPreviewOnReview, setShowPreviewOnReview] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      const [contactsRes, segmentsRes] = await Promise.all([
        fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?limit=500`),
        fetch(`/api/projects/${activeProject.id}/whatsapp/segments`),
      ]);
      const contactsData = await contactsRes.json();
      const segmentsData = await segmentsRes.json();
      setContacts(contactsData.contacts ?? []);
      setSegments(segmentsData.segments ?? []);
    })();
  }, [activeProject?.id, wizardOpen]);

  useEffect(() => {
    if (!activeProject?.id || !wizardOpen) return;
    const url = includeDraftTemplates
      ? `/api/projects/${activeProject.id}/whatsapp/templates?include_drafts=1`
      : `/api/projects/${activeProject.id}/whatsapp/templates?status=approved`;
    fetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load templates");
        return data;
      })
      .then((data) => setTemplates(Array.isArray(data.templates) ? data.templates : []))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load templates");
      });
  }, [activeProject?.id, wizardOpen, includeDraftTemplates]);

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
    setIncludeDraftTemplates(false);
    setShowPreviewOnReview(false);
    setFieldErrors({});
    setWizardOpen(true);
  };

  const isDraft = scheduleOption === "draft";

  const selectedTemplate = templateId ? templates.find((t) => t.id === templateId) : null;
  const isTemplateApproved = selectedTemplate?.status === "approved";

  const validateStep = (s: number): boolean => {
    const err: Record<string, string> = {};
    if (s === 0 || s === 4) {
      if (!name.trim()) err.name = "Campaign name is required.";
    }
    if ((s === 1 || s === 4) && !isDraft) {
      if (audienceType === "contacts" && selectedContactIds.length === 0)
        err.audience = "Select at least one contact or save as draft.";
      if (audienceType === "segment" && !segmentId)
        err.audience = "Select a segment or save as draft.";
    }
    if ((s === 2 || s === 4) && !isDraft) {
      if (!templateId) err.template = "Select a template when sending or scheduling.";
      else if (!isTemplateApproved)
        err.template = "Only approved templates can be used for sending or scheduling. Submit your draft for approval first.";
    }
    if (s === 3 || s === 4) {
      if (scheduleOption === "schedule" && !scheduledAt.trim())
        err.schedule = "Pick a date and time for scheduling.";
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const canProceedStep = (s: number): boolean => {
    if (s === 0) return !!name.trim();
    if (s === 1 && !isDraft) {
      if (audienceType === "contacts") return selectedContactIds.length > 0;
      if (audienceType === "segment") return !!segmentId;
      return false;
    }
    if (s === 2 && !isDraft) return !!templateId && !!isTemplateApproved;
    if (s === 3) {
      if (scheduleOption === "schedule") return !!scheduledAt.trim();
    }
    if (s === 4) {
      if (!name.trim()) return false;
      if (!isDraft) {
        if (audienceType === "contacts" && selectedContactIds.length === 0) return false;
        if (audienceType === "segment" && !segmentId) return false;
        if (!templateId || !isTemplateApproved) return false;
      }
      if (scheduleOption === "schedule" && !scheduledAt.trim()) return false;
    }
    return true;
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
    if (!validateStep(4)) return;
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!isDraft) {
      if (audienceType === "contacts" && selectedContactIds.length === 0) {
        toast.error("Select at least one contact");
        return;
      }
      if (audienceType === "segment" && !segmentId) {
        toast.error("Select a segment");
        return;
      }
      if (!templateId) {
        toast.error("Select a template when sending or scheduling");
        return;
      }
      if (!isTemplateApproved) {
        toast.error("Only approved templates can be used for sending or scheduling. Submit your draft for approval first.");
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
        <LoadingState message="Loading campaigns…" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title="No campaigns yet"
          description="Create a campaign to send broadcast messages, or save as draft to finish later. Use the status filter to see drafts."
          actions={
            <Button onClick={openWizard} className="gap-1">
              <Plus className="h-4 w-4" />
              New campaign
            </Button>
          }
        />
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
                          {c.status === "draft" && (c.recipient_count ?? 0) > 0 && c.template_id && c.template_status === "approved" && (
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
        <DialogContent className="sm:max-w-4xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex flex-col sm:flex-row flex-1 min-h-[520px]">
            {/* Left: minimal vertical stepper */}
            <div className="sm:w-40 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-800/80 py-8 pl-5 pr-4 sm:pl-6 sm:pr-5 relative">
              {/* vertical line (desktop only) */}
            
              <nav className="flex flex-row sm:flex-col gap-2 sm:gap-0 justify-center sm:justify-start" aria-label="Steps">
                {WIZARD_STEPS.map((s, i) => {
                  const isActive = i === step;
                  const isPast = i < step;
                  const isClickable = isPast;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => isClickable && setStep(i)}
                      disabled={!isClickable && !isActive}
                      className={`group relative z-10 flex items-center gap-3 w-full text-left py-1.5 sm:py-2 transition-colors outline-none border-0 bg-transparent ${
                        isClickable ? "cursor-pointer hover:opacity-100" : "cursor-default"
                      } ${isActive ? "text-gray-900 dark:text-gray-100" : isPast ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"}`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
                          isActive
                            ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                            : isPast
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                              : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[13px] truncate font-normal sm:inline hidden">{s.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right: content */}
            <div className="flex-1 flex flex-col min-w-0 pr-10 sm:pr-12">
              <div className="p-6 pb-4">
                <DialogHeader className="p-0 text-left">
                
                  <DialogTitle className="text-xl">{WIZARD_STEPS[step].title}</DialogTitle>
                  <DialogDescription className="text-left mt-1">
                    {step === 0 && "Name your campaign and add an optional internal description."}
                    {step === 1 && "Choose who will receive this campaign — contacts or a segment."}
                    {step === 2 && "Pick a WhatsApp template. Optionally include draft templates."}
                    {step === 3 && "Send now, schedule for later, or save as draft."}
                    {step === 4 && "Review your choices and create the campaign."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <Separator />

              <div className="flex-1 p-6 overflow-y-auto">
          {step === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="camp-name">
                    Campaign name <span className="text-red-600 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    id="camp-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder="e.g. Summer promo"
                    required
                    aria-invalid={!!fieldErrors.name}
                    className={`h-10 ${fieldErrors.name ? "border-red-500 dark:border-red-500" : ""}`}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camp-desc">Description (internal, optional)</Label>
                  <Input
                    id="camp-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional note"
                    className="h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              {!isDraft && (
                <p className="text-sm text-muted-foreground">
                  Audience is required when sending or scheduling. You can skip by saving as draft in the Schedule step.
                </p>
              )}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 cursor-pointer rounded-md border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:w-auto min-w-[180px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="audience-type"
                    checked={audienceType === "contacts"}
                    onChange={() => {
                      setAudienceType("contacts");
                      if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                    }}
                    className="h-4 w-4 rounded-full border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Select contacts</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer rounded-md border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:w-auto min-w-[180px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="audience-type"
                    checked={audienceType === "segment"}
                    onChange={() => {
                      setAudienceType("segment");
                      if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                    }}
                    className="h-4 w-4 rounded-full border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Use segment</span>
                </label>
              </div>
              {audienceType === "segment" && (
                <div className="space-y-2">
                  <Label>
                    Segment {!isDraft && <span className="text-red-600 dark:text-red-400">*</span>}
                  </Label>
                  <select
                    value={segmentId}
                    onChange={(e) => {
                      setSegmentId(e.target.value);
                      if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                    }}
                    className={`flex h-10 w-full max-w-md rounded-md border bg-white dark:bg-gray-900 px-3 py-2 text-sm ${
                      fieldErrors.audience ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-800"
                    }`}
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
                <div className="space-y-2">
                  <Label>
                    Contacts {!isDraft && <span className="text-red-600 dark:text-red-400">*</span>}
                  </Label>
                  <div
                    className={`max-h-52 overflow-y-auto space-y-2 border rounded-md p-3 bg-white dark:bg-gray-900 ${
                      fieldErrors.audience ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    {contacts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No contacts. Add contacts first.</p>
                    ) : (
                      contacts.slice(0, 100).map((contact) => (
                        <label key={contact.id} className="flex items-center gap-3 text-sm cursor-pointer py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <Checkbox
                            checked={selectedContactIds.includes(contact.id)}
                            onCheckedChange={() => {
                              toggleContact(contact.id);
                              if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                            }}
                          />
                          {contact.name || contact.phone} ({contact.phone})
                        </label>
                      ))
                    )}
                    {contacts.length > 100 && (
                      <p className="text-xs text-muted-foreground pt-2">Showing first 100. Use a segment for more.</p>
                    )}
                  </div>
                </div>
              )}
              {fieldErrors.audience && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {fieldErrors.audience}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center space-x-3 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                <Checkbox
                  id="include-draft-templates"
                  checked={includeDraftTemplates}
                  onCheckedChange={(checked) => setIncludeDraftTemplates(checked === true)}
                />
                <Label htmlFor="include-draft-templates" className="cursor-pointer text-sm font-normal">
                  Include draft templates in the list
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="camp-template">
                  Template {!isDraft && <span className="text-red-600 dark:text-red-400">*</span>}
                </Label>
                <select
                  id="camp-template"
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    if (fieldErrors.template) setFieldErrors((prev) => ({ ...prev, template: "" }));
                  }}
                  className={`flex h-10 w-full max-w-md rounded-md border bg-white dark:bg-gray-900 px-3 py-2 text-sm ${
                    fieldErrors.template ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <option value="">{isDraft ? "No template (optional)" : "Choose template"}</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.status})
                    </option>
                  ))}
                </select>
                {!isDraft && selectedTemplate?.status && selectedTemplate.status !== "approved" && (
                  <p className="text-xs text-amber-600 dark:text-amber-500" role="alert">
                    Only approved templates can be used for sending or scheduling. Submit this template for approval first.
                  </p>
                )}
                {fieldErrors.template && (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {fieldErrors.template}
                  </p>
                )}
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Create templates in Templates. Use the checkbox above to include drafts.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <label className="flex items-center gap-3 cursor-pointer rounded-md border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:flex-1 min-w-[200px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="schedule-option"
                    checked={scheduleOption === "send_now"}
                    onChange={() => setScheduleOption("send_now")}
                    className="h-4 w-4 rounded-full border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Send now</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer rounded-md border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:flex-1 min-w-[200px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="schedule-option"
                    checked={scheduleOption === "schedule"}
                    onChange={() => setScheduleOption("schedule")}
                    className="h-4 w-4 rounded-full border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Schedule for later</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer rounded-md border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:flex-1 min-w-[200px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="schedule-option"
                    checked={scheduleOption === "draft"}
                    onChange={() => setScheduleOption("draft")}
                    className="h-4 w-4 rounded-full border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Save as draft</span>
                </label>
              </div>
              {scheduleOption === "schedule" && (
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="scheduled-at">
                    Date & time <span className="text-red-600 dark:text-red-400">*</span>
                  </Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => {
                      setScheduledAt(e.target.value);
                      if (fieldErrors.schedule) setFieldErrors((prev) => ({ ...prev, schedule: "" }));
                    }}
                    className={`h-10 ${fieldErrors.schedule ? "border-red-500 dark:border-red-500" : ""}`}
                  />
                  {fieldErrors.schedule && (
                    <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                      {fieldErrors.schedule}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              {Object.keys(fieldErrors).length > 0 && (
                <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400" role="alert">
                  <p className="font-medium mb-1">Please fix the following:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {fieldErrors.name && <li>{fieldErrors.name}</li>}
                    {fieldErrors.audience && <li>{fieldErrors.audience}</li>}
                    {fieldErrors.template && <li>{fieldErrors.template}</li>}
                    {fieldErrors.schedule && <li>{fieldErrors.schedule}</li>}
                  </ul>
                </div>
              )}
              <div className="flex items-center space-x-3 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                <Checkbox
                  id="show-preview"
                  checked={showPreviewOnReview}
                  onCheckedChange={(checked) => setShowPreviewOnReview(checked === true)}
                />
                <Label htmlFor="show-preview" className="cursor-pointer text-sm font-normal">
                  Show template and audience preview
                </Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Description</p>
                  <p className="font-medium">{description || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Audience</p>
                  <p className="font-medium">
                    {audienceType === "segment" ? (segmentId ? `${segments.find((s) => s.id === segmentId)?.name ?? segmentId}` : "—") : `${selectedContactIds.length} contact(s)`}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Template</p>
                  <p className="font-medium">{templateId ? templates.find((t) => t.id === templateId)?.name ?? templateId : "None"}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-muted-foreground">When</p>
                  <p className="font-medium">
                    {scheduleOption === "send_now" ? "Send now" : scheduleOption === "schedule" && scheduledAt ? new Date(scheduledAt).toLocaleString() : scheduleOption === "draft" ? "Save as draft" : "—"}
                  </p>
                </div>
              </div>
              {showPreviewOnReview && (
                <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-4 text-sm">
                  {templateId && (() => {
                    const t = templates.find((tpl) => tpl.id === templateId);
                    return t ? (
                      <div>
                        <p className="font-medium text-muted-foreground mb-2">Template preview</p>
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md p-3 whitespace-pre-wrap break-words">
                          {t.body || "(No body)"}
                        </div>
                      </div>
                    ) : null;
                  })()}
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">Audience</p>
                    {audienceType === "segment" && segmentId ? (
                      <p>{segments.find((s) => s.id === segmentId)?.name ?? segmentId} (segment)</p>
                    ) : selectedContactIds.length > 0 ? (
                      <ul className="max-h-32 overflow-y-auto list-disc list-inside space-y-0.5">
                        {selectedContactIds.slice(0, 50).map((id) => {
                          const c = contacts.find((x) => x.id === id);
                          return <li key={id}>{c ? (c.name || c.phone) : id}</li>;
                        })}
                        {selectedContactIds.length > 50 && (
                          <li className="text-muted-foreground">… and {selectedContactIds.length - 50} more</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No contacts selected (draft or segment).</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
              </div>

              <Separator />
              <DialogFooter className="flex flex-row justify-between gap-4 p-6 pt-4 border-t-0">
                <div>
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      onClick={() => {
                        setStep((s) => s - 1);
                        setFieldErrors({});
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                 
                  {step < WIZARD_STEPS.length - 1 ? (
                    <Button
                      type="button"
                      size="lg"
                      className="gap-2 min-w-[120px]"
                      onClick={() => {
                        if (validateStep(step)) setStep((s) => s + 1);
                      }}
                      disabled={!canProceedStep(step)}
                    >
                      Next step
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="gap-2 min-w-[160px]"
                      onClick={handleCreate}
                      disabled={saving || !canProceedStep(4)}
                    >
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
                </div>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
