"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardPaste, Download, Loader2, MoreVertical, Plus, Trash2, Upload, Users, X } from "lucide-react";
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

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === "," || c === "\t") {
        current.push(cell);
        cell = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        current.push(cell);
        if (current.some((v) => v.trim())) rows.push(current);
        current = [];
        cell = "";
      } else {
        cell += c;
      }
    }
  }
  if (cell || current.length) {
    current.push(cell);
    if (current.some((v) => v.trim())) rows.push(current);
  }
  return rows;
}

function detectColumns(header: string[]): { phone: number; name: number; email: number; tags: number } {
  const lower = header.map((h) => h.trim().toLowerCase());
  const findIdx = (re: RegExp) => lower.findIndex((h) => re.test(h));
  let phone = findIdx(/phone|number|mobile|tel/);
  if (phone < 0) phone = 0;
  return {
    phone,
    name: findIdx(/name|full.?name/),
    email: findIdx(/email/),
    tags: findIdx(/^(tags?|labels?)$/),
  };
}

function parseTagCell(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

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
  const [importMode, setImportMode] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvColumns, setCsvColumns] = useState<{ phone: number; name: number; email: number; tags: number }>({ phone: 0, name: -1, email: -1, tags: -1 });
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvParsing, setCsvParsing] = useState(false);

  const parsedPasteNumbers = useMemo(() => {
    return pasteText
      .split(/\r?\n|,|;/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [pasteText]);

  useEffect(() => {
    if (!importFile) {
      setCsvRows([]);
      setCsvError(null);
      return;
    }
    let cancelled = false;
    setCsvParsing(true);
    setCsvError(null);
    importFile
      .text()
      .then((text) => {
        if (cancelled) return;
        const rows = parseCsvText(text.trim());
        if (rows.length < 2) {
          setCsvRows([]);
          setCsvError("CSV needs a header row and at least one data row.");
          return;
        }
        setCsvRows(rows);
        setCsvColumns(detectColumns(rows[0]));
      })
      .catch((err) => {
        if (cancelled) return;
        setCsvError(err instanceof Error ? err.message : "Could not read file");
        setCsvRows([]);
      })
      .finally(() => {
        if (!cancelled) setCsvParsing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [importFile]);

  const csvDataRowCount = csvRows.length > 1 ? csvRows.length - 1 : 0;
  const [saving, setSaving] = useState(false);
  const [formPhone, setFormPhone] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formSource, setFormSource] = useState("manual");
  const [tagDefinitions, setTagDefinitions] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [addingTagContactId, setAddingTagContactId] = useState<string | null>(null);
  const [updatingTagsContactId, setUpdatingTagsContactId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const visibleIds = useMemo(() => contacts.map((c) => c.id), [contacts]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (!activeProject?.id || selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected contact${selectedIds.size === 1 ? "" : "s"}?`)) return;
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/projects/${activeProject.id}/whatsapp/contacts/${id}`, { method: "DELETE" }).then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Failed");
          }
        })
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = ids.length - failed;
    if (succeeded > 0) toast.success(`Deleted ${succeeded} contact${succeeded === 1 ? "" : "s"}`);
    if (failed > 0) toast.error(`${failed} delete${failed === 1 ? "" : "s"} failed`);
    clearSelection();
    setBulkDeleting(false);
    fetchContacts();
  };

  const downloadSampleCsv = () => {
    const csv =
      "phone,name,email,tags\n" +
      "+14155552671,Jane Doe,jane@example.com,\"vip,customer\"\n" +
      "+919876543210,John Smith,john@example.com,lead\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "whatsapp-contacts-sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, sourceFilter, tagFilter]);

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
    if (!activeProject?.id) return;

    let text: string;
    let columnMap: { phone: number; name?: number; email?: number; tags?: number } | undefined;
    if (importMode === "file") {
      if (!importFile) {
        toast.error("Select a CSV file");
        return;
      }
      if (csvError) {
        toast.error(csvError);
        return;
      }
      text = await importFile.text();
      columnMap = {
        phone: csvColumns.phone,
        ...(csvColumns.name >= 0 ? { name: csvColumns.name } : {}),
        ...(csvColumns.email >= 0 ? { email: csvColumns.email } : {}),
        ...(csvColumns.tags >= 0 ? { tags: csvColumns.tags } : {}),
      };
    } else {
      if (parsedPasteNumbers.length === 0) {
        toast.error("Paste at least one phone number");
        return;
      }
      text = ["phone", ...parsedPasteNumbers].join("\n");
    }

    setImporting(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text, ...(columnMap ? { columnMap } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      const imported = data.imported ?? 0;
      const skipped = data.skipped ?? 0;
      if (imported > 0) toast.success(`Imported ${imported} contact${imported === 1 ? "" : "s"}`);
      if (skipped > 0) toast.warning(`Skipped ${skipped} row${skipped === 1 ? "" : "s"} (invalid or duplicate)`);
      if (imported === 0 && skipped === 0) toast.info("Nothing to import");
      setImportOpen(false);
      setImportFile(null);
      setPasteText("");
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

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 px-4 py-2.5">
          <p className="text-sm font-medium">
            {selectedIds.size} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={bulkDeleting}>
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete selected
            </Button>
          </div>
        </div>
      )}

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
                  <th className="w-10 p-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="border-gray-300 cursor-pointer"
                    />
                  </th>
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
                    className={`border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30 ${
                      selectedIds.has(c.id) ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${c.phone}`}
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="border-gray-300 cursor-pointer"
                      />
                    </td>
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

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportFile(null);
            setPasteText("");
            setImportMode("file");
            setCsvRows([]);
            setCsvError(null);
          }
        }}
      >
        <DialogContent className={importMode === "file" && csvRows.length > 0 ? "sm:max-w-2xl" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>Import contacts</DialogTitle>
            <DialogDescription>
              Upload a CSV file or paste a list of phone numbers (one per line).
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 bg-gray-50 dark:bg-gray-800/30 p-1 w-fit">
            <button
              type="button"
              onClick={() => setImportMode("file")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                importMode === "file"
                  ? "bg-white dark:bg-gray-800 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload CSV
            </button>
            <button
              type="button"
              onClick={() => setImportMode("paste")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                importMode === "paste"
                  ? "bg-white dark:bg-gray-800 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste numbers
            </button>
          </div>

          <form onSubmit={handleImport} className="space-y-4">
            {importMode === "file" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="import-file">CSV file</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={downloadSampleCsv}
                      className="h-auto p-0 text-xs gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download sample CSV
                    </Button>
                  </div>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Columns: phone (required), name, email, tags. First row is treated as header. Use comma, semicolon or pipe to separate multiple tags in one cell (e.g. <span className="font-mono">&quot;vip,customer&quot;</span>). Missing tags are created automatically.
                  </p>
                </div>

                {csvParsing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Parsing file…
                  </div>
                )}

                {csvError && (
                  <div className="flex items-start gap-2 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-800 dark:text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{csvError}</span>
                  </div>
                )}

                {!csvError && csvRows.length > 0 && (
                  <div className="space-y-2 border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium">
                        Preview — {csvDataRowCount} row{csvDataRowCount === 1 ? "" : "s"} ready to import
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-xs">
                          phone: {csvRows[0][csvColumns.phone] || `column ${csvColumns.phone + 1}`}
                        </Badge>
                        {csvColumns.name >= 0 && (
                          <Badge variant="outline" className="text-xs">
                            name: {csvRows[0][csvColumns.name]}
                          </Badge>
                        )}
                        {csvColumns.email >= 0 && (
                          <Badge variant="outline" className="text-xs">
                            email: {csvRows[0][csvColumns.email]}
                          </Badge>
                        )}
                        {csvColumns.tags >= 0 && (
                          <Badge variant="outline" className="text-xs">
                            tags: {csvRows[0][csvColumns.tags]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-64 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium w-8 text-muted-foreground">#</th>
                            <th className="text-left p-2 font-medium">Phone</th>
                            <th className="text-left p-2 font-medium">Name</th>
                            <th className="text-left p-2 font-medium">Email</th>
                            <th className="text-left p-2 font-medium">Tags</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvRows.slice(1, 11).map((row, idx) => {
                            const phone = row[csvColumns.phone]?.trim() ?? "";
                            const name = csvColumns.name >= 0 ? row[csvColumns.name]?.trim() ?? "" : "";
                            const email = csvColumns.email >= 0 ? row[csvColumns.email]?.trim() ?? "" : "";
                            const tags = csvColumns.tags >= 0 ? parseTagCell(row[csvColumns.tags]) : [];
                            const phoneValid = !!phone && isValidPhone(phone);
                            return (
                              <tr key={idx} className="border-t border-gray-100 dark:border-gray-800/50">
                                <td className="p-2 text-muted-foreground">{idx + 1}</td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1">
                                    <span className={phone ? "" : "text-muted-foreground italic"}>
                                      {phone || "—"}
                                    </span>
                                    {phone && !phoneValid && (
                                      <span title="May fail validation — check country code / format">
                                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">{name || <span className="text-muted-foreground">—</span>}</td>
                                <td className="p-2">{email || <span className="text-muted-foreground">—</span>}</td>
                                <td className="p-2">
                                  {tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {tags.map((t) => (
                                        <Badge key={t} variant="secondary" className="text-[10px] py-0 px-1.5 rounded-full">
                                          {t}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {csvDataRowCount > 10 && (
                      <p className="text-xs text-muted-foreground">
                        Showing first 10 of {csvDataRowCount} rows.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="paste-numbers">Phone numbers</Label>
                <textarea
                  id="paste-numbers"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"+14155552671\n+919876543210\n+447700900000\n…"}
                  rows={8}
                  className="flex w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <p className="text-xs text-muted-foreground">
                  Paste one number per line (copy a single column from a sheet). Commas and semicolons also work as separators.
                  {parsedPasteNumbers.length > 0 && (
                    <>
                      {" "}
                      Detected <span className="font-medium text-foreground">{parsedPasteNumbers.length}</span> number
                      {parsedPasteNumbers.length === 1 ? "" : "s"}.
                    </>
                  )}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  importing ||
                  (importMode === "file"
                    ? !importFile || csvParsing || !!csvError || csvDataRowCount === 0
                    : parsedPasteNumbers.length === 0)
                }
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : importMode === "file" && csvDataRowCount > 0 ? (
                  `Import ${csvDataRowCount}`
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
