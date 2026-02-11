"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Info, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";

interface Conversation {
  id: string;
  project_id: string;
  contact_id: string;
  last_message_at: string | null;
  unread_count: number;
  contact_phone: string | null;
  contact_name: string | null;
  contact_profile_picture_url: string | null;
}

interface Message {
  id: string;
  direction: string;
  type: string;
  body: string | null;
  status: string;
  created_at: string;
  meta_message_id?: string | null;
}

interface ContactInfo {
  id: string;
  phone: string;
  name: string | null;
  last_inbound_at: string | null;
  within_24h_window: boolean;
  last_inbound_meta_message_id?: string;
  profile_picture_url?: string | null;
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!activeProject?.id) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/conversations`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setConversations(data.conversations ?? []);
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Could not load conversations");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const markAsRead = useCallback(
    async (contactId: string, messageId: string, typing: boolean) => {
      if (!activeProject?.id) return;
      try {
        await fetch(
          `/api/projects/${activeProject.id}/whatsapp/conversations/${contactId}/mark-read`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message_id: messageId, typing }),
          }
        );
      } catch {
        // ignore
      }
    },
    [activeProject?.id]
  );

  const fetchMessages = useCallback(
    async (contactId: string, silent = false) => {
      if (!activeProject?.id) return;
      if (!silent) setMessagesLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${activeProject.id}/whatsapp/conversations/${contactId}/messages`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setContactInfo(data.contact ?? null);
        setMessages(data.messages ?? []);
        if (data.last_inbound_meta_message_id) {
          markAsRead(contactId, data.last_inbound_meta_message_id, false);
        }
      } catch (err) {
        if (!silent) toast.error(err instanceof Error ? err.message : "Could not load messages");
      } finally {
        if (!silent) setMessagesLoading(false);
      }
    },
    [activeProject?.id, markAsRead]
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

  // Send typing indicator when user types (debounced); Meta dismisses after ~25s or on send
  useEffect(() => {
    if (!selectedContactId || !contactInfo?.last_inbound_meta_message_id || !text.trim()) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      markAsRead(selectedContactId, contactInfo.last_inbound_meta_message_id!, true);
      typingTimeoutRef.current = null;
    }, 1000);
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [text, selectedContactId, contactInfo?.last_inbound_meta_message_id, markAsRead]);

  // Poll for new messages when tab is visible (live updates from webhook)
  useEffect(() => {
    if (!activeProject?.id) return;
    const POLL_CONVERSATIONS_MS = 15000;
    const POLL_MESSAGES_MS = 10000;
    let convInterval: ReturnType<typeof setInterval> | null = null;
    let msgInterval: ReturnType<typeof setInterval> | null = null;

    const run = () => {
      if (document.visibilityState !== "visible") return;
      fetchConversations(true);
      if (selectedContactId) {
        fetchMessages(selectedContactId, true);
      }
    };

    convInterval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchConversations(true);
    }, POLL_CONVERSATIONS_MS);

    if (selectedContactId) {
      msgInterval = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        fetchMessages(selectedContactId, true);
      }, POLL_MESSAGES_MS);
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (convInterval) clearInterval(convInterval);
      if (msgInterval) clearInterval(msgInterval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeProject?.id, selectedContactId, fetchConversations, fetchMessages]);

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
      <div className="flex flex-col gap-10">
        <PageHeader title="Live Chat" description="Select a project to view conversations." />
      </div>
    );
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function getInitial(name: string | null, phone: string | null) {
    if (name?.trim()) return name.trim().slice(0, 1).toUpperCase();
    if (phone?.trim()) return phone.slice(-1);
    return "?";
  }

  function ContactAvatar({
    name,
    phone,
    profilePictureUrl,
    className,
  }: {
    name: string | null;
    phone: string | null;
    profilePictureUrl?: string | null;
    className?: string;
  }) {
    return (
      <Avatar className={className}>
        {profilePictureUrl ? (
          <AvatarImage src={profilePictureUrl} alt="" className="object-cover" />
        ) : null}
        <AvatarFallback className="bg-[#25D366] text-white">
          {getInitial(name, phone)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Live Chat"
        description="Reply to conversations from your WhatsApp Business account."
      />
      <div className="flex h-[calc(100vh-12rem)] flex-col gap-0 overflow-hidden bg-white dark:bg-gray-900 md:flex-row">
        <div className="flex w-full flex-col border-b border-gray-100 dark:border-gray-800/80 md:w-80 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-[#f0f2f5] dark:border-gray-800/80 dark:bg-gray-900/80 p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#25D366]" />
            <h2 className="font-medium">Chats</h2>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Webhook setup help"
              >
                <Info className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(90vw,340px)] p-3 text-sm" align="end">
              <p className="font-medium mb-2">Live chat via webhook</p>
              <p className="text-muted-foreground mb-2">
                Incoming messages appear here when your webhook is configured. In{" "}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Meta App Dashboard
                </a>{" "}
                → WhatsApp → Configuration:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                <li>Callback URL: your site + <code className="bg-muted px-1">/api/webhooks/whatsapp</code></li>
                <li>Verify token: set <code className="bg-muted px-1">WHATSAPP_VERIFY_TOKEN</code> in env</li>
                <li>Subscribe to <strong>messages</strong> (and optionally <strong>message_template_status_update</strong>)</li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
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
                className={`flex w-full items-center gap-3 border-b border-gray-100 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50 ${
                  selectedContactId === conv.contact_id ? "bg-gray-100 dark:bg-gray-900/70" : ""
                }`}
              >
                <ContactAvatar
                  name={conv.contact_name}
                  phone={conv.contact_phone}
                  profilePictureUrl={conv.contact_profile_picture_url}
                  className="h-12 w-12 shrink-0 text-lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">
                      {conv.contact_name || conv.contact_phone || "Unknown"}
                    </span>
                    {conv.last_message_at && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted-foreground">
                      {conv.contact_phone ?? ""}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center bg-[#25D366] px-1.5 text-xs font-medium text-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#e5ddd5] dark:bg-gray-900">
        {!selectedContactId ? (
          <div className="flex flex-1 items-center justify-center bg-[#efeae2] dark:bg-gray-900">
            <p className="text-sm text-muted-foreground">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-gray-200 bg-[#f0f2f5] px-4 py-3 dark:border-gray-800 dark:bg-gray-900/80">
              <ContactAvatar
                name={contactInfo?.name ?? null}
                phone={contactInfo?.phone ?? null}
                profilePictureUrl={contactInfo?.profile_picture_url}
                className="h-10 w-10 shrink-0 text-sm"
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {contactInfo?.name || contactInfo?.phone || "Unknown"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {contactInfo?.within_24h_window ? "Available" : "Template only"}
                </span>
              </div>
              {contactInfo && !contactInfo.within_24h_window && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Template only
                </Badge>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-[#efeae2] p-2 dark:bg-gray-900 sm:p-4">
              {messagesLoading ? (
                <LoadingState message="Loading messages…" className="py-8 max-w-none" />
              ) : (
                <div className="space-y-1">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[85%] min-w-[100px] px-2 py-1 text-sm ${
                          msg.direction === "out"
                            ? " bg-[#dcf8c6] text-gray-900 dark:bg-[#005c4b] dark:text-white"
                            : " bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        }`}
                      >
                        {msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-muted-foreground opacity-90">
                            {formatTime(msg.created_at)}
                          </span>
                          {msg.direction === "out" && (
                            <span className="inline-flex text-muted-foreground">
                              {msg.status === "read" ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                              ) : msg.status === "delivered" ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-gray-200 bg-[#f0f2f5] p-2 dark:border-gray-800 dark:bg-gray-900/80 sm:p-3">
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
                  className="flex items-center gap-2"
                >
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message"
                    disabled={sending}
                    className="min-h-12 flex-1 border-gray-300 bg-white px-4 dark:border-gray-700 dark:bg-gray-800"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sending || !text.trim()}
                    className="h-10 w-10 shrink-0 bg-[#25D366] text-white hover:bg-[#20bd5a] dark:bg-[#25D366] dark:hover:bg-[#20bd5a]"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
