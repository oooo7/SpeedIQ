"use client";

import { useRouter } from "next/navigation";
import { EmailTemplateEditor } from "@/components/email/template-editor";
import { useProjectContext } from "@/lib/projects/project-context";

export default function NewEmailTemplatePage() {
  const { activeProject } = useProjectContext();
  const router = useRouter();

  if (!activeProject?.id) {
    return (
      <div className="flex flex-col gap-10">
        <p className="text-muted-foreground">Select a project to create a template.</p>
      </div>
    );
  }

  return (
    <EmailTemplateEditor
      projectId={activeProject.id}
      initial={null}
      isNew
      onSaved={() => router.push("/dashboard/email/templates")}
    />
  );
}
