"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { Separator } from "@/components/ui/separator";
import { useBreadcrumbOverride } from "@/lib/breadcrumb-override-context";
import { useProjectContext } from "@/lib/projects/project-context";

interface TemplateButton {
  type?: string;
  text?: string;
  url?: string;
  phone_number?: string;
}

interface SendLog {
  id: string;
  contact_id: string;
  contact_name: string | null;
  phone: string | null;
  status: string;
  error_code: string | null;
  error_title: string | null;
  meta_message_id: string | null;
  created_at: string;
}

interface LogsPayload {
  stats: { sent: number; delivered: number; read: number; failed: number; total: number };
  logs: SendLog[];
  flags: { hasMarketingCap: boolean };
}

interface TemplateDetail {
  id: string;
  project_id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  rejection_reason: string | null;
  body: string | null;
  header: string | null;
  header_format?: string | null;
  header_media_url?: string | null;
  header_media_signed_url?: string | null;
  footer: string | null;
  buttons: TemplateButton[];
  variables: string[];
  variable_field_mapping?: string[] | null;
  meta_template_id: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
  draft: "outline",
};

function HeaderFormatIcon({ format }: { format: string | null | undefined }) {
  const cls = "h-4 w-4";
  if (format === "image") return <ImageIcon className={cls} />;
  if (format === "video") return <Film className={cls} />;
  if (format === "document") return <FileText className={cls} />;
  if (format === "location") return <MapPin className={cls} />;
  return <FileText className={cls} />;
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeProject } = useProjectContext();
  const { setLastCrumbLabel } = useBreadcrumbOverride();
  const templateId = params?.templateId as string;

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [logs, setLogs] = useState<LogsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTemplate = useCallback(async () => {
    if (!activeProject?.id || !templateId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates/${templateId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setTemplate(data.template ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load template");
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, templateId]);

  const fetchLogs = useCallback(async () => {
    if (!activeProject?.id || !templateId) return;
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/whatsapp/templates/${templateId}/logs`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load logs");
      setLogs(data as LogsPayload);
    } catch {
      setLogs(null);
    } finally {
      setLogsLoading(false);
    }
  }, [activeProject?.id, templateId]);

  useEffect(() => {
    fetchTemplate();
    fetchLogs();
  }, [fetchTemplate, fetchLogs]);

  useEffect(() => {
    if (template?.name) {
      setLastCrumbLabel(template.name);
      return () => setLastCrumbLabel(null);
    }
  }, [template?.name, setLastCrumbLabel]);

  const handleSubmit = async () => {
    if (!activeProject?.id || !template) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/templates/${template.id}/submit`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      toast.success("Template submitted for approval");
      fetchTemplate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    if (!activeProject?.id || !template) return;
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/templates/${template.id}/refresh-status`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Refresh failed");
      toast.success(data.status ? `Status: ${data.status}` : "Status refreshed");
      fetchTemplate();
      fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!activeProject?.id || !template) return;
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/projects/${activeProject.id}/whatsapp/templates/${template.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete");
      }
      toast.success("Template deleted");
      router.push("/dashboard/whatsapp/templates");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
      setDeleting(false);
    }
  };

  if (!activeProject) {
    return (
      <div className="flex flex-col gap-10">
        <p className="text-sm text-muted-foreground">Select a project to view templates.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-10">
        <LoadingState message="Loading template…" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col gap-6">
        <Button asChild variant="ghost" size="sm" className="gap-1 w-fit -ml-2">
          <Link href="/dashboard/whatsapp/templates">
            <ArrowLeft className="h-4 w-4" />
            Back to templates
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Template not found.</p>
      </div>
    );
  }

  const isDraft = template.status === "draft";
  const isRejected = template.status === "rejected";
  const hasMetaId = !!template.meta_template_id?.trim();
  const headerFormat = (template.header_format ?? "text").toLowerCase();
  const isMediaHeader = headerFormat === "image" || headerFormat === "video" || headerFormat === "document";

  return (
    <div className="flex flex-col gap-8">
      <Button asChild variant="ghost" size="sm" className="gap-1 w-fit -ml-2">
        <Link href="/dashboard/whatsapp/templates">
          <ArrowLeft className="h-4 w-4" />
          Back to templates
        </Link>
      </Button>

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <h1 className="text-xl font-medium truncate">{template.name}</h1>
            <Badge variant={STATUS_VARIANTS[template.status] ?? "outline"}>{template.status}</Badge>
            <span className="text-xs text-muted-foreground capitalize">{template.category}</span>
            <span className="text-xs text-muted-foreground">{template.language}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && (
              <>
                <Button asChild variant="outline" className="gap-1">
                  <Link href={`/dashboard/whatsapp/templates/${template.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    Edit draft
                  </Link>
                </Button>
                <Button onClick={handleSubmit} disabled={submitting} className="gap-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit for approval
                </Button>
              </>
            )}
            {hasMetaId && !isDraft && (
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-1">
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh from Meta
              </Button>
            )}
            <Button variant="outline" onClick={handleDelete} disabled={deleting} className="gap-1 text-red-600 dark:text-red-400 hover:text-red-700">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </Button>
          </div>
        </div>
      </header>

      {isRejected && template.rejection_reason && (
        <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3">
          <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Rejected by Meta</p>
              <p className="mt-1">{template.rejection_reason}</p>
              <p className="mt-1 text-xs">Edit the template (still in draft) to address the issue and resubmit.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: preview */}
        <Card className="lg:col-span-2 bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Message preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Header */}
            {(template.header || isMediaHeader) && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <HeaderFormatIcon format={headerFormat} />
                  Header ({headerFormat})
                </p>
                {isMediaHeader ? (
                  <div className="border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/50 text-sm">
                    {template.header_media_signed_url || template.header_media_url ? (
                      headerFormat === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={template.header_media_signed_url ?? template.header_media_url ?? ""} alt="Header" className="max-h-48 object-contain" />
                      ) : headerFormat === "video" ? (
                        <video src={template.header_media_signed_url ?? template.header_media_url ?? ""} controls className="max-h-48 w-full" />
                      ) : (
                        <a
                          href={template.header_media_signed_url ?? template.header_media_url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline"
                        >
                          View {headerFormat}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )
                    ) : (
                      <span className="text-muted-foreground">Media sample not stored locally.</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/50 whitespace-pre-wrap">
                    {template.header}
                  </p>
                )}
              </div>
            )}

            {/* Body */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Body</p>
              <p className="text-sm border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/50 whitespace-pre-wrap">
                {template.body || <span className="text-muted-foreground italic">No body</span>}
              </p>
            </div>

            {/* Footer */}
            {template.footer && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Footer</p>
                <p className="text-sm border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/50 text-muted-foreground whitespace-pre-wrap">
                  {template.footer}
                </p>
              </div>
            )}

            {/* Buttons */}
            {template.buttons?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buttons</p>
                <ul className="space-y-2">
                  {template.buttons.map((b, idx) => {
                    const type = (b.type ?? "").toLowerCase();
                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-3 border border-gray-200 dark:border-gray-800 p-2.5 bg-white dark:bg-gray-900"
                      >
                        <span className="text-sm font-medium">{b.text || <em className="text-muted-foreground">(no text)</em>}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {type === "url" && b.url ? (
                            <a href={b.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                              {b.url}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : type === "phone_number" && b.phone_number ? (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {b.phone_number}
                            </span>
                          ) : null}
                          <Badge variant="outline" className="text-[10px] uppercase">{type || "quick_reply"}</Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: details */}
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="font-medium capitalize mt-0.5">{template.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Category</p>
              <p className="font-medium capitalize mt-0.5">{template.category}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Language</p>
              <p className="font-medium mt-0.5">{template.language}</p>
            </div>
            {template.meta_template_id && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Meta template ID</p>
                <p className="font-mono text-xs mt-0.5 break-all">{template.meta_template_id}</p>
              </div>
            )}
            <Separator />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Created</p>
              <p className="mt-0.5">{new Date(template.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Last updated</p>
              <p className="mt-0.5">{new Date(template.updated_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery analytics + logs */}
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Delivery logs</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={logsLoading}
            className="gap-1"
          >
            {logsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Marketing cap explainer */}
          {logs?.flags?.hasMarketingCap && (
            <div className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Recent messages were blocked by WhatsApp&apos;s marketing limit.</p>
                  <p>
                    Marketing templates have a per-user delivery cap that WhatsApp enforces globally. If the recipient has already received marketing messages from any business that day, yours can be silently dropped — even if your template is approved and you&apos;ve never messaged them before.
                  </p>
                  <p>
                    Use a Utility-category template for non-promotional content (order updates, alerts, confirmations) — those aren&apos;t subject to the marketing cap. Or wait 12-48 hours before retrying the same recipient.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stat tiles */}
          {logs && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Total sent</p>
                <p className="text-xl font-medium mt-1">{logs.stats.sent}</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Delivered</p>
                <p className="text-xl font-medium mt-1">{logs.stats.delivered + logs.stats.read}</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Read</p>
                <p className="text-xl font-medium mt-1">{logs.stats.read}</p>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">Failed</p>
                <p className="text-xl font-medium mt-1 text-red-600 dark:text-red-400">{logs.stats.failed}</p>
              </div>
            </div>
          )}

          {/* Recent send log */}
          {logsLoading && !logs ? (
            <p className="text-sm text-muted-foreground">Loading delivery log…</p>
          ) : logs && logs.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sends yet. Once this template is used in a campaign or test message, deliveries will appear here.</p>
          ) : logs ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left p-2 font-medium">Recipient</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Reason / Error</th>
                    <th className="text-right p-2 font-medium whitespace-nowrap">Sent at</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.logs.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800/50">
                      <td className="p-2">
                        <div className="font-medium">{m.contact_name ?? m.phone ?? m.contact_id}</div>
                        {m.contact_name && m.phone && (
                          <div className="text-xs text-muted-foreground">{m.phone}</div>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={
                            m.status === "failed"
                              ? "destructive"
                              : m.status === "delivered" || m.status === "read"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground max-w-[360px]">
                        {m.status === "failed" ? (
                          <span>
                            {m.error_title ?? "Delivery failed"}
                            {m.error_code && (
                              <code className="ml-1.5 text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5">
                                {m.error_code}
                              </code>
                            )}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground text-right whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Variables card - full width */}
      {template.variables?.length > 0 && (
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="text-base">Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left p-2 font-medium">Placeholder</th>
                    <th className="text-left p-2 font-medium">Example value</th>
                    <th className="text-left p-2 font-medium">Contact field mapping</th>
                  </tr>
                </thead>
                <tbody>
                  {template.variables.map((v, idx) => {
                    const mapping = template.variable_field_mapping?.[idx];
                    return (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800/50">
                        <td className="p-2 font-mono text-xs">{`{{${idx + 1}}}`}</td>
                        <td className="p-2">{v || <span className="text-muted-foreground italic">(empty)</span>}</td>
                        <td className="p-2">
                          {mapping ? (
                            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5">{mapping}</code>
                          ) : (
                            <span className="text-muted-foreground italic">Not mapped — uses example value</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
