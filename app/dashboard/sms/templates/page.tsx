"use client";

import { FormEvent, useEffect, useState } from "react";
import { FileText, Loader2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useProjectContext } from "@/lib/projects/project-context";

type SmsTemplate = { id: string; name: string; body: string; variables: string[] };

export default function SmsTemplatesPage() {
  const { activeProject } = useProjectContext();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  async function fetchTemplates() {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sms/templates`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load templates");
      setTemplates(data.templates ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  function openCreate() {
    setEditing(null);
    setName("");
    setBody("");
    setOpen(true);
  }

  function openEdit(template: SmsTemplate) {
    setEditing(template);
    setName(template.name);
    setBody(template.body);
    setOpen(true);
  }

  async function submitTemplate(e: FormEvent) {
    e.preventDefault();
    if (!activeProject?.id) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/projects/${activeProject.id}/sms/templates/${editing.id}`
        : `/api/projects/${activeProject.id}/sms/templates`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save template");
      setOpen(false);
      setEditing(null);
      setName("");
      setBody("");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(template: SmsTemplate) {
    if (!activeProject?.id) return;
    if (!confirm(`Delete template "${template.name}"?`)) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sms/templates/${template.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete template");
      toast.success("Template deleted");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="SMS Templates" description="Reusable SMS message templates with variable placeholders." />
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates...</p>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" />}
          title="No templates yet"
          description="Create your first SMS template."
        />
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <div key={template.id} className="border bg-white p-4 dark:bg-gray-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{template.name}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{template.body}</p>
                  {Array.isArray(template.variables) && template.variables.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">Variables: {template.variables.join(", ")}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(template)}>Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteTemplate(template)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "Create template"}</DialogTitle>
            <DialogDescription>Use placeholders like {"{{name}}"} and {"{{phone}}"}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitTemplate} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" required />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Template body..."
              required
              rows={6}
              className="w-full border bg-white p-2 text-sm dark:bg-gray-900"
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
