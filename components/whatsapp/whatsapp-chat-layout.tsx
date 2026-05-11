"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Ban,
  BarChart3,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Info,
  LayoutTemplate,
  Loader2,
  MessageSquare,
  MoreVertical,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/dashboard/page-header";

export interface Conversation {
  id: string;
  project_id: string;
  contact_id: string;
  last_message_at: string | null;
  unread_count: number;
  contact_phone: string | null;
  contact_name: string | null;
  contact_profile_picture_url: string | null;
  is_archived: boolean;
  is_deleted: boolean;
}

export interface Message {
  id: string;
  direction: string;
  type: string;
  body: string | null;
  status: string;
  created_at: string;
  meta_message_id?: string | null;
}

export interface ContactInfo {
  id: string;
  phone: string;
  name: string | null;
  last_inbound_at: string | null;
  within_24h_window: boolean;
  last_inbound_meta_message_id?: string;
  profile_picture_url?: string | null;
}

export interface ContactProfile {
  contact: {
    id: string;
    phone: string;
    name: string | null;
    source: string | null;
    last_inbound_at: string | null;
    created_at: string;
    opt_out: boolean;
    profile_picture_url: string | null;
    custom_fields: Record<string, unknown>;
  };
  status: {
    active: boolean;
    last_active: string;
    template_messages: number;
    session_messages: number;
    unresolved_queries: number;
    wa_conversation_active: boolean;
    incoming_allowed: boolean;
    opted_in: boolean;
  };
  campaigns: Array<{ id: string; name: string; sent_at: string | null }>;
  tags: Array<{ id: string; name: string; color: string | null }>;
  journey: Array<{ type: string; label: string; at: string; campaign_id?: string }>;
}

interface WhatsAppChatLayoutProps {
  projectId: string | null;
  title: string;
  description: string;
  pollIntervalMs?: number;
  showWebhookHelp?: boolean;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${formatDateShort(iso)}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

function getWindowStatus(lastInboundAt: string | null): {
  within: boolean;
  label: string;
  urgent: boolean; // < 1 hour left
} {
  if (!lastInboundAt) {
    return { within: false, label: "No inbound messages — send a template to start", urgent: false };
  }
  const elapsed = Date.now() - new Date(lastInboundAt).getTime();
  if (elapsed >= WINDOW_MS) {
    const h = Math.floor(elapsed / (60 * 60 * 1000));
    const timeAgo = h >= 48 ? `${Math.floor(h / 24)}d ago` : `${h}h ago`;
    return { within: false, label: `Chat window closed (last reply ${timeAgo})`, urgent: false };
  }
  const remaining = WINDOW_MS - elapsed;
  const h = Math.floor(remaining / (60 * 60 * 1000));
  const m = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  const urgent = remaining < 60 * 60 * 1000;
  const label = h > 0 ? `Window closes in ${h}h ${m}m` : `Window closes in ${m}m`;
  return { within: true, label, urgent };
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

export function WhatsAppChatLayout({
  projectId,
  title,
  description,
  pollIntervalMs = 15000,
  showWebhookHelp = true,
}: WhatsAppChatLayoutProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState<"all" | "unread" | "archived">("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [profile, setProfile] = useState<ContactProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; language: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tick every 60 s so the window countdown re-renders without a full fetch
  const [windowTick, setWindowTick] = useState(0);

  const fetchConversations = useCallback(
    async (silent = false, filter?: "all" | "unread" | "archived") => {
      if (!projectId) return;
      if (!silent) setLoading(true);
      try {
        const f = filter ?? conversationFilter;
        const res = await fetch(`/api/projects/${projectId}/whatsapp/conversations?filter=${f}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setConversations(data.conversations ?? []);
      } catch (err) {
        if (!silent) toast.error(err instanceof Error ? err.message : "Could not load conversations");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId, conversationFilter]
  );

  const markAsRead = useCallback(
    async (contactId: string, messageId: string, typing: boolean) => {
      if (!projectId) return;
      try {
        await fetch(`/api/projects/${projectId}/whatsapp/conversations/${contactId}/mark-read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message_id: messageId, typing }),
        });
      } catch {
        // ignore
      }
    },
    [projectId]
  );

