"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, MoreVertical, Plus, Trash2, Upload, Users, X } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";
import { isValidPhone } from "@/lib/whatsapp/phone";

interface ContactTag {
  id: string;
  name: string;
}

interface WhatsAppContact {
  id: string;
  project_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  custom_fields: Record<string, unknown>;
  tags: ContactTag[];
  source: string | null;
  last_inbound_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function WhatsAppContactsPage() {
  const { activeProject } = useProjectContext();
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editContact, setEditContact] = useState<WhatsAppContact | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formPhone, setFormPhone] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formSource, setFormSource] = useState("manual");
  const [tagDefinitions, setTagDefinitions] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [addingTagContactId, setAddingTagContactId] = useState<string | null>(null);
  const [updatingTagsContactId, setUpdatingTagsContactId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sourceFilter) params.set("source", sourceFilter);
      if (tagFilter) params.set("tag", tagFilter);
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load contacts");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, search, sourceFilter, tagFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const fetchTagDefinitions = useCallback(async () => {
    if (!activeProject?.id) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/tag-definitions`);
      const data = await res.json();
      if (res.ok) setTagDefinitions(data.tags ?? []);
    } catch {
      setTagDefinitions([]);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchTagDefinitions();
  }, [fetchTagDefinitions]);

  const handleAddTagToContact = async (contactId: string, tagId: string) => {
    if (!activeProject?.id) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const currentIds = Array.isArray(contact.tags) ? contact.tags.map((t) => t.id) : [];
    if (currentIds.includes(tagId)) {
      setAddingTagContactId(null);
      return;
    }
    setUpdatingTagsContactId(contactId);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_ids: [...currentIds, tagId] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add tag");
      }
      setAddingTagContactId(null);
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add tag");
    } finally {
      setUpdatingTagsContactId(null);
    }
  };

  const handleRemoveTagFromContact = async (contactId: string, tagIdToRemove: string) => {
    if (!activeProject?.id) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    const currentIds = Array.isArray(contact.tags) ? contact.tags.map((t) => t.id) : [];
    const next = currentIds.filter((id) => id !== tagIdToRemove);
    setUpdatingTagsContactId(contactId);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag_ids: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to remove tag");
      }
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove tag");
    } finally {
      setUpdatingTagsContactId(null);
    }
  };

  const openAdd = () => {
    setFormPhone("");
    setFormName("");
    setFormEmail("");
    setFormTagIds([]);
    setFormSource("manual");
    setEditContact(null);
    setAddOpen(true);
  };

  const openEdit = (c: WhatsAppContact) => {
    setEditContact(c);
    setFormPhone(c.phone);
    setFormName(c.name ?? "");
    setFormEmail(c.email ?? "");
    setFormTagIds(Array.isArray(c.tags) ? c.tags.map((t) => t.id) : []);
    setFormSource(c.source ?? "manual");
    setAddOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!formPhone.trim()) {
      toast.error("Phone is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        phone: formPhone.trim(),
        name: formName.trim() || null,
        email: formEmail.trim() || null,
        tag_ids: formTagIds,
        source: formSource.trim() || "manual",
      };
      const url = editContact
        ? `/api/projects/${activeProject.id}/whatsapp/contacts/${editContact.id}`
        : `/api/projects/${activeProject.id}/whatsapp/contacts`;
      const method = editContact ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(editContact ? "Contact updated" : "Contact added");
      setAddOpen(false);
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeProject?.id || !window.confirm("Delete this contact?")) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Contact deleted");
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id || !importFile) {
      toast.error("Select a CSV file");
      return;
    }
    setImporting(true);
    try {
      const text = await importFile.text();
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(`Imported ${data.imported ?? 0} contacts`);
      setImportOpen(false);
      setImportFile(null);
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import");
    } finally {
      setImporting(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Contacts" description="Select a project to manage contacts." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
<PageHeader
        title="Contacts"
        description="Add contacts manually or import CSV. Manage tags in Settings."
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openAdd} className="gap-1">
            <Plus className="h-4 w-4" />
            Add contact
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white dark:bg-gray-900 p-4">
        <Input
          placeholder="Search by phone, name, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="flex h-9 bg-white dark:bg-gray-900 px-3 py-1 text-sm"
        >
          <option value="">All sources</option>
          <option value="manual">Manual</option>
          <option value="import">Import</option>
          <option value="campaign">Campaign</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="flex h-9 bg-white dark:bg-gray-900 px-3 py-1 text-sm"
        >
          <option value="">All tags</option>
          {tagDefinitions.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading contacts…" />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No contacts yet"
          description="Add contacts manually or import a CSV to start sending messages and running campaigns."
          actions={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
              <Button onClick={openAdd} className="gap-1">
                <Plus className="h-4 w-4" />
                Add contact
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
                  <th className="text-left p-3 font-medium">Phone</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Tags</th>
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="w-10 p-3" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span>{c.phone}</span>
                        {!isValidPhone(c.phone) && (
                          <span title="Invalid phone number — missing country code or wrong format">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{c.name ?? "—"}</td>
                    <td className="p-3">{c.email ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1 min-w-[140px]">
                        {Array.isArray(c.tags) &&
                          c.tags.map((t) => (
                            <Badge
                              key={t.id}
                              variant="secondary"
                              className="text-xs gap-0.5 pr-1 pl-2 py-0"
                            >
                              {t.name}
                              <button
                                type="button"
                                onClick={() => handleRemoveTagFromContact(c.id, t.id)}
                                disabled={updatingTagsContactId === c.id}
                                className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50"
                                aria-label={`Remove ${t.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        {addingTagContactId === c.id ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {tagDefinitions
                              .filter((t) => !(c.tags ?? []).some((ct) => ct.id === t.id))
                              .map((t) => (
                                <Button
                                  key={t.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleAddTagToContact(c.id, t.id)}
                                  disabled={updatingTagsContactId === c.id}
                                >
                                  + {t.name}
                                </Button>
                              ))}
                            {tagDefinitions.filter((t) => !(c.tags ?? []).some((ct) => ct.id === t.id)).length === 0 && (
                              <span className="text-xs text-muted-foreground">All tags assigned</span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setAddingTagContactId(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => setAddingTagContactId(c.id)}
                            disabled={updatingTagsContactId === c.id}
                          >
                            <Plus className="h-3 w-3 mr-0.5" />
                            Add
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{c.source ?? "—"}</td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(c.id)}
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
          {total > contacts.length && (
            <p className="text-xs text-muted-foreground p-4 border-t border-gray-100 dark:border-gray-800/80">
              Showing {contacts.length} of {total}
            </p>
          )}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? "Edit contact" : "Add contact"}</DialogTitle>
            <DialogDescription>
              {editContact ? "Update contact details." : "Add a new WhatsApp contact."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-phone">Phone *</Label>
              <Input
                id="form-phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1234567890"
                required
                disabled={!!editContact}
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
              <Label htmlFor="form-email">Email</Label>
              <Input
                id="form-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <p className="text-xs text-muted-foreground">Select one or more tags. Create tags in Settings → Tags first.</p>
              <div className="flex flex-wrap gap-3 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 min-h-[44px]">
                {tagDefinitions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No tags yet. Create tags in Settings → Tags.</span>
                ) : (
                  tagDefinitions.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formTagIds.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) setFormTagIds((prev) => [...prev, t.id]);
                          else setFormTagIds((prev) => prev.filter((id) => id !== t.id));
                        }}
                        className="border-gray-300"
                      />
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            {!editContact && (
              <div className="space-y-2">
                <Label htmlFor="form-source">Source</Label>
                <Input
                  id="form-source"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="manual"
                />
              </div>
            )}
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
                ) : editContact ? (
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
            <DialogTitle>Import contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: phone (required), name, email. First row is treated as header.
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
