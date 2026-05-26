"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, FileText, LayoutTemplate, Loader2, Megaphone, Pencil, Plus, Search, Send, Trash2, Users, X } from "lucide-react";
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
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";

interface Campaign {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  template_id: string | null;
  use_hello_world?: boolean;
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

interface TagDefinition {
  id: string;
  name: string;
  color: string | null;
  contact_count?: number;
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
  const [audienceType, setAudienceType] = useState<"contacts" | "tags">("contacts");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [useHelloWorld, setUseHelloWorld] = useState(false);
  const [scheduleOption, setScheduleOption] = useState<"schedule" | "draft">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [audienceSearchInput, setAudienceSearchInput] = useState("");
  const [audiencePage, setAudiencePage] = useState(0);
  const [audienceTotal, setAudienceTotal] = useState(0);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceSelectingAll, setAudienceSelectingAll] = useState(false);
  // Per-page size: 25 (default), 100, or "all" (up to 5000 in one shot).
  const [audiencePageSize, setAudiencePageSize] = useState<25 | 100 | "all">(25);
  // Keep id → display info for *every* selected contact, even ones not on the
  // current page. Lets the Review step show names for selections made via
  // "Select all matching" across pages.
  const [selectedContactsMeta, setSelectedContactsMeta] = useState<Record<string, { phone: string; name: string | null }>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
  const [tagAudienceCount, setTagAudienceCount] = useState<number | null>(null);
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

  // Tag definitions only need to load once when the wizard opens.
  useEffect(() => {
    if (!activeProject?.id || !wizardOpen) return;
    fetch(`/api/projects/${activeProject.id}/whatsapp/tag-definitions`)
      .then((res) => res.json())
      .then((data) => setTagDefinitions(data.tags ?? []))
      .catch(() => setTagDefinitions([]));
  }, [activeProject?.id, wizardOpen]);

