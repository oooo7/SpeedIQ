"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProjectContext } from "@/lib/projects/project-context";

type SmsTemplate = { id: string; name: string };
type Campaign = {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  recipient_count: number;
  sent_count: number;
  pending_count: number;
  failed_count: number;
};

export default function SmsCampaignsPage() {
  const { activeProject } = useProjectContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; phone: string; name: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  async function fetchData() {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const [campaignRes, templateRes, contactRes] = await Promise.all([
        fetch(`/api/projects/${activeProject.id}/sms/campaigns`),
        fetch(`/api/projects/${activeProject.id}/sms/templates`),
        fetch(`/api/projects/${activeProject.id}/sms/contacts`),
      ]);
      const [campaignData, templateData, contactData] = await Promise.all([
        campaignRes.json(),
        templateRes.json(),
        contactRes.json(),
      ]);
      if (!campaignRes.ok) throw new Error(campaignData.error ?? "Failed to load campaigns");
      if (!templateRes.ok) throw new Error(templateData.error ?? "Failed to load templates");
      if (!contactRes.ok) throw new Error(contactData.error ?? "Failed to load contacts");
      setCampaigns(campaignData.campaigns ?? []);
      setTemplates(templateData.templates ?? []);
      setContacts(contactData.contacts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  async function createCampaign(e: FormEvent) {
    e.preventDefault();
    if (!activeProject?.id) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        template_id: templateId,
        contact_ids: selectedContacts,
      };
      if (saveAsDraft) {
        payload.save_as_draft = true;
      } else if (scheduleAt) {
        payload.scheduled_at = new Date(scheduleAt).toISOString();
      } else {
        payload.send_now = true;
      }

      const res = await fetch(`/api/projects/${activeProject.id}/sms/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");
      setOpen(false);
      setName("");
      setTemplateId("");
      setSelectedContacts([]);
      setScheduleAt("");
      setSaveAsDraft(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="SMS Campaigns" description="Create, schedule, and monitor SMS campaigns." />
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns...</p>
      ) : campaigns.length === 0 ? (
        <div className="border bg-white p-4 text-sm text-muted-foreground dark:bg-gray-900">No campaigns yet.</div>
      ) : (
        <div className="overflow-hidden border bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Recipients</th>
                <th className="p-3 text-left font-medium">Sent</th>
                <th className="p-3 text-left font-medium">Pending</th>
                <th className="p-3 text-left font-medium">Failed</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link href={`/dashboard/sms/campaigns/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3">{c.status}</td>
                  <td className="p-3">{c.recipient_count}</td>
                  <td className="p-3">{c.sent_count}</td>
                  <td className="p-3">{c.pending_count}</td>
                  <td className="p-3">{c.failed_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create campaign</DialogTitle>
            <DialogDescription>Choose template and recipients. Leave schedule empty to send now.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createCampaign} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" required />
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="h-10 w-full border bg-white px-3 text-sm dark:bg-gray-900"
              required
            >
              <option value="">Select template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="max-h-44 overflow-auto border p-2 text-sm">
              {contacts.map((contact) => (
                <label key={contact.id} className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedContacts.includes(contact.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedContacts((prev) => [...prev, contact.id]);
                      else setSelectedContacts((prev) => prev.filter((id) => id !== contact.id));
                    }}
                  />
                  <span>{contact.name || contact.phone}</span>
                </label>
              ))}
            </div>
            <Input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              disabled={saveAsDraft}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveAsDraft}
                onChange={(e) => setSaveAsDraft(e.target.checked)}
              />
              Save as draft (don&apos;t send yet)
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
