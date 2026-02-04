"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">All Contacts</h1>
        <p className="text-sm text-muted-foreground">Select a project to view contacts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-xl font-semibold">All Contacts</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/whatsapp/contacts">
            <Button variant="outline" size="sm" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              WhatsApp contacts
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        View and search contacts across WhatsApp and email for this project.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2 border border-gray-200 dark:border-gray-800 rounded-md p-1">
          {(["all", "whatsapp", "email"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize ${
                channel === c
                  ? "bg-gray-200 dark:bg-gray-800 text-foreground"
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
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 border-dashed p-12 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Email contacts</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Email subscribers and contacts will appear here when Email Marketing is available.
          </p>
          <p className="text-xs text-muted-foreground">Coming soon</p>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No {channel === "all" ? "" : "WhatsApp "}contacts yet.
          </p>
          <Link href="/dashboard/whatsapp/contacts" className="mt-2 inline-block">
            <Button variant="outline" size="sm">
              Add WhatsApp contacts
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
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
            <p className="text-xs text-muted-foreground p-2 border-t border-gray-200 dark:border-gray-800">
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
