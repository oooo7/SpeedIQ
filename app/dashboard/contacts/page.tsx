"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { useProjectContext } from "@/lib/projects/project-context";

type ChannelFilter = "all" | "whatsapp" | "email";

interface ContactRow {
  id: string;
  channel: "whatsapp" | "email";
  phone?: string;
  name: string | null;
  email: string | null;
  tags: string[];
  source: string | null;
  created_at: string;
}

export default function AllContactsPage() {
  const { activeProject } = useProjectContext();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [search, setSearch] = useState("");

  const fetchContacts = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      if (channel === "email") {
        setContacts([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/contacts?${params}&limit=200`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const list = (data.contacts ?? []) as Array<{
        id: string;
        phone: string;
        name: string | null;
        email: string | null;
        tags: string[];
        source: string | null;
        created_at: string;
      }>;
      setContacts(
        channel === "all"
          ? list.map((c) => ({ ...c, channel: "whatsapp" as const }))
          : list.map((c) => ({ ...c, channel: "whatsapp" as const }))
      );
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load contacts");
      setContacts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, channel, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="All Contacts" description="Select a project to view contacts." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="All Contacts"
          description="View and search contacts across WhatsApp and email for this project."
        />
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link href="/dashboard/whatsapp/contacts">
            <Button variant="outline" size="sm" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              WhatsApp contacts
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-white dark:bg-gray-900 p-4">
        <div className="flex gap-1 bg-gray-50 dark:bg-gray-800/30 p-1 w-fit">
          {(["all", "whatsapp", "email"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                channel === c
                  ? "bg-white dark:bg-gray-800 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "all" ? "All" : c === "whatsapp" ? "WhatsApp" : "Email"}
            </button>
          ))}
        </div>
        {channel !== "email" && (
          <Input
            placeholder="Search by phone, name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        )}
      </div>

      {channel === "email" ? (
        <div className="bg-white dark:bg-gray-900 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center bg-gray-100 dark:bg-gray-800/80 text-muted-foreground mx-auto mb-4">
            <Mail className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-medium mb-2">Email contacts</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Email subscribers and contacts will appear here when Email Marketing is available. Coming soon.
          </p>
        </div>
      ) : loading ? (
        <LoadingState message="Loading contacts…" />
      ) : contacts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-10 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No {channel === "all" ? "" : "WhatsApp "}contacts yet.
          </p>
          <Link href="/dashboard/whatsapp/contacts">
            <Button variant="outline" size="sm">
              Add WhatsApp contacts
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left p-3 font-medium">Channel</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Phone / Email</th>
                  <th className="text-left p-3 font-medium">Tags</th>
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="w-20 p-3" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={`${c.channel}-${c.id}`}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <td className="p-3">
                      {c.channel === "whatsapp" ? (
                        <Badge variant="secondary" className="gap-1">
                          <MessageSquare className="h-3 w-3" />
                          WhatsApp
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">{c.name ?? "—"}</td>
                    <td className="p-3">
                      {c.channel === "whatsapp" ? (c.phone ?? "—") : (c.email ?? "—")}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(c.tags) && c.tags.length > 0
                          ? c.tags.map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">
                                {t}
                              </Badge>
                            ))
                          : "—"}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.source ?? "—"}</td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {c.channel === "whatsapp" && (
                        <Link href="/dashboard/whatsapp/contacts">
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > contacts.length && (
            <p className="text-xs text-muted-foreground p-4 border-t border-gray-100 dark:border-gray-800/80">
              Showing {contacts.length} of {total}. Manage all in{" "}
              <Link href="/dashboard/whatsapp/contacts" className="underline">
                WhatsApp contacts
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}
