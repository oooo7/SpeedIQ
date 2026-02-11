"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { FileText, Image, Loader2, MessageSquare, MoreVertical, Music, Plus, Trash2, Video } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";

/** Very basic tag allowlist for HTML preview to reduce XSS surface (preview only). */
function sanitizeHtmlForPreview(html: string): string {
  if (!html?.trim()) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  if (!body) return "";
  const allowed = new Set(["p", "br", "strong", "b", "em", "i", "u", "a", "ul", "ol", "li", "h1", "h2", "h3", "div", "span", "table", "tr", "td", "th", "img"]);
  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (!allowed.has(el.tagName.toLowerCase())) {
        el.replaceWith(...Array.from(el.childNodes));
        return;
      }
      Array.from(el.attributes).forEach((a) => {
        if (!["href", "src", "style", "class", "target", "width", "height"].includes(a.name.toLowerCase())) {
          el.removeAttribute(a.name);
        }
      });
      Array.from(el.childNodes).forEach(walk);
    }
  };
  walk(body);
  return body.innerHTML;
}

type CannedType = "text" | "image" | "file" | "video" | "audio";
type CannedChannel = "whatsapp" | "email";

interface CannedMessage {
  id: string;
  project_id: string;
  name: string;
  type: CannedType;
  channel: CannedChannel;
  body: string | null;
  attachment_path: string | null;
  attachment_filename: string | null;
  created_at: string;
  updated_at: string;
}

