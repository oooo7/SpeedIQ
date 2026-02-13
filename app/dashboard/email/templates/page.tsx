"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutTemplate, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectContext } from "@/lib/projects/project-context";
interface EmailTemplate {
  id: string;
  project_id: string;
  name: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export default function EmailTemplatesPage() {
  const { activeProject } = useProjectContext();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/templates`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setTemplates(data.templates ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load templates");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!activeProject?.id || !window.confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Template deleted");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Email Templates" description="Select a project to manage templates." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Email Templates"
          description="Create and manage email templates. Open a template to edit with live preview."
        />
        <Button asChild className="gap-1 shrink-0">
          <Link href="/dashboard/email/templates/new">
            <Plus className="h-4 w-4" />
            New template
          </Link>
        </Button>
      </div>

      {loading ? (
        <LoadingState message="Loading templates…" />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-6 w-6" />}
          title="No templates yet"
          description="Create a template to use in email campaigns. Use the editor to add variables and see a live preview."
          actions={
            <Button asChild className="gap-1">
              <Link href="/dashboard/email/templates/new">
                <Plus className="h-4 w-4" />
                New template
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Subject</th>
                  <th className="text-left p-3 font-medium">Variables</th>
                  <th className="text-left p-3 font-medium">Created</th>
                  <th className="w-10 p-3" />
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 text-muted-foreground max-w-[200px] truncate" title={t.subject}>
                      {t.subject}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {Array.isArray(t.variables) && t.variables.length > 0
                        ? t.variables.join(", ")
                        : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/email/templates/${t.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
