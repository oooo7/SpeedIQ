"use client";

import dynamic from "next/dynamic";
import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/dashboard/page-header";
import { renderEmailBody } from "@/lib/email/template";
import { EMAIL_PREVIEW_VARIABLES, EMAIL_TEMPLATE_VARIABLES } from "@/lib/email/variables";

const HtmlEditor = dynamic(
  () => import("@/components/email/html-editor").then((m) => ({ default: m.HtmlEditor })),
  { ssr: false }
);

export interface EmailTemplateFormData {
  id?: string;
  name: string;
  subject: string;
  body_html: string;
}

interface EmailTemplateEditorProps {
  projectId: string;
  initial: EmailTemplateFormData | null;
  isNew: boolean;
  onSaved: () => void;
}

function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text);
}

export function EmailTemplateEditor({ projectId, initial, isNew, onSaved }: EmailTemplateEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html ?? "");
  const [saving, setSaving] = useState(false);

  const previewSubject = useCallback(() => {
    return renderEmailBody(subject, EMAIL_PREVIEW_VARIABLES);
  }, [subject]);

  const previewHtml = useCallback(() => {
    return renderEmailBody(bodyHtml || "<p></p>", EMAIL_PREVIEW_VARIABLES);
  }, [bodyHtml]);

  const handleCopy = useCallback((placeholder: string) => {
    copyToClipboard(placeholder).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Could not copy")
    );
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    setSaving(true);
    try {
      const url = isNew
        ? `/api/projects/${projectId}/email/templates`
        : `/api/projects/${projectId}/email/templates/${initial?.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          body_html: bodyHtml.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(isNew ? "Template created" : "Template updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/dashboard/email/templates"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Templates
            </Link>
          </div>
          <PageHeader
            title={isNew ? "New template" : "Edit template"}
            description="Use variables in subject and body. Click a variable to copy it."
          />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/email/templates">Cancel</Link>
          </Button>
          <Button form="template-form" type="submit" disabled={saving} className="gap-1">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : isNew ? (
              "Create template"
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>

      <form id="template-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: form + editor */}
          <div className="flex flex-col gap-6">
            <Card className="bg-white dark:bg-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Name *</Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Welcome email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-subject">Subject *</Label>
                  <Input
                    id="template-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Hello {{first_name}}, welcome!"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 flex flex-col min-h-0">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">Body (HTML)</CardTitle>
                  <span className="text-xs text-muted-foreground">Click a variable to copy</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {EMAIL_TEMPLATE_VARIABLES.map(({ placeholder, label }) => (
                    <button
                      key={placeholder}
                      type="button"
                      onClick={() => handleCopy(placeholder)}
                      className="inline-flex items-center gap-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 text-xs font-mono hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={`Copy ${placeholder}`}
                    >
                      <Copy className="h-3 w-3 shrink-0" />
                      {placeholder}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-[280px] flex flex-col overflow-hidden">
                <HtmlEditor
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  placeholder='<p>Hello {{first_name}},</p><p>...</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>'
                  minHeight="260px"
                  className="rounded border border-gray-200 dark:border-gray-800 overflow-hidden [&_.cm-editor]:outline-none [&_.cm-editor]:rounded [&_.cm-scroller]:min-h-[260px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: live preview */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-muted-foreground">Live preview</h3>
            <Card className="bg-white dark:bg-gray-900 flex-1 min-h-[320px] flex flex-col">
              <CardContent className="p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-auto">
                <div className="border-b border-gray-200 dark:border-gray-800 pb-2">
                  <span className="text-xs text-muted-foreground">Subject: </span>
                  <span className="text-sm font-medium break-words">{previewSubject() || "(empty)"}</span>
                </div>
                <div
                  className="flex-1 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 text-sm overflow-auto prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewHtml() }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
