"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, MoreVertical, Plus, Send, Trash2 } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function WhatsAppTemplatesPage() {
  const { activeProject } = useProjectContext();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhatsAppTemplate | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<"marketing" | "utility" | "authentication">("marketing");
  const [formLanguage, setFormLanguage] = useState("en");
  const [formBody, setFormBody] = useState("");
  const [formHeader, setFormHeader] = useState("");
  const [formFooter, setFormFooter] = useState("");

  const fetchTemplates = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates${params}`);
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
          variables: [],
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
        <h1 className="text-xl font-semibold">Templates</h1>
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No templates yet. Create one to use in campaigns or for 24-hour window messaging.
        </p>
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
            </div>
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
