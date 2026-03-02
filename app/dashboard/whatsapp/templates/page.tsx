"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Loader2, MoreVertical, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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

interface WhatsAppTemplate {
  id: string;
  project_id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  rejection_reason: string | null;
  body: string | null;
  header: string | null;
  footer: string | null;
  buttons: unknown[];
  variables: unknown[];
  variable_field_mapping?: string[];
  meta_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function WhatsAppTemplatesPage() {
  const { activeProject } = useProjectContext();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState<string | null>(null);
  const [syncingFromMeta, setSyncingFromMeta] = useState(false);

  const fetchTemplates = useCallback(async (silent = false) => {
    if (!activeProject?.id) return;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) {
        params.set("status", statusFilter);
      } else {
        params.set("include_drafts", "1");
      }
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setTemplates(data.templates ?? []);
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Could not load templates");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeProject?.id, statusFilter]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (!activeProject?.id) return;
    const POLL_MS = 20000;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchTemplates(true);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [activeProject?.id, fetchTemplates]);

  const handleSubmitForApproval = async (templateId: string) => {
    if (!activeProject?.id) return;
    setSubmitting(templateId);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/templates/${templateId}/submit`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      toast.success("Template submitted for approval");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(null);
    }
  };

  const handleRefreshStatus = async (templateId: string) => {
    if (!activeProject?.id) return;
    setRefreshingStatus(templateId);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/templates/${templateId}/refresh-status`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      toast.success(data.status ? `Status: ${data.status}` : "Status refreshed");
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh status");
    } finally {
      setRefreshingStatus(null);
    }
  };

  const handleFetchFromMeta = async () => {
    if (!activeProject?.id) return;
    setSyncingFromMeta(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      toast.success(data.message ?? `Fetched ${data.fetched ?? 0} templates from Meta.`);
      fetchTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not fetch from Meta");
    } finally {
      setSyncingFromMeta(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeProject?.id || !window.confirm("Delete this template?")) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates/${id}`, {
        method: "DELETE",
      });
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

  const statusVariant = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    if (s === "pending") return "secondary";
    return "outline";
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <PageHeader title="Templates" description="Select a project to manage templates." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Templates"
          description="Create and manage message templates for WhatsApp campaigns."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleFetchFromMeta}
            disabled={syncingFromMeta}
            className="gap-1"
          >
            {syncingFromMeta ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Fetch from Meta
          </Button>
          <Button asChild className="gap-1">
            <Link href="/dashboard/whatsapp/templates/new">
              <Plus className="h-4 w-4" />
              New template
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-1 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <LoadingState message="Loading templates..." />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-6 w-6" />}
          title="No templates yet"
          description="Create a template or fetch templates already created in WhatsApp Manager."
          actions={
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                onClick={handleFetchFromMeta}
                disabled={syncingFromMeta}
                className="gap-1"
              >
                {syncingFromMeta ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Fetch from Meta
              </Button>
              <Button asChild className="gap-1">
                <Link href="/dashboard/whatsapp/templates/new">
                  <Plus className="h-4 w-4" />
                  New template
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{t.name}</p>
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{t.category}</span>
                  <span className="text-xs text-muted-foreground">{t.language}</span>
                </div>
                {t.rejection_reason && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Rejected: {t.rejection_reason}
                  </p>
                )}
                {t.body && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.body}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {t.status === "draft" && (
                    <>
                      <DropdownMenuItem
                        onClick={() => handleSubmitForApproval(t.id)}
                        disabled={submitting === t.id}
                      >
                        {submitting === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit for approval
                      </DropdownMenuItem>
                    </>
                  )}
                  {t.meta_template_id && t.status !== "draft" && (
                    <DropdownMenuItem
                      onClick={() => handleRefreshStatus(t.id)}
                      disabled={refreshingStatus === t.id}
                    >
                      {refreshingStatus === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh status from Meta
                    </DropdownMenuItem>
                  )}
                  {t.status === "draft" && (
                    <DropdownMenuItem
                      className="text-red-600 dark:text-red-400"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