  // Debounce search → reset page → trigger refetch.
  useEffect(() => {
    const t = setTimeout(() => {
      if (audienceSearch !== audienceSearchInput) {
        setAudienceSearch(audienceSearchInput);
        setAudiencePage(0);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [audienceSearchInput, audienceSearch]);

  // Paginated contacts fetch for the audience step.
  useEffect(() => {
    if (!activeProject?.id || !wizardOpen) return;
    setAudienceLoading(true);
    const params = new URLSearchParams();
    if (audiencePageSize === "all") {
      params.set("all", "1");
    } else {
      params.set("limit", String(audiencePageSize));
      params.set("offset", String(audiencePage * audiencePageSize));
    }
    if (audienceSearch.trim()) params.set("search", audienceSearch.trim());
    fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setContacts(data.contacts ?? []);
        setAudienceTotal(data.total ?? 0);
      })
      .catch(() => {
        setContacts([]);
        setAudienceTotal(0);
      })
      .finally(() => setAudienceLoading(false));
  }, [activeProject?.id, wizardOpen, audiencePage, audiencePageSize, audienceSearch]);

  useEffect(() => {
    if (!activeProject?.id || selectedTagIds.length === 0) {
      setTagAudienceCount(null);
      return;
    }
    const params = new URLSearchParams({ tag_ids: selectedTagIds.join(",") });
    fetch(`/api/projects/${activeProject.id}/whatsapp/audience-count?${params}`)
      .then((res) => res.json())
      .then((data) => setTagAudienceCount(typeof data.count === "number" ? data.count : null))
      .catch(() => setTagAudienceCount(null));
  }, [activeProject?.id, selectedTagIds]);

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
    setSelectedContactsMeta({});
    setAudienceSearch("");
    setAudienceSearchInput("");
    setAudiencePage(0);
    setAudienceTotal(0);
    setSelectedTagIds([]);
    setTemplateId("");
    setScheduleOption("draft");
    setScheduledAt("");
    setIncludeDraftTemplates(false);
    setShowPreviewOnReview(false);
    setFieldErrors({});
    setWizardOpen(true);
  };

  const isDraft = scheduleOption === "draft";

  const selectedTemplate = templateId ? templates.find((t) => t.id === templateId) : null;
  const isTemplateApproved = useHelloWorld || selectedTemplate?.status === "approved";

  const validateStep = (s: number): boolean => {
    const err: Record<string, string> = {};
    if (s === 0 || s === 4) {
      if (!name.trim()) err.name = "Campaign name is required.";
    }
    if ((s === 1 || s === 4) && !isDraft) {
      if (audienceType === "contacts" && selectedContactIds.length === 0)
        err.audience = "Select at least one contact or save as draft.";
      if (audienceType === "tags" && selectedTagIds.length === 0)
        err.audience = "Select at least one tag or save as draft.";
    }
    if ((s === 2 || s === 4) && !isDraft) {
      if (!useHelloWorld && !templateId) err.template = "Select a template or use the default Hello World template when sending or scheduling.";
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
      if (audienceType === "tags") return selectedTagIds.length > 0;
      return false;
    }
    if (s === 2 && !isDraft) return useHelloWorld || !!templateId;
    if (s === 3) {
      if (scheduleOption === "schedule") return !!scheduledAt.trim();
    }
    if (s === 4) {
      if (!name.trim()) return false;
      if (!isDraft) {
        if (audienceType === "contacts" && selectedContactIds.length === 0) return false;
        if (audienceType === "tags" && selectedTagIds.length === 0) return false;
        if (!useHelloWorld && !templateId) return false;
      }
      if (scheduleOption === "schedule" && !scheduledAt.trim()) return false;
    }
    return true;
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    const contact = contacts.find((c) => c.id === id);
    if (contact) {
      setSelectedContactsMeta((prev) => {
        if (prev[id]) {
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return { ...prev, [id]: { phone: contact.phone, name: contact.name } };
      });
    }
  };

  const selectAllOnPage = () => {
    if (contacts.length === 0) return;
    const pageIds = contacts.map((c) => c.id);
    const allOnPageSelected = pageIds.every((id) => selectedContactIds.includes(id));
    if (allOnPageSelected) {
      setSelectedContactIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      setSelectedContactsMeta((prev) => {
        const next = { ...prev };
        for (const id of pageIds) delete next[id];
        return next;
      });
    } else {
      setSelectedContactIds((prev) => Array.from(new Set([...prev, ...pageIds])));
      setSelectedContactsMeta((prev) => {
        const next = { ...prev };
        for (const c of contacts) next[c.id] = { phone: c.phone, name: c.name };
        return next;
      });
    }
  };

  const selectAllMatching = async () => {
    if (!activeProject?.id || audienceTotal === 0) return;
    setAudienceSelectingAll(true);
    try {
      const params = new URLSearchParams({ all: "1" });
      if (audienceSearch.trim()) params.set("search", audienceSearch.trim());
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load all contacts");
      const all = (data.contacts ?? []) as Array<{ id: string; phone: string; name: string | null }>;
      setSelectedContactIds(all.map((c) => c.id));
      const meta: Record<string, { phone: string; name: string | null }> = {};
      for (const c of all) meta[c.id] = { phone: c.phone, name: c.name };
      setSelectedContactsMeta(meta);
      toast.success(`${all.length} contact${all.length === 1 ? "" : "s"} selected.`);
      if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not select all");
    } finally {
      setAudienceSelectingAll(false);
    }
  };

  const clearAudienceSelection = () => {
    setSelectedContactIds([]);
    setSelectedContactsMeta({});
  };

  const handleSendNow = async (c: Campaign) => {
    if (!activeProject?.id || c.status !== "draft") return;
    if ((c.recipient_count ?? 0) === 0) {
      toast.error("Add recipients in the campaign first");
      return;
    }
    setSendingId(c.id);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns/${c.id}/send-now-debug`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start");
      }
      const sent = typeof data.sent === "number" ? data.sent : 0;
      const failed = typeof data.failed === "number" ? data.failed : 0;
      const deferred = typeof data.deferred === "number" ? data.deferred : 0;
      if (failed > 0 && sent === 0) {
        toast.error(`Send failed for ${failed} recipient${failed === 1 ? "" : "s"}. Open the campaign to see details.`);
      } else if (failed > 0) {
        toast.success(`Sent ${sent}, failed ${failed}. Open the campaign to see details.`);
      } else if (sent > 0) {
        toast.success(
          deferred > 0
            ? `Sent ${sent}. ${deferred} more will send via cron within the next minute.`
            : `Sent ${sent} message${sent === 1 ? "" : "s"}.`
        );
      } else {
        toast.success("Campaign started. Remaining recipients will be processed by the cron in the next minute.");
      }
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
      if (audienceType === "tags" && selectedTagIds.length === 0) {
        toast.error("Select at least one tag");
        return;
      }
      if (!useHelloWorld && !templateId) {
        toast.error("Select a template or use the default Hello World template when sending or scheduling");
        return;
      }
    }
    if (scheduleOption === "schedule" && !scheduledAt) {
      toast.error("Pick a date and time for scheduling");
      return;
    }
    const willSendOrSchedule = !isDraft && scheduleOption === "schedule";
    const createAsDraftBecauseTemplateNotApproved = willSendOrSchedule && !isTemplateApproved;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          template_id: useHelloWorld ? null : (templateId || null),
          use_hello_world: useHelloWorld,
          contact_ids: audienceType === "contacts" ? selectedContactIds : [],
          tag_ids: audienceType === "tags" ? selectedTagIds : [],
          send_now: false,
          save_as_draft: isDraft || createAsDraftBecauseTemplateNotApproved,
          scheduled_at: scheduleOption === "schedule" && isTemplateApproved ? (scheduledAt || null) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");
      if (createAsDraftBecauseTemplateNotApproved) {
        toast.success("Campaign saved as draft. Only approved templates can be used for sending or scheduling. Submit this template for approval first.");
      } else {
        toast.success("Campaign created");
      }
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
      <div className="flex flex-col gap-10">
        <PageHeader title="Campaigns" description="Select a project to manage campaigns." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
<PageHeader
        title="Campaigns"
        description="Create and send broadcast campaigns. Filter by status below."
        />
        <Button onClick={openWizard} className="gap-1 shrink-0">
          <Plus className="h-4 w-4" />
          New campaign
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 bg-white dark:bg-gray-900 p-2 w-fit">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 bg-white dark:bg-gray-900 px-3 py-1 text-sm"
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
        <div className="bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-900/50">
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
                          {c.status === "draft" && (c.recipient_count ?? 0) > 0 && (c.use_hello_world || (c.template_id && c.template_status === "approved")) && (
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
        <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
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
                        className={`flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-medium transition-colors ${
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
                    {step === 1 && "Choose who will receive this campaign — select contacts or send to everyone with selected tags."}
                    {step === 2 && "Pick a WhatsApp template. Optionally include draft templates."}
                    {step === 3 && "Schedule for later or save as draft."}
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
                <label className="flex items-center gap-3 cursor-pointer border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:w-auto min-w-[180px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="audience-type"
                    checked={audienceType === "contacts"}
                    onChange={() => {
                      setAudienceType("contacts");
                      if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                    }}
                    className="h-4 w-4 border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Select contacts</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:w-auto min-w-[180px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="audience-type"
                    checked={audienceType === "tags"}
                    onChange={() => {
                      setAudienceType("tags");
                      if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                    }}
                    className="h-4 w-4 border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Send to contacts with tags</span>
                </label>
              </div>
              {audienceType === "tags" && (
                <div className="space-y-2">
                  <Label>
                    Tags {!isDraft && <span className="text-red-600 dark:text-red-400">*</span>}
                  </Label>
                  <p className="text-xs text-muted-foreground">Contacts with any of the selected tags will receive the campaign.</p>
                  <div
                    className={`flex flex-wrap gap-3 border p-3 bg-white dark:bg-gray-900 min-h-[44px] ${
                      fieldErrors.audience ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    {tagDefinitions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tags yet. Create tags in Settings → Tags first.</p>
                    ) : (
                      tagDefinitions.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTagIds.includes(t.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTagIds((prev) => [...prev, t.id]);
                              else setSelectedTagIds((prev) => prev.filter((id) => id !== t.id));
                              if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                            }}
                            className="border-gray-300"
                          />
                          <span className="text-sm">
                            {t.name}
                            {typeof t.contact_count === "number" && (
                              <span className="text-muted-foreground ml-1">({t.contact_count} contact{t.contact_count === 1 ? "" : "s"})</span>
                            )}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedTagIds.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {tagAudienceCount !== null ? (
                        <strong className="text-foreground">{tagAudienceCount}</strong>
                      ) : (
                        <span className="animate-pulse">…</span>
                      )}
                      {tagAudienceCount !== null && ` contact${tagAudienceCount === 1 ? "" : "s"} will receive this campaign`}
                    </p>
                  )}
                </div>
              )}
              {audienceType === "contacts" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <Label>
                      Contacts {!isDraft && <span className="text-red-600 dark:text-red-400">*</span>}
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{selectedContactIds.length}</strong> selected
                      {audienceTotal > 0 && (
                        <>
                          {" "}of <strong className="text-foreground">{audienceTotal}</strong>
                          {audienceSearch && " matching"}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="search"
                      value={audienceSearchInput}
                      onChange={(e) => setAudienceSearchInput(e.target.value)}
                      placeholder="Search by phone, name, or email…"
                      className="flex h-9 w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    {audienceSearchInput && (
                      <button
                        type="button"
                        onClick={() => setAudienceSearchInput("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllOnPage}
                        disabled={contacts.length === 0 || audienceLoading}
                      >
                        {contacts.every((c) => selectedContactIds.includes(c.id)) && contacts.length > 0
                          ? audiencePageSize === "all"
                            ? "Unselect all"
                            : "Unselect page"
                          : audiencePageSize === "all"
                            ? "Select all visible"
                            : "Select page"}
                      </Button>
                      {audiencePageSize !== "all" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={selectAllMatching}
                          disabled={audienceTotal === 0 || audienceSelectingAll}
                          className="gap-1"
                        >
                          {audienceSelectingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Select all {audienceSearch ? `matching (${audienceTotal})` : `(${audienceTotal})`}
                        </Button>
                      )}
                      {selectedContactIds.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearAudienceSelection}
                          className="text-muted-foreground"
                        >
                          Clear selection
                        </Button>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Show
                      <select
                        value={String(audiencePageSize)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAudiencePage(0);
                          setAudiencePageSize(v === "all" ? "all" : (Number(v) as 25 | 100));
                        }}
                        className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      >
                        <option value="25">25 per page</option>
                        <option value="100">100 per page</option>
                        <option value="all">Show all</option>
                      </select>
                    </label>
                  </div>

                  <div
                    className={`border bg-white dark:bg-gray-900 ${
                      fieldErrors.audience ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <div className="max-h-80 overflow-y-auto">
                      {audienceLoading ? (
                        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading…
                        </div>
                      ) : contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-6 text-center">
                          {audienceSearch ? "No contacts match this search." : "No contacts. Add contacts first."}
                        </p>
                      ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-800/50">
                          {contacts.map((contact) => (
                            <li key={contact.id}>
                              <label className="flex items-center gap-3 text-sm cursor-pointer py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <Checkbox
                                  checked={selectedContactIds.includes(contact.id)}
                                  onCheckedChange={() => {
                                    toggleContact(contact.id);
                                    if (fieldErrors.audience) setFieldErrors((prev) => ({ ...prev, audience: "" }));
                                  }}
                                />
                                <span className="flex-1 truncate">
                                  {contact.name ? (
                                    <>
                                      <span className="font-medium">{contact.name}</span>
                                      <span className="text-muted-foreground"> · {contact.phone}</span>
                                    </>
                                  ) : (
                                    <span className="font-mono">{contact.phone}</span>
                                  )}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {audiencePageSize !== "all" && audienceTotal > audiencePageSize && (
                      <div className="flex items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-800 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">
                          {audienceTotal === 0
                            ? "0 results"
                            : `${audiencePage * audiencePageSize + 1}–${Math.min(
                                (audiencePage + 1) * audiencePageSize,
                                audienceTotal
                              )} of ${audienceTotal}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAudiencePage((p) => Math.max(0, p - 1))}
                            disabled={audiencePage === 0 || audienceLoading}
                            className="h-7 px-2"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-muted-foreground px-2">
                            Page {audiencePage + 1} of {Math.max(1, Math.ceil(audienceTotal / audiencePageSize))}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAudiencePage((p) => p + 1)}
                            disabled={
                              audienceLoading ||
                              (audiencePage + 1) * audiencePageSize >= audienceTotal
                            }
                            className="h-7 px-2"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {audiencePageSize === "all" && audienceTotal >= 5000 && (
                      <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2 text-xs text-muted-foreground">
                        Showing first 5,000 results. Narrow with search to see more.
                      </div>
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
              <div className="flex items-center space-x-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                <Checkbox
                  id="use-hello-world"
                  checked={useHelloWorld}
                  onCheckedChange={(checked) => {
                    setUseHelloWorld(checked === true);
                    if (checked) setTemplateId("");
                    if (fieldErrors.template) setFieldErrors((prev) => ({ ...prev, template: "" }));
                  }}
                />
                <Label htmlFor="use-hello-world" className="cursor-pointer text-sm font-normal">
                  Use default Hello World template
                </Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Meta&apos;s built-in &quot;Hello World&quot; message. Good for testing, including sending to a single contact.
              </p>
              <div className="flex items-center space-x-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
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
                  Template {!isDraft && !useHelloWorld && <span className="text-red-600 dark:text-red-400">*</span>}
                </Label>
                <select
                  id="camp-template"
                  value={templateId}
                  disabled={useHelloWorld}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    if (fieldErrors.template) setFieldErrors((prev) => ({ ...prev, template: "" }));
                  }}
                  className={`flex h-10 w-full max-w-md border bg-white dark:bg-gray-900 px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                    fieldErrors.template ? "border-red-500 dark:border-red-500" : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <option value="">{isDraft && !useHelloWorld ? "No template (optional)" : "Choose template"}</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.status})
                    </option>
                  ))}
                </select>
                {!isDraft && !useHelloWorld && selectedTemplate?.status && selectedTemplate.status !== "approved" && (
                  <p className="text-xs text-amber-600 dark:text-amber-500" role="alert">
                    Only approved templates can be used for sending or scheduling. Submit this template for approval first.
                  </p>
                )}
                {fieldErrors.template && (
                  <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                    {fieldErrors.template}
                  </p>
                )}
                {templates.length === 0 && !useHelloWorld && (
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
                <label className="flex items-center gap-3 cursor-pointer border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:flex-1 min-w-[200px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="schedule-option"
                    checked={scheduleOption === "schedule"}
                    onChange={() => setScheduleOption("schedule")}
                    className="h-4 w-4 border-gray-300 text-gray-800 dark:text-gray-200"
                  />
                  <span className="font-medium">Schedule for later</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer border border-gray-200 dark:border-gray-800 px-4 py-3 w-full sm:flex-1 min-w-[200px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                  <input
                    type="radio"
                    name="schedule-option"
                    checked={scheduleOption === "draft"}
                    onChange={() => setScheduleOption("draft")}
                    className="h-4 w-4 border-gray-300 text-gray-800 dark:text-gray-200"
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
                <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400" role="alert">
                  <p className="font-medium mb-1">Please fix the following:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {fieldErrors.name && <li>{fieldErrors.name}</li>}
                    {fieldErrors.audience && <li>{fieldErrors.audience}</li>}
                    {fieldErrors.template && <li>{fieldErrors.template}</li>}
                    {fieldErrors.schedule && <li>{fieldErrors.schedule}</li>}
                  </ul>
                </div>
              )}
              <div className="flex items-center space-x-3 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
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
                    {audienceType === "tags"
                      ? selectedTagIds.length > 0
                        ? `${selectedTagIds.length} tag(s): ${selectedTagIds.map((id) => tagDefinitions.find((t) => t.id === id)?.name ?? id).join(", ")}`
                        : "—"
                      : `${selectedContactIds.length} contact(s)`}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Template</p>
                  <p className="font-medium">{useHelloWorld ? "Hello World (default)" : templateId ? templates.find((t) => t.id === templateId)?.name ?? templateId : "None"}</p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-muted-foreground">When</p>
                  <p className="font-medium">
                    {scheduleOption === "schedule" && scheduledAt ? new Date(scheduledAt).toLocaleString() : scheduleOption === "draft" ? "Save as draft" : "—"}
                  </p>
                </div>
              </div>
              {showPreviewOnReview && (
                <div className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4 text-sm">
                  {(useHelloWorld || templateId) && (
                    <div>
                      <p className="font-medium text-muted-foreground mb-2">Template preview</p>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-3 whitespace-pre-wrap break-words">
                        {useHelloWorld ? "Hello World" : (templates.find((tpl) => tpl.id === templateId)?.body ?? "(No body)")}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-muted-foreground mb-2">Audience</p>
                    {audienceType === "tags" && selectedTagIds.length > 0 ? (
                      <p>Contacts with tags: {selectedTagIds.map((id) => tagDefinitions.find((t) => t.id === id)?.name ?? id).join(", ")}</p>
                    ) : selectedContactIds.length > 0 ? (
                      <ul className="max-h-32 overflow-y-auto list-disc list-inside space-y-0.5">
                        {selectedContactIds.slice(0, 50).map((id) => {
                          const meta = selectedContactsMeta[id];
                          const fromPage = !meta ? contacts.find((x) => x.id === id) : null;
                          const label = meta
                            ? meta.name || meta.phone
                            : fromPage
                              ? fromPage.name || fromPage.phone
                              : id;
                          return <li key={id}>{label}</li>;
                        })}
                        {selectedContactIds.length > 50 && (
                          <li className="text-muted-foreground">… and {selectedContactIds.length - 50} more</li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No contacts or tags selected (draft).</p>
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
