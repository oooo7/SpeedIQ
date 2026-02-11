"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, MoreVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

interface QuickReply {
  id: string;
  project_id: string;
  title: string;
  body: string;
  category: string | null;
  created_at: string;
}

export default function CannedMessagePage() {
  const { activeProject } = useProjectContext();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");

  const fetchReplies = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/quick-replies`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setQuickReplies(data.quick_replies ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load canned messages");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setCategory("");
    setDialogOpen(true);
  };

  const openEdit = (r: QuickReply) => {
    setEditing(r);
    setTitle(r.title);
    setBody(r.body);
    setCategory(r.category ?? "");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/projects/${activeProject.id}/whatsapp/quick-replies/${editing.id}`
        : `/api/projects/${activeProject.id}/whatsapp/quick-replies`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(editing ? "Canned message updated" : "Canned message added");
      setDialogOpen(false);
      fetchReplies();
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
        `/api/projects/${activeProject.id}/whatsapp/quick-replies/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Canned message deleted");
      fetchReplies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Canned Message" description="Select a project to manage quick replies for live chat." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Canned Message"
          description="Quick replies you can use in Live Chat. Use categories like Greetings, FAQs, or Closing."
        />
        <Button onClick={openAdd} className="gap-1 shrink-0">
          <Plus className="h-4 w-4" />
          Add canned message
        </Button>
      </div>

      {loading ? (
        <LoadingState message="Loading canned messages…" />
      ) : quickReplies.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" />}
          title="No canned messages yet"
          description="Add quick replies to use in Live Chat. Use categories like Greetings, FAQs, or Closing."
          actions={
            <Button onClick={openAdd} className="gap-1">
              <Plus className="h-4 w-4" />
              Add canned message
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {quickReplies.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-4 bg-white dark:bg-gray-900 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title}</p>
                {r.category && (
                  <p className="text-xs text-muted-foreground mt-0.5">{r.category}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.body}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400"
                    onClick={() => handleDelete(r.id)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit canned message" : "Add canned message"}</DialogTitle>
            <DialogDescription>
              Title and body will appear in the quick-reply picker in Live Chat.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="canned-title">Title *</Label>
              <Input
                id="canned-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Greeting"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="canned-category">Category (optional)</Label>
              <Input
                id="canned-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Greetings, FAQs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="canned-body">Message body *</Label>
              <textarea
                id="canned-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Hello! How can I help you today?"
                rows={4}
                className="flex w-full bg-white dark:bg-gray-900 px-3 py-2 text-sm min-h-[80px]"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
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
