"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutTemplate,
  Loader2,
  Megaphone,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
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
  template_name?: string | null;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
}

interface Template {
  id: string;
  name: string;
  subject: string;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: string;
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

export default function EmailCampaignsPage() {
  const { activeProject } = useProjectContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [scheduleOption, setScheduleOption] = useState<"schedule" | "draft">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchCampaigns = useCallback(
    async (silent = false) => {
      if (!activeProject?.id) return;
      if (!silent) setLoading(true);
      try {
        const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
        const res = await fetch(`/api/projects/${activeProject.id}/email/campaigns${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setCampaigns(data.campaigns ?? []);
      } catch (err) {
        if (!silent) toast.error(err instanceof Error ? err.message : "Could not load campaigns");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [activeProject?.id, statusFilter]
  );

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Poll when any campaign is sending or scheduled so status/counts update after cron runs
  useEffect(() => {
    const hasActive = campaigns.some(
      (c) => c.status === "sending" || c.status === "scheduled"
    );
    if (!activeProject?.id || !hasActive) return;
    const interval = setInterval(() => fetchCampaigns(true), 8000);
    return () => clearInterval(interval);
  }, [activeProject?.id, campaigns, fetchCampaigns]);

  useEffect(() => {
    if (!activeProject?.id || !wizardOpen) return;
    (async () => {
      const [subsRes, tmplRes] = await Promise.all([
        fetch(`/api/projects/${activeProject.id}/email/subscribers?status=subscribed&limit=500`),
        fetch(`/api/projects/${activeProject.id}/email/templates`),
      ]);
      const subsData = await subsRes.json();
      const tmplData = await tmplRes.json();
      setSubscribers(subsData.subscribers ?? []);
      setTemplates(tmplData.templates ?? []);
    })();
  }, [activeProject?.id, wizardOpen]);

  const openWizard = () => {
    setStep(0);
    setName("");
    setDescription("");
    setSelectedSubscriberIds([]);
    setTemplateId("");
    setScheduleOption("draft");
    setScheduledAt("");
    setFieldErrors({});
    setWizardOpen(true);
  };

  const isDraft = scheduleOption === "draft";

  const validateStep = (s: number): boolean => {
    const err: Record<string, string> = {};
    if (s === 0 || s === 4) {
      if (!name.trim()) err.name = "Campaign name is required.";
    }
    if ((s === 1 || s === 4) && !isDraft) {
      if (selectedSubscriberIds.length === 0) err.audience = "Select at least one subscriber or save as draft.";
    }
    if ((s === 2 || s === 4) && !isDraft) {
      if (!templateId) err.template = "Select a template when sending or scheduling.";
    }
    if (s === 3 || s === 4) {
      if (scheduleOption === "schedule" && !scheduledAt.trim()) err.schedule = "Pick a date and time for scheduling.";
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const canProceedStep = (s: number): boolean => {
    if (s === 0) return !!name.trim();
    if (s === 1) return isDraft || selectedSubscriberIds.length > 0;
    if (s === 2) return !!templateId;
    if (s === 3) return isDraft || (scheduleOption === "schedule" && !!scheduledAt.trim());
    if (s === 4) {
      if (!name.trim()) return false;
      if (!isDraft && selectedSubscriberIds.length === 0) return false;
      if (!isDraft && !templateId) return false;
      if (scheduleOption === "schedule" && !scheduledAt.trim()) return false;
    }
    return true;
  };

  const handleSendNow = async (c: Campaign) => {
    if (!activeProject?.id || c.status !== "draft") return;
    if ((c.recipient_count ?? 0) === 0) {
      toast.error("Add at least one recipient in the campaign first.");
      return;
    }
    setSendingId(c.id);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/campaigns/${c.id}/send-to`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriber_ids: [], send_now: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start sending");
      toast.success("Campaign is now sending. Emails go out in the background.");
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
      const res = await fetch(`/api/projects/${activeProject.id}/email/campaigns/${campaignId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");
      toast.success("Campaign deleted");
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete campaign");
    }
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!validateStep(4)) {
      toast.error("Fix the errors below before creating.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          template_id: templateId,
          subscriber_ids: selectedSubscriberIds,
          send_now: false,
          save_as_draft: isDraft,
          scheduled_at: scheduleOption === "schedule" ? scheduledAt.trim() || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");
      toast.success(isDraft ? "Campaign saved as draft." : "Campaign created.");
      setWizardOpen(false);
      fetchCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create campaign");
    } finally {
      setSaving(false);
    }
  };

  const toggleSubscriber = (id: string) => {
    setSelectedSubscriberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Email Campaigns" description="Select a project to manage campaigns." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Email Campaigns"
          description="Create and send email campaigns. Filter by status below."
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
          description="Create a campaign to send emails, or save as draft to finish later."
          actions={
            <Button onClick={openWizard} className="gap-1">
              <Megaphone className="h-4 w-4" />
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
                      <Link href={`/dashboard/email/campaigns/${c.id}`} className="font-medium hover:underline">
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
                    <td className="p-3 text-right">{c.failed_count ?? 0}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {c.scheduled_at && !c.started_at ? new Date(c.scheduled_at).toLocaleString() : "—"}
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
                            <Link href={`/dashboard/email/campaigns/${c.id}`} className="flex items-center gap-2">
                              View / Edit
                            </Link>
                          </DropdownMenuItem>
                          {c.status === "draft" && (c.recipient_count ?? 0) > 0 && (
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
                            className="text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(c.id, c.name)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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
            <div className="sm:w-40 shrink-0 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-800/80 py-8 pl-5 pr-4 sm:pl-6 sm:pr-5">
              <nav className="flex flex-row sm:flex-col gap-2 sm:gap-0 justify-center sm:justify-start" aria-label="Steps">
                {WIZARD_STEPS.map((s, i) => {
                  const isActive = i === step;
                  const isPast = i < step;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => isPast && setStep(i)}
                      disabled={!isPast && !isActive}
                      className={`group relative z-10 flex items-center gap-3 w-full text-left py-1.5 sm:py-2 transition-colors outline-none border-0 bg-transparent ${
                        isPast ? "cursor-pointer hover:opacity-100" : "cursor-default"
                      } ${isActive ? "text-gray-900 dark:text-gray-100" : isPast ? "text-gray-500 dark:text-gray-400" : "text-gray-400 dark:text-gray-500"}`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-medium ${
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
            <div className="flex-1 flex flex-col min-w-0 pr-10 sm:pr-12">
              <div className="p-6 pb-4">
                <DialogHeader className="p-0 text-left">
                  <DialogTitle className="text-xl">{WIZARD_STEPS[step].title}</DialogTitle>
                  <DialogDescription className="text-left mt-1">
                    {step === 0 && "Name your campaign and add an optional description."}
                    {step === 1 && "Choose subscribers who will receive this campaign."}
                    {step === 2 && "Pick an email template."}
                    {step === 3 && "Schedule for later or save as draft."}
                    {step === 4 && "Review and create the campaign."}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <Separator />
              <div className="flex-1 p-6 overflow-y-auto">
                {step === 0 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="camp-name">Campaign name *</Label>
                      <Input
                        id="camp-name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: "" })); }}
                        placeholder="e.g. Summer promo"
                        className="h-10"
                      />
                      {fieldErrors.name && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.name}</p>}
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
                )}
                {step === 1 && (
                  <div className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                      {isDraft ? "You can add recipients later from the campaign page." : "Select one or more subscribers (you can send to a single contact)."}
                    </p>
                    <div className="max-h-52 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900">
                      {subscribers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No subscribed subscribers. Add subscribers first.</p>
                      ) : (
                        subscribers.slice(0, 200).map((sub) => (
                          <label key={sub.id} className="flex items-center gap-3 text-sm cursor-pointer py-1.5 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <Checkbox
                              checked={selectedSubscriberIds.includes(sub.id)}
                              onCheckedChange={() => { toggleSubscriber(sub.id); setFieldErrors((prev) => ({ ...prev, audience: "" })); }}
                            />
                            {sub.name || sub.email} ({sub.email})
                          </label>
                        ))
                      )}
                      {subscribers.length > 200 && (
                        <p className="text-xs text-muted-foreground pt-2">Showing first 200.</p>
                      )}
                    </div>
                    {fieldErrors.audience && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.audience}</p>}
                    {!isDraft && selectedSubscriberIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{selectedSubscriberIds.length}</strong> subscriber(s) will receive this campaign.
                      </p>
                    )}
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="camp-template">Template *</Label>
                      <select
                        id="camp-template"
                        value={templateId}
                        onChange={(e) => { setTemplateId(e.target.value); setFieldErrors((prev) => ({ ...prev, template: "" })); }}
                        className="flex h-10 w-full max-w-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      >
                        <option value="">Choose template</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} – {t.subject}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.template && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.template}</p>}
                      {templates.length === 0 && (
                        <p className="text-sm text-muted-foreground">Create templates in Email → Templates first.</p>
                      )}
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3 cursor-pointer border border-gray-200 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                        <input
                          type="radio"
                          name="schedule"
                          checked={scheduleOption === "schedule"}
                          onChange={() => setScheduleOption("schedule")}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">Schedule for later</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer border border-gray-200 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50">
                        <input
                          type="radio"
                          name="schedule"
                          checked={scheduleOption === "draft"}
                          onChange={() => setScheduleOption("draft")}
                          className="h-4 w-4"
                        />
                        <span className="font-medium">Save as draft</span>
                      </label>
                    </div>
                    {scheduleOption === "schedule" && (
                      <div className="space-y-2">
                        <Label htmlFor="camp-scheduled">Date and time</Label>
                        <Input
                          id="camp-scheduled"
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => { setScheduledAt(e.target.value); setFieldErrors((prev) => ({ ...prev, schedule: "" })); }}
                          className="h-10"
                        />
                        {fieldErrors.schedule && <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.schedule}</p>}
                      </div>
                    )}
                  </div>
                )}
                {step === 4 && (
                  <div className="space-y-4 text-sm">
                    {(fieldErrors.name || fieldErrors.audience || fieldErrors.template || fieldErrors.schedule) && (
                      <div className="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 space-y-1">
                        {fieldErrors.name && <p className="text-red-600 dark:text-red-400">{fieldErrors.name}</p>}
                        {fieldErrors.audience && <p className="text-red-600 dark:text-red-400">{fieldErrors.audience}</p>}
                        {fieldErrors.template && <p className="text-red-600 dark:text-red-400">{fieldErrors.template}</p>}
                        {fieldErrors.schedule && <p className="text-red-600 dark:text-red-400">{fieldErrors.schedule}</p>}
                      </div>
                    )}
                    <p><strong>Name:</strong> {name || "—"}</p>
                    <p><strong>Description:</strong> {description || "—"}</p>
                    <p><strong>Recipients:</strong> {selectedSubscriberIds.length} subscriber(s)</p>
                    <p><strong>Template:</strong> {templates.find((t) => t.id === templateId)?.name ?? "—"}</p>
                    <p><strong>Schedule:</strong> {scheduleOption === "schedule" ? `Scheduled: ${scheduledAt || "—"}` : "Draft"}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-row justify-between gap-4 p-6 pt-4 border-t border-gray-100 dark:border-gray-800/80">
                <div>
                  {step > 0 && (
                    <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {step < 4 ? (
                    <Button type="button" onClick={goNext} disabled={!canProceedStep(step)}>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleCreate} disabled={saving || !canProceedStep(4)}>
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