const TYPE_OPTIONS: { value: CannedType; label: string; icon: React.ElementType }[] = [
  { value: "text", label: "Text", icon: FileText },
  { value: "image", label: "Image", icon: Image },
  { value: "file", label: "File", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
];

const CHANNEL_OPTIONS: { value: CannedChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

function typeLabel(t: CannedType) {
  return TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}

function channelLabel(c: CannedChannel) {
  return CHANNEL_OPTIONS.find((o) => o.value === c)?.label ?? c;
}

export default function CannedMessagePage() {
  const { activeProject } = useProjectContext();
  const [messages, setMessages] = useState<CannedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CannedMessage | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CannedType>("text");
  const [channel, setChannel] = useState<CannedChannel>("whatsapp");
  const [body, setBody] = useState("");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [attachmentFilename, setAttachmentFilename] = useState<string | null>(null);
  const [useHtml, setUseHtml] = useState(false);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [filterChannel, setFilterChannel] = useState<CannedChannel | "">("");
  const [filterType, setFilterType] = useState<CannedType | "">("");

  // Fetch signed URL for attachment preview when we have path from server (editing or after upload)
  useEffect(() => {
    if (!activeProject?.id || !attachmentPath || !dialogOpen) return;
    if (type === "file") {
      setAttachmentPreviewUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${activeProject.id}/canned-messages/signed-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: attachmentPath }),
        });
        const data = await res.json();
        if (!cancelled && data?.url) {
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          setAttachmentPreviewUrl(data.url);
        }
      } catch {
        if (!cancelled) setAttachmentPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, attachmentPath, dialogOpen, type]);

  // Revoke object URL when dialog closes
  useEffect(() => {
    if (!dialogOpen) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setAttachmentPreviewUrl(null);
    }
  }, [dialogOpen]);

  const fetchMessages = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterChannel) q.set("channel", filterChannel);
      if (filterType) q.set("type", filterType);
      const res = await fetch(`/api/projects/${activeProject.id}/canned-messages?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setMessages(data.canned_messages ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load canned messages");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, filterChannel, filterType]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setType("text");
    setChannel("whatsapp");
    setBody("");
    setUseHtml(false);
    setAttachmentPath(null);
    setAttachmentFilename(null);
    setAttachmentPreviewUrl(null);
    setFileInputKey((k) => k + 1);
    setDialogOpen(true);
  };

  const openEdit = (m: CannedMessage) => {
    setEditing(m);
    setName(m.name);
    setType(m.type);
    setChannel(m.channel);
    const b = m.body ?? "";
    setBody(b);
    setUseHtml(m.channel === "email" && m.type === "text" && /<[a-z][\s\S]*>/i.test(b));
    setAttachmentPath(m.attachment_path);
    setAttachmentFilename(m.attachment_filename);
    setAttachmentPreviewUrl(null);
    setFileInputKey((k) => k + 1);
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject?.id) return;
    if (type === "image" || type === "video" || type === "audio") {
      const url = URL.createObjectURL(file);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;
      setAttachmentPreviewUrl(url);
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/projects/${activeProject.id}/canned-messages/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setAttachmentPath(data.path);
      setAttachmentFilename(data.filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (type !== "text" && !attachmentPath) {
      toast.error("Please upload a file for this message type");
      return;
    }
    if (type === "text" && !body.trim()) {
      toast.error("Message body is required for text type");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/projects/${activeProject.id}/canned-messages/${editing.id}`
        : `/api/projects/${activeProject.id}/canned-messages`;
      const method = editing ? "PATCH" : "POST";
      const payload =
        method === "POST"
          ? {
              name: name.trim(),
              type,
              channel,
              body: body.trim() || null,
              attachment_path: attachmentPath,
              attachment_filename: attachmentFilename,
            }
          : {
              name: name.trim(),
              type,
              channel,
              body: body.trim() || null,
              attachment_path: attachmentPath,
              attachment_filename: attachmentFilename,
            };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(editing ? "Canned message updated" : "Canned message added");
      setDialogOpen(false);
      fetchMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeProject?.id || !window.confirm("Delete this canned message?")) return;
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/canned-messages/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Canned message deleted");
      fetchMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader
          title="Canned Messages"
          description="Select a project to manage canned messages for WhatsApp and Email."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Canned Messages"
          description="Reusable messages (text, image, file, video, audio) for WhatsApp or Email. Use them in campaigns or live chat."
        />
        <Button onClick={openAdd} className="gap-1 shrink-0">
          <Plus className="h-4 w-4" />
          Add canned message
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value as CannedChannel | "")}
          className="flex h-9 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-sm"
        >
          <option value="">All channels</option>
          {CHANNEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as CannedType | "")}
          className="flex h-9 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-sm"
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading canned messages…" />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title="No canned messages yet"
          description="Add text, image, file, video, or audio messages for WhatsApp or Email. Choose the channel and type when adding."
          actions={
            <Button onClick={openAdd} className="gap-1">
              <Plus className="h-4 w-4" />
              Add canned message
            </Button>
          }
        />
      ) : (
        <div className="space-y-2 divide-y divide-gray-100 dark:divide-gray-800">
          {messages.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-4 bg-white dark:bg-gray-900 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{m.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {channelLabel(m.channel)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {typeLabel(m.type)}
                  </Badge>
                </div>
                {m.body && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.body}</p>
                )}
                {m.attachment_filename && (
                  <p className="text-xs text-muted-foreground mt-0.5">File: {m.attachment_filename}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(m)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit canned message" : "Add canned message"}</DialogTitle>
            <DialogDescription>
              Choose channel (WhatsApp or Email) and type. For Email text you can use an HTML template. Preview updates as you edit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="canned-name">Name *</Label>
                  <Input
                    id="canned-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Welcome image, FAQ reply"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>For (channel) *</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNEL_OPTIONS.map((o) => (
                      <label
                        key={o.value}
                        className="flex items-center gap-2 cursor-pointer border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50"
                      >
                        <input
                          type="radio"
                          name="channel"
                          value={o.value}
                          checked={channel === o.value}
                          onChange={() => setChannel(o.value)}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_OPTIONS.map((o) => {
                      const Icon = o.icon;
                      return (
                        <label
                          key={o.value}
                          className="flex items-center gap-2 cursor-pointer border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:border-gray-800 dark:has-[:checked]:border-gray-200 has-[:checked]:bg-gray-50 dark:has-[:checked]:bg-gray-800/50"
                        >
                          <input
                            type="radio"
                            name="type"
                            value={o.value}
                            checked={type === o.value}
                            onChange={() => {
                              setType(o.value);
                              if (o.value === "text") {
                                setAttachmentPath(null);
                                setAttachmentFilename(null);
                                setAttachmentPreviewUrl(null);
                              }
                            }}
                          />
                          <Icon className="h-4 w-4" />
                          {o.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
                {type === "text" ? (
                  <>
                    {channel === "email" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="canned-use-html"
                          checked={useHtml}
                          onChange={(e) => setUseHtml(e.target.checked)}
                          className="border-gray-300"
                        />
                        <Label htmlFor="canned-use-html" className="font-normal cursor-pointer">
                          Use HTML template
                        </Label>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="canned-body">
                        {channel === "email" && useHtml ? "HTML content *" : "Message body *"}
                      </Label>
                      <textarea
                        id="canned-body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={
                          useHtml
                            ? "<p>Hello!</p><p>Your email content here...</p>"
                            : "Hello! How can I help?"
                        }
                        rows={channel === "email" && useHtml ? 12 : 6}
                        className="flex w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm min-h-[120px] font-mono text-xs"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>File *</Label>
                      <input
                        key={fileInputKey}
                        ref={fileInputRef}
                        type="file"
                        accept={
                          type === "image"
                            ? "image/*"
                            : type === "video"
                              ? "video/*"
                              : type === "audio"
                                ? "audio/*"
                                : undefined
                        }
                        onChange={handleFileChange}
                        className="flex w-full text-sm"
                      />
                      {uploading && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading…
                        </p>
                      )}
                      {attachmentFilename && (
                        <p className="text-xs text-muted-foreground">Uploaded: {attachmentFilename}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="canned-body-caption">Caption (optional)</Label>
                      <textarea
                        id="canned-body-caption"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Optional caption"
                        rows={2}
                        className="flex w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm min-h-[60px]"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Preview</Label>
                <div className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 min-h-[200px] p-4 overflow-auto">
                  {type === "text" ? (
                    body.trim() ? (
                      useHtml ? (
                        <iframe
                          title="HTML preview"
                          srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:12px;font-family:system-ui,sans-serif;font-size:14px;">${sanitizeHtmlForPreview(body)}</body></html>`}
                          className="w-full min-h-[280px] border-0 bg-white dark:bg-gray-900"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words text-foreground">
                          {body}
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground">Enter content to see preview.</p>
                    )
                  ) : type === "image" && (attachmentPreviewUrl || attachmentFilename) ? (
                    <div className="space-y-2">
                      {attachmentPreviewUrl ? (
                        <img
                          src={attachmentPreviewUrl}
                          alt="Preview"
                          className="max-w-full max-h-[280px] object-contain"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Uploading…</p>
                      )}
                      {body && <p className="text-sm text-muted-foreground">Caption: {body}</p>}
                    </div>
                  ) : type === "video" && (attachmentPreviewUrl || attachmentFilename) ? (
                    <div className="space-y-2">
                      {attachmentPreviewUrl ? (
                        <video
                          src={attachmentPreviewUrl}
                          controls
                          className="max-w-full max-h-[280px]"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Uploading…</p>
                      )}
                      {body && <p className="text-sm text-muted-foreground">Caption: {body}</p>}
                    </div>
                  ) : type === "audio" && (attachmentPreviewUrl || attachmentFilename) ? (
                    <div className="space-y-2">
                      {attachmentPreviewUrl ? (
                        <audio src={attachmentPreviewUrl} controls className="w-full max-w-md" />
                      ) : (
                        <p className="text-sm text-muted-foreground">Uploading…</p>
                      )}
                      {body && <p className="text-sm text-muted-foreground">Caption: {body}</p>}
                    </div>
                  ) : type === "file" && attachmentFilename ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <span>{attachmentFilename}</span>
                      {body && <span className="text-muted-foreground">· Caption: {body}</span>}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {type === "file" ? "Upload a file to see details." : "Upload a file to see preview."}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || (type !== "text" && uploading)}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : editing ? (
                  "Update"
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
