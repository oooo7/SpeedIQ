"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { useProjectContext } from "@/lib/projects/project-context";

interface Conversation {
  id: string;
  project_id: string;
  contact_id: string;
  last_message_at: string | null;
  unread_count: number;
  contact_phone: string | null;
  contact_name: string | null;
}

interface Message {
  id: string;
  direction: string;
  type: string;
  body: string | null;
  status: string;
  created_at: string;
}

interface ContactInfo {
  id: string;
  phone: string;
  name: string | null;
  last_inbound_at: string | null;
  within_24h_window: boolean;
}

export default function WhatsAppLiveChatPage() {
  const { activeProject } = useProjectContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; language: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/conversations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setConversations(data.conversations ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load conversations");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(
    async (contactId: string) => {
      if (!activeProject?.id) return;
      setMessagesLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${activeProject.id}/whatsapp/conversations/${contactId}/messages`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setContactInfo(data.contact ?? null);
        setMessages(data.messages ?? []);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load messages");
      } finally {
        setMessagesLoading(false);
      }
    },
    [activeProject?.id]
  );

  useEffect(() => {
    if (selectedContactId) {
      fetchMessages(selectedContactId);
    } else {
      setContactInfo(null);
      setMessages([]);
    }
  }, [selectedContactId, fetchMessages]);

  useEffect(() => {
    if (activeProject?.id && selectedContactId) {
      const res = fetch(`/api/projects/${activeProject.id}/whatsapp/templates?status=approved`)
        .then((r) => r.json())
        .then((d) => setTemplates(d.templates ?? []))
        .catch(() => setTemplates([]));
    } else {
      setTemplates([]);
    }
  }, [activeProject?.id, selectedContactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!activeProject?.id || !selectedContactId) return;
    const trimmed = text.trim();
    if (!trimmed && !contactInfo?.within_24h_window) {
      toast.error("Outside 24h window. Use a template.");
      return;
    }
    if (!trimmed && contactInfo?.within_24h_window) {
      toast.error("Enter a message");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/conversations/${selectedContactId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.within_24h === false) {
          toast.error("Outside 24h window. Send a template message only.");
        } else {
          toast.error(data.error ?? "Failed to send");
        }
        return;
      }
      setText("");
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      fetchConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (templateName: string, templateLanguage: string) => {
    if (!activeProject?.id || !selectedContactId) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/conversations/${selectedContactId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_name: templateName,
            template_language: templateLanguage,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send template");
        return;
      }
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      fetchConversations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Live Chat</h1>
        <p className="text-sm text-muted-foreground">Select a project to view conversations.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 md:flex-row">
      <div className="w-full border-b border-gray-200 dark:border-gray-800 md:w-80 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 p-3">
          <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-500" />
          <h2 className="font-semibold">Conversations</h2>
        </div>
        <div className="overflow-y-auto">
          {loading ? (
            <LoadingState message="Loading conversations…" className="py-8 max-w-none" />
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedContactId(conv.contact_id)}
                className={`flex w-full flex-col gap-0.5 border-b border-gray-100 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50 ${
                  selectedContactId === conv.contact_id ? "bg-gray-100 dark:bg-gray-900/70" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium">
                    {conv.contact_name || conv.contact_phone || "Unknown"}
                  </span>
                  {conv.unread_count > 0 && (
                    <Badge variant="default" className="shrink-0 text-xs">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {conv.contact_phone ?? conv.contact_id}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col min-h-0">
        {!selectedContactId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 p-3">
              <span className="font-medium">
                {contactInfo?.name || contactInfo?.phone || selectedContactId}
              </span>
              {contactInfo && !contactInfo.within_24h_window && (
                <Badge variant="secondary" className="text-xs">
                  Template only
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messagesLoading ? (
                <LoadingState message="Loading messages…" className="py-8 max-w-none" />
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.direction === "out"
                          ? "bg-green-600 text-white dark:bg-green-700"
                          : "bg-gray-200 dark:bg-gray-800"
                      }`}
                    >
                      {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                      <span className="mt-1 block text-xs opacity-80">
                        {new Date(msg.created_at).toLocaleTimeString()} {msg.status !== "sent" && `· ${msg.status}`}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 p-3">
              {contactInfo && !contactInfo.within_24h_window ? (
                <div className="space-y-2">
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Outside 24h window. You can only send approved templates.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((t) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        disabled={sending}
                        onClick={() => handleSendTemplate(t.name, t.language)}
                      >
                        {t.name}
                      </Button>
                    ))}
                    {templates.length === 0 && (
                      <p className="text-xs text-muted-foreground">No approved templates.</p>
                    )}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sending || !text.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
