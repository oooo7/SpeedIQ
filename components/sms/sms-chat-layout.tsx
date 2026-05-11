"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArchiveRestore, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useProjectContext } from "@/lib/projects/project-context";

type SmsConversation = {
  id: string;
  contact_id: string;
  unread_count: number;
  last_message_at: string | null;
  is_archived: boolean;
  is_deleted: boolean;
  sms_contacts: { id: string; phone: string; name: string | null; opt_out?: boolean } | null;
};

type SmsMessage = {
  id: string;
  direction: "in" | "out";
  body: string | null;
  created_at: string;
  status: string;
};

type Filter = "all" | "unread" | "archived";

const POLL_MS = 8000;

export function SmsChatLayout() {
  const { activeProject } = useProjectContext();
  const [conversations, setConversations] = useState<SmsConversation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<SmsConversation | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contactLabel = useMemo(() => {
    if (!selected?.sms_contacts) return "Conversation";
    return selected.sms_contacts.name || selected.sms_contacts.phone;
  }, [selected]);

  const loadConversations = useCallback(async () => {
    if (!activeProject?.id) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sms/conversations?filter=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load conversations");
      setConversations(data.conversations ?? []);
      setSelected((current) => {
        if (current) {
          const match = (data.conversations ?? []).find((c: SmsConversation) => c.id === current.id);
          if (match) return match;
        }
        return data.conversations?.[0] ?? null;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    }
  }, [activeProject?.id, filter]);

  const loadMessages = useCallback(
    async (contactId: string) => {
      if (!activeProject?.id) return;
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/sms/conversations/${contactId}/messages`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load messages");
        setMessages(data.messages ?? []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load messages");
      }
    },
    [activeProject?.id]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selected?.contact_id) return;
    loadMessages(selected.contact_id);
  }, [selected?.contact_id, loadMessages]);

  useEffect(() => {
    if (!activeProject?.id) return;
    const id = setInterval(() => {
      loadConversations();
      if (selected?.contact_id) loadMessages(selected.contact_id);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [activeProject?.id, selected?.contact_id, loadConversations, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage() {
    if (!activeProject?.id || !selected?.contact_id || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sms/conversations/${selected.contact_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send message");
      setDraft("");
      await loadMessages(selected.contact_id);
      await loadConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function patchConversation(patch: Record<string, unknown>, successMsg: string) {
    if (!activeProject?.id || !selected?.contact_id) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/sms/conversations/${selected.contact_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(successMsg);
      loadConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  if (!activeProject) {
    return <p className="text-sm text-muted-foreground">Select a project to view SMS conversations.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
      <div className="border bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-medium">Conversations</div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadConversations}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex border-b text-xs">
          {(["all", "unread", "archived"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-2 capitalize ${filter === f ? "border-b-2 border-blue-600 font-medium" : "text-muted-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              className={`flex w-full items-center justify-between gap-2 border-b p-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                selected?.id === conv.id ? "bg-gray-50 dark:bg-gray-800/60" : ""
              }`}
              onClick={() => setSelected(conv)}
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{conv.sms_contacts?.name || conv.sms_contacts?.phone || "Unknown"}</div>
                <div className="truncate text-xs text-muted-foreground">{conv.sms_contacts?.phone || ""}</div>
              </div>
              {conv.unread_count > 0 && <Badge>{conv.unread_count}</Badge>}
            </button>
          ))}
          {conversations.length === 0 && <div className="p-3 text-sm text-muted-foreground">No conversations.</div>}
        </div>
      </div>

      <div className="border bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between border-b p-3">
          <div>
            <div className="text-sm font-medium">{contactLabel}</div>
            {selected?.sms_contacts?.phone && (
              <div className="text-xs text-muted-foreground">{selected.sms_contacts.phone}</div>
            )}
          </div>
          {selected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => patchConversation({ mark_read: true }, "Marked as read")}>
                  Mark as read
                </DropdownMenuItem>
                {selected.is_archived ? (
                  <DropdownMenuItem onClick={() => patchConversation({ is_archived: false }, "Conversation unarchived")}>
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => patchConversation({ is_archived: true }, "Conversation archived")}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Delete this conversation? Messages will remain in the database.")) {
                      patchConversation({ is_deleted: true }, "Conversation deleted");
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="h-[55vh] space-y-2 overflow-auto p-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[85%] rounded px-3 py-2 text-sm ${
                msg.direction === "out"
                  ? "ml-auto bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.body || "—"}</div>
              <div className="mt-1 text-[10px] opacity-80">
                {new Date(msg.created_at).toLocaleString()} · {msg.status}
              </div>
            </div>
          ))}
          {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages yet.</div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex gap-2 border-t p-3">
          <Input
            placeholder={selected?.sms_contacts?.opt_out ? "Contact opted out" : "Type a message..."}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={!selected || selected.sms_contacts?.opt_out}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={sending || !draft.trim() || !selected || selected.sms_contacts?.opt_out}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
