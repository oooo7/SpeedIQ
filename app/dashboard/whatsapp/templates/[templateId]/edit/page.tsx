"use client";

import { useParams } from "next/navigation";

import TemplateForm from "../../_components/template-form";

export default function EditWhatsAppTemplatePage() {
  const params = useParams();
  const templateId = params?.templateId as string | undefined;
  if (!templateId) return null;
  return <TemplateForm templateId={templateId} />;
}
