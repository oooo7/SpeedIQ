"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, MoreVertical, Plus, Tag, Trash2 } from "lucide-react";
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
import { useProjectContext } from "@/lib/projects/project-context";

interface TagDefinition {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export default function TagsPage() {
  const { activeProject } = useProjectContext();
  const [tags, setTags] = useState<TagDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TagDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  const fetchTags = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/tag-definitions`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setTags(data.tags ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load tags");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setColor("");
    setDialogOpen(true);
  };

  const openEdit = (t: TagDefinition) => {
    setEditing(t);
    setName(t.name);
    setColor(t.color ?? "");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `/api/projects/${activeProject.id}/whatsapp/tag-definitions/${editing.id}`
        : `/api/projects/${activeProject.id}/whatsapp/tag-definitions`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: color.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(editing ? "Tag updated" : "Tag added");
      setDialogOpen(false);
      fetchTags();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeProject?.id || !window.confirm("Delete this tag? Contacts may still have this tag name.")) return;
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/tag-definitions/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Tag deleted");
      fetchTags();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Tags</h1>
        <p className="text-sm text-muted-foreground">Select a project to manage tags for contacts.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Tags</h1>
        <Button onClick={openAdd} className="gap-1">
          <Plus className="h-4 w-4" />
          Add tag
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Define tags you can assign to WhatsApp contacts (e.g. VIP, New Customer). Use them to filter contacts and build segments.
      </p>

      {loading ? (
        <LoadingState message="Loading tags…" />
      ) : tags.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-6 w-6" />}
          title="No tags yet"
          description="Define tags to assign to WhatsApp contacts (e.g. VIP, New Customer). Use them to filter contacts and build segments."
          actions={
            <Button onClick={openAdd} className="gap-1">
              <Plus className="h-4 w-4" />
              Add tag
            </Button>
          }
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2"
            >
              <Badge
                variant="secondary"
                style={t.color ? { backgroundColor: t.color, color: "#fff", border: "none" } : undefined}
              >
                {t.name}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600 dark:text-red-400"
                    onClick={() => handleDelete(t.id)}
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
            <DialogTitle>{editing ? "Edit tag" : "Add tag"}</DialogTitle>
            <DialogDescription>
              Tag name is used on contacts. Optional color for display in the UI.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name *</Label>
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP, New Customer"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-color">Color (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={color || "#6b7280"}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-14 p-1 cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
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
