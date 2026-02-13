"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  ChevronDown,
  Info,
  Loader2,
  MessageSquare,
  Send,
  BarChart3,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  const fetchConversations = useCallback(
    async (silent = false) => {
      if (!projectId) return;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/whatsapp/conversations`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setConversations(data.conversations ?? []);
      } catch (err) {
        if (!silent) toast.error(err instanceof Error ? err.message : "Could not load conversations");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId]
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
    fetchConversations();
  }, [fetchConversations]);

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
        `/api/projects/${projectId}/whatsapp/conversations/${selectedContactId}/messages`,
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
      if (data.message) setMessages((prev) => [...prev, data.message]);
      fetchConversations();
      if (profile) fetchProfile(selectedContactId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async (templateName: string, templateLanguage: string) => {
    if (!projectId || !selectedContactId) return;
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
        toast.error(data.error ?? "Failed to send template");
        return;
      }
      if (data.message) setMessages((prev) => [...prev, data.message]);
      fetchConversations();
      if (profile) fetchProfile(selectedContactId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
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
                {searchQuery.trim() ? "No matches." : "No conversations yet."}
              </p>
            ) : (
              filteredConversations.map((conv) => (
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
                      <span className="truncate text-sm text-muted-foreground">{conv.contact_phone ?? ""}</span>
                      {conv.unread_count > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center bg-[#25D366] px-1.5 text-xs font-medium text-white">
                          {conv.unread_count > 99 ? "99+" : conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
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
                          className={`relative max-w-[85%] min-w-[100px] rounded-lg px-3 py-2 text-sm ${
                            msg.direction === "out"
                              ? "bg-[#dcf8c6] text-gray-900 dark:bg-[#005c4b] dark:text-white"
                              : "bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                          }`}
                        >
                          {msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
                          <div className="flex items-center justify-end gap-1 mt-0.5">
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
