"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, MoreVertical, Plus, Trash2, Upload } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";

interface EmailSubscriber {
  id: string;
  project_id: string;
  email: string;
  name: string | null;
  tags: string[];
  source: string | null;
  status: string;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function EmailSubscribersPage() {
  const { activeProject } = useProjectContext();
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editSubscriber, setEditSubscriber] = useState<EmailSubscriber | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formTags, setFormTags] = useState("");

  const fetchSubscribers = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "200");
      const res = await fetch(`/api/projects/${activeProject.id}/email/subscribers?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setSubscribers(data.subscribers ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load subscribers");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, search, statusFilter]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const openAdd = () => {
    setFormEmail("");
    setFormName("");
    setFormTags("");
    setEditSubscriber(null);
    setAddOpen(true);
  };

  const openEdit = (s: EmailSubscriber) => {
    setEditSubscriber(s);
    setFormEmail(s.email);
    setFormName(s.name ?? "");
    setFormTags(Array.isArray(s.tags) ? s.tags.join(", ") : "");
    setAddOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    setSaving(true);
    try {
      const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
      const url = editSubscriber
        ? `/api/projects/${activeProject.id}/email/subscribers/${editSubscriber.id}`
        : `/api/projects/${activeProject.id}/email/subscribers`;
      const method = editSubscriber ? "PATCH" : "POST";
      const body = editSubscriber
        ? { email: formEmail.trim(), name: formName.trim() || null, tags }
        : { email: formEmail.trim().toLowerCase(), name: formName.trim() || null, tags, source: "manual" };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(editSubscriber ? "Subscriber updated" : "Subscriber added");
      setAddOpen(false);
      fetchSubscribers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribe = async (id: string) => {
    if (!activeProject?.id) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/subscribers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "unsubscribed" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }
      toast.success("Subscriber unsubscribed");
      fetchSubscribers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeProject?.id) return;
    if (!confirm("Remove this subscriber?")) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/subscribers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed");
      }
      toast.success("Subscriber removed");
      fetchSubscribers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id || !importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const res = await fetch(`/api/projects/${activeProject.id}/email/subscribers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(`Imported ${data.imported ?? 0} subscribers`);
      setImportOpen(false);
      setImportFile(null);
      fetchSubscribers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import");
    } finally {
      setImporting(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Email Subscribers" description="Select a project to manage subscribers." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Email Subscribers"
          description="Add subscribers manually or import CSV. Manage your email list."
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openAdd} className="gap-1">
            <Plus className="h-4 w-4" />
            Add subscriber
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white dark:bg-gray-900 p-4">
        <Input
          placeholder="Search by email, name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 bg-white dark:bg-gray-900 px-3 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading subscribers…" />
      ) : subscribers.length === 0 ? (
        <EmptyState
          icon={<Upload className="h-6 w-6" />}
          title="No subscribers yet"
          description="Add subscribers manually or import a CSV with email (and optional name) to start sending campaigns."
          actions={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={openAdd} className="gap-1">
                <Plus className="h-4 w-4" />
                Add subscriber
              </Button>
            </div>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Tags</th>
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-left p-3 font-medium">Subscribed</th>
                  <th className="w-10 p-3" />
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <td className="p-3">{s.email}</td>
                    <td className="p-3">{s.name ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={s.status === "subscribed" ? "default" : s.status === "unsubscribed" ? "outline" : "secondary"}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(s.tags) && s.tags.length > 0
                          ? s.tags.map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">
                                {t}
                              </Badge>
                            ))
                          : "—"}
                      </div>
                    </td>
                    <td className="p-3">{s.source ?? "—"}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}>Edit</DropdownMenuItem>
                          {s.status === "subscribed" && (
                            <DropdownMenuItem onClick={() => handleUnsubscribe(s.id)}>
                              Unsubscribe
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(s.id)}
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
          {total > subscribers.length && (
            <p className="text-xs text-muted-foreground p-4 border-t border-gray-100 dark:border-gray-800/80">
              Showing {subscribers.length} of {total}
            </p>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSubscriber ? "Edit subscriber" : "Add subscriber"}</DialogTitle>
            <DialogDescription>
              {editSubscriber ? "Update subscriber details." : "Add a new email subscriber."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-email">Email *</Label>
              <Input
                id="form-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
                required
                disabled={!!editSubscriber}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-name">Name</Label>
              <Input
                id="form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-tags">Tags (comma-separated)</Label>
              <Input
                id="form-tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="e.g. VIP, Newsletter"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : editSubscriber ? (
                  "Update"
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import subscribers</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: email (required), name. First row is treated as header.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImport} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">CSV file</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!importFile || importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
