import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { getWhatsAppAccountToken, submitTemplateToMeta } from "@/lib/whatsapp/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, templateId } = await params;
  if (!projectId || !templateId) {
    return NextResponse.json({ error: "Project ID and template ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: template, error: templateError } = await supabase
    .from("whatsapp_templates")
    .select("id, name, category, language, body, header, footer, buttons, status, variables")
    .eq("project_id", projectId)
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (template.status !== "draft") {
    return NextResponse.json({ error: "Only draft templates can be submitted" }, { status: 400 });
  }
  if (!template.body?.trim()) {
    return NextResponse.json({ error: "Template body is required by Meta. Add body text before submitting." }, { status: 400 });
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
  }

  const variableExamples = Array.isArray(template.variables)
    ? (template.variables as string[]).map((v) => String(v ?? "").slice(0, 100))
    : [];

  function bodyVariableCount(text: string | null): number {
    if (!text) return 0;
    const matches = text.match(/\{\{(\d+)\}\}/g);
    if (!matches) return 0;
    const indices = [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))].map(Number);
    return Math.max(0, ...indices);
  }

  const categoryMap = {
    marketing: "MARKETING" as const,
    utility: "UTILITY" as const,
    authentication: "AUTHENTICATION" as const,
  };
  const components: Array<{
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
    format?: string;
    text?: string;
    example?: { body_text?: string[][]; header_text?: string[] };
    buttons?: Array<{ type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string }>;
  }> = [];

  // Meta rejects empty example values; use non-empty placeholders.
  const safeExample = (s: string | null | undefined, fallback: string) =>
    (s != null && String(s).trim()) ? String(s).trim().slice(0, 100) : fallback;

  if (template.header) {
    const headerHasVar = /\{\{1\}\}/.test(template.header);
    const headerComp: { type: "HEADER"; format: string; text: string; example?: { header_text: string[] } } = {
      type: "HEADER",
      format: "TEXT",
      text: template.header,
    };
    if (headerHasVar) {
      const headerExample = safeExample(variableExamples[0], "Example");
      headerComp.example = { header_text: [headerExample.slice(0, 60)] };
    }
    components.push(headerComp);
  }
  if (template.body) {
    const bodyVarCount = bodyVariableCount(template.body);
    const bodyComp: { type: "BODY"; text: string; example?: { body_text: string[][] } } = {
      type: "BODY",
      text: template.body,
    };
    if (bodyVarCount > 0) {
      const filled: string[] = [];
      for (let i = 0; i < bodyVarCount; i++) {
        filled.push(safeExample(variableExamples[i], `Sample ${i + 1}`));
      }
      bodyComp.example = { body_text: [filled] };
    }
    components.push(bodyComp);
  }
  if (template.footer) {
    components.push({ type: "FOOTER", text: template.footer });
  }
  const buttons = Array.isArray(template.buttons) ? template.buttons : [];
  if (buttons.length > 0) {
    const metaButtons = buttons.slice(0, 3).map((b: { type?: string; text?: string; url?: string; phone_number?: string }) => {
      const label = (b.text && b.text.trim()) ? b.text.trim().slice(0, 200) : "Button";
      if (b.type === "url" && b.url) {
        return { type: "URL" as const, text: label, url: b.url };
      }
      if (b.type === "phone_number" && b.phone_number) {
        return { type: "PHONE_NUMBER" as const, text: label, phone_number: b.phone_number };
      }
      return { type: "QUICK_REPLY" as const, text: label };
    });
    components.push({ type: "BUTTONS", buttons: metaButtons });
  }

  const result = await submitTemplateToMeta(creds.access_token, creds.waba_id, {
    name: template.name,
    language: template.language ?? "en",
    category: categoryMap[template.category as keyof typeof categoryMap] ?? "MARKETING",
    components,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("whatsapp_templates")
    .update({
      status: "pending",
      meta_template_id: result.id,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("id", templateId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, meta_template_id: result.id });
}
