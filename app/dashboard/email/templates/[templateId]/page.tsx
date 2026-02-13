"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmailTemplateEditor } from "@/components/email/template-editor";
import type { EmailTemplateFormData } from "@/components/email/template-editor";
import { LoadingState } from "@/components/ui/loading-state";
import { useProjectContext } from "@/lib/projects/project-context";

export default function EditEmailTemplatePage() {
  const { activeProject } = useProjectContext();
  const params = useParams();
  const router = useRouter();
  const templateId = params?.templateId as string | undefined;
  const [initial, setInitial] = useState<EmailTemplateFormData | null | "loading">("loading");

  const fetchTemplate = useCallback(async () => {
    if (!activeProject?.id || !templateId) return;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/email/templates/${templateId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const t = data.template;
      if (!t) throw new Error("Template not found");
      setInitial({
        id: t.id,
        name: t.name ?? "",
        subject: t.subject ?? "",
        body_html: t.body_html ?? "",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load template");
      setInitial(null);
    }
  }, [activeProject?.id, templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  if (!activeProject?.id) {
    return (
      <div className="flex flex-col gap-10">
        <p className="text-muted-foreground">Select a project to edit templates.</p>
      </div>
    );
  }

  if (initial === "loading") {
    return <LoadingState message="Loading template…" />;
  }

  if (initial === null) {
    return (
      <div className="flex flex-col gap-10">
        <p className="text-muted-foreground">Template not found.</p>
      </div>
    );
  }

  return (
    <EmailTemplateEditor
      projectId={activeProject.id}
      initial={initial}
      isNew={false}
      onSaved={() => router.push("/dashboard/email/templates")}
    />
  );
}
