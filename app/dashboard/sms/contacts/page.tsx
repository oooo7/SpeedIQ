"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, MoreHorizontal, Plus, Upload, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useProjectContext } from "@/lib/projects/project-context";

type SmsContact = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  source: string | null;
  opt_out: boolean;
  consent_status: string;
};

export default function SmsContactsPage() {
  const { activeProject } = useProjectContext();
  const [contacts, setContacts] = useState<SmsContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editing, setEditing] = useState<SmsContact | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [formPhone, setFormPhone] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formConsent, setFormConsent] = useState("subscribed");
  const [formOptOut, setFormOptOut] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);

  async function fetchContacts() {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set("q", search);
      const res = await fetch(`/api/projects/${activeProject.id}/sms/contacts?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load contacts");
      setContacts(data.contacts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id, search]);

  function openAddDialog() {
    setEditing(null);
    setFormPhone("");
    setFormName("");
    setFormEmail("");
    setFormConsent("subscribed");
    setFormOptOut(false);
    setOpenAdd(true);
  }

  function openEditDialog(contact: SmsContact) {
    setEditing(contact);
    setFormPhone(contact.phone);
    setFormName(contact.name ?? "");
    setFormEmail(contact.email ?? "");
    setFormConsent(contact.consent_status ?? "unknown");
    setFormOptOut(contact.opt_out);
    setOpenAdd(true);
  }

  async function submitContact(e: FormEvent) {
    e.preventDefault();
    if (!activeProject?.id) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/projects/${activeProject.id}/sms/contacts/${editing.id}`
        : `/api/projects/${activeProject.id}/sms/contacts`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formPhone,
          name: formName || null,
          email: formEmail || null,
          source: editing?.source ?? "manual",
          consent_status: formConsent,
          opt_out: formOptOut,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save contact");
      setOpenAdd(false);
      setEditing(null);
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(contact: SmsContact) {
    if (!activeProject?.id) return;
    if (!confirm(`Delete contact ${contact.name || contact.phone}?`)) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sms/contacts/${contact.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete contact");
      toast.success("Contact deleted");
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete contact");
    }
  }

  async function toggleOptOut(contact: SmsContact) {
    if (!activeProject?.id) return;
    try {
      const next = !contact.opt_out;
      const res = await fetch(`/api/projects/${activeProject.id}/sms/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opt_out: next,
          consent_status: next ? "unsubscribed" : "subscribed",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      toast.success(next ? "Marked as opted out" : "Opt-out cleared");
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function submitImport(e: FormEvent) {
    e.preventDefault();
    if (!activeProject?.id || !importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const res = await fetch(`/api/projects/${activeProject.id}/sms/contacts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(`Imported ${data.imported ?? 0} contacts`);
      setOpenImport(false);
      setImportFile(null);
      fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="SMS Contacts" description="Manage campaign recipients and consent states." />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No contacts yet"
          description="Add contacts manually or import CSV to start SMS campaigns."
        />
      ) : (
        <div className="overflow-hidden border bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="p-3 text-left font-medium">Phone</th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Email</th>
                <th className="p-3 text-left font-medium">Source</th>
                <th className="p-3 text-left font-medium">Consent</th>
                <th className="p-3 text-left font-medium">Opt out</th>
                <th className="p-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{c.phone}</td>
                  <td className="p-3">{c.name || "—"}</td>
                  <td className="p-3">{c.email || "—"}</td>
                  <td className="p-3">{c.source || "—"}</td>
                  <td className="p-3">
                    <Badge variant={c.consent_status === "subscribed" ? "default" : "secondary"}>{c.consent_status}</Badge>
                  </td>
                  <td className="p-3">{c.opt_out ? <Badge variant="destructive">Opted out</Badge> : "—"}</td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(c)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleOptOut(c)}>
                          {c.opt_out ? "Clear opt-out" : "Mark as opted out"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteContact(c)}>
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
      )}

      <Dialog open={openAdd} onOpenChange={(open) => { setOpenAdd(open); if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "Add SMS contact"}</DialogTitle>
            <DialogDescription>Phone in E.164 format (e.g. +14155552344).</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitContact} className="space-y-3">
            <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+14155552344" required />
            <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Name (optional)" />
            <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email (optional)" />
            <select
              value={formConsent}
              onChange={(e) => setFormConsent(e.target.value)}
              className="h-10 w-full border bg-white px-3 text-sm dark:bg-gray-900"
            >
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="unknown">Unknown</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formOptOut} onChange={(e) => setFormOptOut(e.target.checked)} />
              Opted out
            </label>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpenAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openImport} onOpenChange={setOpenImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import contacts</DialogTitle>
            <DialogDescription>CSV columns: phone,name,email</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitImport} className="space-y-3">
            <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpenImport(false)}>Cancel</Button>
              <Button type="submit" disabled={!importFile || importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
