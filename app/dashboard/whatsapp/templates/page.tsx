"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Info, LayoutTemplate, Loader2, MoreVertical, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectContext } from "@/lib/projects/project-context";

interface WhatsAppTemplate {
  id: string;
  project_id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  rejection_reason: string | null;
  body: string | null;
  header: string | null;
  footer: string | null;
  buttons: unknown[];
  variables: unknown[];
  meta_template_id: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "marketing", label: "Marketing" },
  { value: "utility", label: "Utility" },
  { value: "authentication", label: "Authentication" },
] as const;

/** Returns ordered variable indices (1-based) found in body text, e.g. [1, 2] for {{1}} and {{2}}. */
function getBodyVariableIndices(body: string): number[] {
  if (!body?.trim()) return [];
  const matches = body.match(/\{\{(\d+)\}\}/g);
  if (!matches) return [];
  const indices = [...new Set(matches.map((m) => parseInt(m.replace(/\{\{|\}\}/g, ""), 10)))].sort((a, b) => a - b);
  return indices;
}

export default function WhatsAppTemplatesPage() {
  const { activeProject } = useProjectContext();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<"marketing" | "utility" | "authentication">("marketing");
  const [formLanguage, setFormLanguage] = useState("en");
  const [formBody, setFormBody] = useState("");
  const [formHeader, setFormHeader] = useState("");
  const [formFooter, setFormFooter] = useState("");
  const [formVariableExamples, setFormVariableExamples] = useState<string[]>([]);

  const fetchTemplates = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      // When "All statuses" is selected (no filter), include drafts so new templates are visible
      const params = new URLSearchParams();
      if (statusFilter) {
        params.set("status", statusFilter);
      } else {
        params.set("include_drafts", "1");
      }
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setTemplates(data.templates ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load templates");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, statusFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormCategory("marketing");
    setFormLanguage("en");
    setFormBody("");
    setFormHeader("");
    setFormFooter("");
    setFormVariableExamples([]);
    setDialogOpen(true);
  };

  const openEdit = (t: WhatsAppTemplate) => {
    if (t.status !== "draft") {
      toast.error("Only draft templates can be edited");
      return;
    }
    setEditing(t);
    setFormName(t.name);
    setFormCategory((t.category as "marketing" | "utility" | "authentication") || "marketing");
    setFormLanguage(t.language || "en");
    setFormBody(t.body ?? "");
    setFormHeader(t.header ?? "");
    setFormFooter(t.footer ?? "");
    setFormVariableExamples(Array.isArray(t.variables) ? (t.variables as string[]).map(String) : []);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/projects/${activeProject.id}/whatsapp/templates/${editing.id}`
        : `/api/projects/${activeProject.id}/whatsapp/templates`;
      const method = editing ? "PATCH" : "POST";
      const bodyVarIndices = getBodyVariableIndices(formBody);
      const variables = bodyVarIndices.map((i) => formVariableExamples[i - 1] ?? "").map((s) => s.trim().slice(0, 100));
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          category: formCategory,
          language: formLanguage,
          body: formBody.trim() || null,
          header: formHeader.trim() || null,
          footer: formFooter.trim() || null,
          buttons: [],
          variables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(editing ? "Template updated" : "Template created");
      setDialogOpen(false);
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async (templateId: string) => {
    if (!activeProject?.id) return;
    setSubmitting(templateId);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/templates/${templateId}/submit`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      toast.success("Template submitted for approval");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(null);
    }
  };

  const handleRefreshStatus = async (templateId: string) => {
    if (!activeProject?.id) return;
    setRefreshingStatus(templateId);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/templates/${templateId}/refresh-status`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      toast.success(data.status ? `Status: ${data.status}` : "Status refreshed");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh status");
    } finally {
      setRefreshingStatus(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeProject?.id || !window.confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Template deleted");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const statusVariant = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    if (s === "pending") return "secondary";
    return "outline";
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Templates</h1>
        <p className="text-sm text-muted-foreground">Select a project to manage templates.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">Templates</h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Template help and test example"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(90vw,400px)] p-4" align="start" side="bottom">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Test template to try</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Copy these values into a new template to test approval. Use <strong>Utility</strong> and simple, clear text for faster approval (Meta review can take up to 24 hours).
                  </p>
                  <div className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] rounded-md border border-gray-200 dark:border-gray-800 p-3">
                    <span className="text-muted-foreground">Name</span>
                    <code className="font-mono text-xs">request_received</code>
                    <span className="text-muted-foreground">Category</span>
                    <span>Utility</span>
                    <span className="text-muted-foreground">Language</span>
                    <span>en</span>
                    <span className="text-muted-foreground">Body</span>
                    <code className="font-mono text-xs whitespace-pre-wrap break-words">Hi {"{{1}}"}, your request has been received. Reference: {"{{2}}"}. We will get back to you soon.</code>
                    <span className="text-muted-foreground">Example {"{{1}}"}</span>
                    <span>Customer</span>
                    <span className="text-muted-foreground">Example {"{{2}}"}</span>
                    <span>REF-001</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Create a new template, paste the body, choose Utility and language <strong>en</strong>, fill the two variable examples, then Submit for approval.
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">How do I know if my template is approved?</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Meta reviews templates automatically; review can take up to 24 hours (see{" "}
                    <a href="https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview" target="_blank" rel="noopener noreferrer" className="underline">
                      Meta Templates overview
                    </a>
                    ).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>In this app:</strong> When Meta approves or rejects your template, we update the status automatically if your webhook is subscribed to <code className="rounded bg-muted px-1 text-xs">message_template_status_update</code>. You can also use <strong>Refresh status from Meta</strong> in the template menu (⋯) to fetch the latest status.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>In WhatsApp Manager:</strong> Go to{" "}
                    <a href="https://business.facebook.com/latest/whatsapp_manager/message_templates" target="_blank" rel="noopener noreferrer" className="underline">
                      Manage templates
                    </a>{" "}
                    to see In-Review, Approved, or Rejected. Once approved, the template badge here will show <strong>approved</strong> and you can use it in campaigns.
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={openAdd} className="gap-1">
          <Plus className="h-4 w-4" />
          New template
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
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading templates…" />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-6 w-6" />}
          title="No templates yet"
          description="Create a template to use in campaigns or for 24-hour window messaging. Templates must be approved before use."
          actions={
            <Button onClick={openAdd} className="gap-1">
              <Plus className="h-4 w-4" />
              New template
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{t.name}</p>
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  <span className="text-xs text-muted-foreground">{t.category}</span>
                </div>
                {t.rejection_reason && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Rejected: {t.rejection_reason}
                  </p>
                )}
                {t.body && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {t.status === "draft" && (
                    <>
                      <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSubmitForApproval(t.id)}
                        disabled={submitting === t.id}
                      >
                        {submitting === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit for approval
                      </DropdownMenuItem>
                    </>
                  )}
                  {t.meta_template_id && t.status !== "draft" && (
                    <DropdownMenuItem
                      onClick={() => handleRefreshStatus(t.id)}
                      disabled={refreshingStatus === t.id}
                    >
                      {refreshingStatus === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh status from Meta
                    </DropdownMenuItem>
                  )}
                  {t.status === "draft" && (
                    <DropdownMenuItem
                      className="text-red-600 dark:text-red-400"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>
              Create a message template for WhatsApp. Use variables like {"{{1}}"}, {"{{2}}"} in the body.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Name *</Label>
                <Input
                  id="form-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="hello_world"
                  required
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-language">Language</Label>
                <Input
                  id="form-language"
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  placeholder="en"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as typeof formCategory)}
                className="flex h-9 w-full rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-1 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-header">Header (optional)</Label>
              <Input
                id="form-header"
                value={formHeader}
                onChange={(e) => setFormHeader(e.target.value)}
                placeholder="Text header"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-body">Body</Label>
              <textarea
                id="form-body"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Hello {{1}}, your order {{2}} is ready."
                rows={4}
                className="flex w-full rounded-md border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 text-sm min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{1}}"}, {"{{2}}"}, etc. for variables. Add example values below for Meta approval.
              </p>
            </div>
            {getBodyVariableIndices(formBody).length > 0 && (
              <div className="space-y-2">
                <Label>Example values for variables (required for approval)</Label>
                <p className="text-xs text-muted-foreground">
                  Meta requires sample values for each variable when submitting. These are also used as defaults when sending.
                </p>
                <div className="flex flex-col gap-2">
                  {getBodyVariableIndices(formBody).map((idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-8">{"{{" + idx + "}}"}</span>
                      <Input
                        value={formVariableExamples[idx - 1] ?? ""}
                        onChange={(e) => {
                          const next = [...formVariableExamples];
                          next[idx - 1] = e.target.value;
                          setFormVariableExamples(next);
                        }}
                        placeholder={`Example for {{${idx}}}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="form-footer">Footer (optional)</Label>
              <Input
                id="form-footer"
                value={formFooter}
                onChange={(e) => setFormFooter(e.target.value)}
                placeholder="Disclaimer text"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : editing ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