  const fetchMessages = useCallback(
    async (contactId: string, silent = false) => {
      if (!projectId) return;
      if (!silent) setMessagesLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/whatsapp/conversations/${contactId}/messages`);
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
    [projectId, markAsRead]
  );

  const fetchProfile = useCallback(async (contactId: string) => {
    if (!projectId) return;
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/whatsapp/contacts/${contactId}/profile`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load profile");
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedContactId) {
      fetchMessages(selectedContactId);
      fetchProfile(selectedContactId);
    } else {
      setContactInfo(null);
      setProfile(null);
      setMessages([]);
    }
  }, [selectedContactId, fetchMessages, fetchProfile]);

  useEffect(() => {
    fetchConversations(false, conversationFilter);
    // When switching to archived, deselect if current conversation is not in that view
    setSelectedContactId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationFilter]);

  useEffect(() => {
    if (projectId && selectedContactId) {
      fetch(`/api/projects/${projectId}/whatsapp/templates?status=approved`)
        .then((r) => r.json())
        .then((d) => setTemplates(d.templates ?? []))
        .catch(() => setTemplates([]));
    } else {
      setTemplates([]);
    }
  }, [projectId, selectedContactId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep the window-status label fresh every minute
  useEffect(() => {
    const t = setInterval(() => setWindowTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // Derived: live window status computed from last_inbound_at (re-runs on tick + contactInfo change)
  const windowStatus = useMemo(
    () => getWindowStatus(contactInfo?.last_inbound_at ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contactInfo?.last_inbound_at, windowTick]
  );

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

  useEffect(() => {
    if (!projectId || pollIntervalMs <= 0) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchConversations(true);
      if (selectedContactId) {
        fetchMessages(selectedContactId, true);
        fetchProfile(selectedContactId);
      }
    }, pollIntervalMs);
    return () => clearInterval(t);
  }, [projectId, selectedContactId, pollIntervalMs, fetchConversations, fetchMessages, fetchProfile]);

  const handleSend = async () => {
    if (!projectId || !selectedContactId) return;
    const trimmed = text.trim();
    if (!trimmed) { toast.error("Enter a message"); return; }
    if (!windowStatus.within) {
      toast.error("24h window closed. Send a template to re-engage.");
      return;
    }

    // Optimistic: show the message immediately before the API responds
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      direction: "out",
      type: "text",
      body: trimmed,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setText("");
    setMessages((prev) => [...prev, tempMsg]);
    setSending(true);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/whatsapp/conversations/${selectedContactId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        // Remove the optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        if (data.within_24h === false) {
          // Server confirms window is closed — update contactInfo so UI flips to template mode
          setContactInfo((prev) => prev ? { ...prev, within_24h_window: false } : prev);
          toast.error("Chat window just expired. Use a template to re-engage.");
        } else {
          toast.error(data.error ?? "Failed to send");
        }
        return;
      }
      // Replace optimistic message with the real one from the server
      setMessages((prev) => prev.map((m) => m.id === tempId ? (data.message ?? m) : m));
      fetchConversations();
      if (profile) fetchProfile(selectedContactId);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (templateName: string, templateLanguage: string) => {
    if (!projectId || !selectedContactId) return;

    // Optimistic: show a placeholder immediately
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      direction: "out",
      type: "text",
      body: `Template: ${templateName}`,
      status: "sending",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setSending(true);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/whatsapp/conversations/${selectedContactId}/messages`,
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
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        if (data.within_24h === false) {
          setContactInfo((prev) => prev ? { ...prev, within_24h_window: false } : prev);
        }
        toast.error(data.error ?? "Failed to send template");
        return;
      }
      setMessages((prev) => prev.map((m) => m.id === tempId ? (data.message ?? m) : m));
      fetchConversations();
      if (profile) fetchProfile(selectedContactId);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async (conv: Conversation, archive: boolean) => {
    if (!projectId) return;
    // Optimistically update the list
    setConversations((prev) => prev.filter((c) => c.id !== conv.id));
    if (selectedContactId === conv.contact_id) setSelectedContactId(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/whatsapp/conversations/${conv.contact_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_archived: archive }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Could not update conversation");
        fetchConversations(true);
        return;
      }
      toast.success(archive ? "Conversation archived" : "Conversation unarchived");
    } catch {
      toast.error("Could not update conversation");
      fetchConversations(true);
    }
  };

  const handleDelete = async (conv: Conversation) => {
    if (!projectId) return;
    setConversations((prev) => prev.filter((c) => c.id !== conv.id));
    if (selectedContactId === conv.contact_id) setSelectedContactId(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/whatsapp/conversations/${conv.contact_id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_deleted: true }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error ?? "Could not delete conversation");
        fetchConversations(true);
        return;
      }
      toast.success("Conversation deleted");
    } catch {
      toast.error("Could not delete conversation");
      fetchConversations(true);
    }
  };

  const handleOptedInChange = async (checked: boolean) => {
    if (!projectId || !selectedContactId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/whatsapp/contacts/${selectedContactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opt_out: !checked }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              contact: { ...prev.contact, opt_out: !checked },
              status: { ...prev.status, opted_in: checked },
            }
          : null
      );
      toast.success(checked ? "Contact opted in" : "Contact opted out");
    } catch {
      toast.error("Could not update opt-in status");
    }
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
        const q = searchQuery.toLowerCase();
        const name = (c.contact_name ?? "").toLowerCase();
        const phone = (c.contact_phone ?? "").replace(/\D/g, "");
        const queryDigits = searchQuery.replace(/\D/g, "");
        return name.includes(q) || phone.includes(queryDigits);
      })
    : conversations;

  if (!projectId) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title={title} description="Select a project to view conversations." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} description={description} />
      <div className="flex h-[calc(100vh-12rem)] flex-col gap-0 overflow-hidden bg-white dark:bg-gray-900 md:flex-row">
        {/* Left: Contact list */}
        <div className="flex w-full flex-col border-b border-gray-100 dark:border-gray-800/80 md:w-80 md:flex-shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-[#f0f2f5] dark:border-gray-800/80 dark:bg-gray-900/80 p-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#25D366]" />
              <h2 className="font-medium">Chats</h2>
            </div>
            {showWebhookHelp && (
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
                    In{" "}
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Meta App Dashboard
                    </a>{" "}
                    → WhatsApp → Configuration: set Callback URL, Verify token, and subscribe to messages.
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </div>
          {/* Filter tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800/80 bg-[#f0f2f5] dark:bg-gray-900/80">
            {(["all", "unread", "archived"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setConversationFilter(f)}
                className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                  conversationFilter === f
                    ? "border-b-2 border-[#25D366] text-[#25D366]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="border-b border-gray-100 dark:border-gray-800/80 px-2 py-2">
            <Input
              placeholder="Search name or mobile number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-white dark:bg-gray-800"
            />
          </div>
          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
            {loading ? (
              <LoadingState message="Loading conversations…" className="py-8 max-w-none" />
            ) : filteredConversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "No matches."
                  : conversationFilter === "archived"
                  ? "No archived conversations."
                  : "No conversations yet."}
              </p>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 ${
                    selectedContactId === conv.contact_id ? "bg-gray-100 dark:bg-gray-900/70" : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedContactId(conv.contact_id)}
                    className="flex flex-1 items-center gap-3 p-3 text-left min-w-0"
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
                        <span className="truncate text-sm text-muted-foreground">{conv.contact_phone ?? ""}</span>
                        {conv.unread_count > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center bg-[#25D366] px-1.5 text-xs font-medium text-white">
                            {conv.unread_count > 99 ? "99+" : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {/* Per-row action menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-1 h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {conv.is_archived ? (
                        <DropdownMenuItem onClick={() => handleArchive(conv, false)}>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Unarchive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleArchive(conv, true)}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(conv)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: Messages */}
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
                  <span
                    className={`flex items-center gap-1 text-xs truncate ${
                      windowStatus.within
                        ? windowStatus.urgent
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-green-600 dark:text-green-400"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    <Clock className="h-3 w-3 shrink-0" />
                    {windowStatus.label}
                  </span>
                </div>
                {contactInfo && !windowStatus.within && (
                  <Badge variant="destructive" className="shrink-0 text-xs">
                    Template only
                  </Badge>
                )}
                {contactInfo && windowStatus.within && windowStatus.urgent && (
                  <Badge variant="secondary" className="shrink-0 text-xs text-amber-600 border-amber-300">
                    Closing soon
                  </Badge>
                )}
                {/* Chat-level archive / delete menu */}
                {contactInfo && (() => {
                  const conv = conversations.find((c) => c.contact_id === selectedContactId);
                  if (!conv) return null;
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {conv.is_archived ? (
                          <DropdownMenuItem onClick={() => handleArchive(conv, false)}>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleArchive(conv, true)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(conv)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })()}
              </div>

              <div className="flex-1 overflow-y-auto bg-[#efeae2] p-2 dark:bg-gray-900 sm:p-4">
                {messagesLoading ? (
                  <LoadingState message="Loading messages…" className="py-8 max-w-none" />
                ) : (
                  <div className="space-y-1">
                    {messages.map((msg) => {
                      const isTemplate = msg.body?.startsWith("Template: ");
                      const templateName = isTemplate ? msg.body!.slice("Template: ".length) : null;
                      const isOptimistic = msg.id.startsWith("temp-");
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.direction === "out" ? "justify-end" : "justify-start"} ${isOptimistic ? "opacity-70" : ""}`}
                        >
                          <div
                            className={`relative max-w-[85%] min-w-[100px] rounded-lg px-3 py-2 text-sm ${
                              msg.direction === "out"
                                ? "bg-[#dcf8c6] text-gray-900 dark:bg-[#005c4b] dark:text-white"
                                : "bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                            }`}
                          >
                            {isTemplate ? (
                              <div className="flex items-center gap-1.5">
                                <LayoutTemplate className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                <span className="italic opacity-80">{templateName}</span>
                              </div>
                            ) : msg.body ? (
                              <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                            ) : null}
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[10px] text-muted-foreground opacity-90">
                                {formatTime(msg.created_at)}
                              </span>
                              {msg.direction === "out" && (
                                <span className="inline-flex text-muted-foreground">
                                  {msg.status === "sending" ? (
                                    <Loader2 className="h-3 w-3 animate-spin opacity-50" />
                                  ) : msg.status === "read" ? (
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
                      );
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-gray-200 bg-[#f0f2f5] p-2 dark:border-gray-800 dark:bg-gray-900/80 sm:p-3">
                {contactInfo && !windowStatus.within ? (
                  /* ── Blocked: 24h window closed ── */
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-950/30">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <div className="text-xs text-red-700 dark:text-red-400">
                        <p className="font-medium">Chat window closed</p>
                        <p className="mt-0.5 opacity-80">
                          Free-form messages are blocked. Send an approved template to re-open the
                          conversation — the window resets as soon as the contact replies.
                        </p>
                      </div>
                    </div>
                    {templates.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {templates.map((t) => (
                          <Button
                            key={t.id}
                            variant="outline"
                            size="sm"
                            disabled={sending}
                            onClick={() => handleSendTemplate(t.name, t.language)}
                            className="gap-1.5 text-xs"
                          >
                            <LayoutTemplate className="h-3.5 w-3.5" />
                            {t.name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No approved templates. Create one in{" "}
                        <span className="font-medium">Settings → Templates</span>.
                      </p>
                    )}
                  </div>
                ) : (
                  /* ── Open: normal text input + template picker ── */
                  <div className="space-y-2">
                    {windowStatus.urgent && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{windowStatus.label} — reply soon or send a template</span>
                      </div>
                    )}
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
                      {/* Template picker — available even within the window */}
                      {templates.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              disabled={sending}
                              className="h-10 w-10 shrink-0"
                              title="Send a template"
                            >
                              <LayoutTemplate className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2" align="end" side="top">
                            <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                              Send template
                            </p>
                            <div className="flex flex-col gap-0.5">
                              {templates.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  disabled={sending}
                                  onClick={() => handleSendTemplate(t.name, t.language)}
                                  className="rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                                >
                                  {t.name}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
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
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Chat Profile */}
        {selectedContactId && (
          <div className="hidden w-80 flex-shrink-0 flex-col border-l border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex">
            <div className="border-b border-gray-100 p-4 dark:border-gray-800">
              <h3 className="font-medium text-sm">Chat Profile</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {profileLoading || !profile ? (
                <LoadingState message="Loading profile…" className="py-8 max-w-none" />
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <ContactAvatar
                      name={profile.contact.name}
                      phone={profile.contact.phone}
                      profilePictureUrl={profile.contact.profile_picture_url}
                      className="h-16 w-16 text-xl"
                    />
                    <span className="font-medium text-sm text-center">
                      {profile.contact.name || profile.contact.phone || "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">{profile.contact.phone}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span>{profile.status.active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Active</span>
                      <span>{formatDateTime(profile.status.last_active)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Template Messages</span>
                      <span>{profile.status.template_messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Session Messages</span>
                      <span>{profile.status.session_messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unresolved Queries</span>
                      <span>{profile.status.unresolved_queries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source</span>
                      <span className="capitalize">{profile.contact.source || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">WA Conversation</span>
                      <span>{profile.status.wa_conversation_active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Incoming</span>
                      <span>{profile.status.incoming_allowed ? "Allowed" : "Blocked"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Opted In</span>
                      <Switch
                        checked={profile.status.opted_in}
                        onCheckedChange={handleOptedInChange}
                      />
                    </div>
                  </div>

                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium">
                      Campaigns
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="space-y-1.5 pt-1 text-sm">
                        {profile.campaigns.length === 0 ? (
                          <li className="text-muted-foreground">None</li>
                        ) : (
                          profile.campaigns.map((c) => (
                            <li key={c.id} className="flex items-center gap-2">
                              <span className="text-green-600 dark:text-green-500">✓</span>
                              <span className="truncate">{c.name}</span>
                              <BarChart3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </li>
                          ))
                        )}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible>
                    <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium">
                      Attributes
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <p className="pt-1 text-sm text-muted-foreground">
                        {Object.keys(profile.contact.custom_fields).length === 0
                          ? "No attributes"
                          : JSON.stringify(profile.contact.custom_fields)}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium">
                      Tags
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {profile.tags.length === 0 ? (
                          <span className="text-sm text-muted-foreground">No tags</span>
                        ) : (
                          profile.tags.map((t) => (
                            <Badge
                              key={t.id}
                              variant="secondary"
                              className="text-xs"
                              style={t.color ? { backgroundColor: t.color, color: "#fff", border: "none" } : undefined}
                            >
                              {t.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-medium">
                      Customer Journey
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="space-y-2 pt-1 text-sm">
                        {profile.journey.map((j) => (
                          <li key={`${j.type}-${j.at}`} className="flex items-start gap-2">
                            {j.type === "campaign_sent" ? (
                              <span className="text-green-600 dark:text-green-500 mt-0.5">✓</span>
                            ) : (
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full border border-gray-400 dark:border-gray-500" />
                            )}
                            <div>
                              <span className="block">{j.label}</span>
                              <span className="text-xs text-muted-foreground">{formatDateTime(j.at)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button variant="outline" size="sm" className="w-full gap-2" disabled>
                    <Ban className="h-4 w-4" />
                    Block Incoming Messages
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
