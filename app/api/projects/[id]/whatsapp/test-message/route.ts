import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { getWhatsAppAccountToken, sendTemplateMessage } from "@/lib/whatsapp/api";

export const dynamic = "force-dynamic";

/**
 * Send a test template message (same format as Meta dashboard).
 * POST body: { to: string, template_name?: string, template_id?: string }
 * - to: recipient phone (e.g. 917470915225)
 * - template_name: "hello_world" for testing, or use template_id for a project template
 * - template_id: optional UUID of a project template (approved); overrides template_name
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const to = body?.to?.trim();
  const templateName = body?.template_name?.trim();
  const templateId = body?.template_id?.trim();

  if (!to) {
    return NextResponse.json({ error: "to (phone number) is required" }, { status: 400 });
  }

  if (!templateName && !templateId) {
    return NextResponse.json({ error: "A template must be selected. Send template_name (e.g. hello_world) or template_id." }, { status: 400 });
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
  }

  let name: string;
  let language: string;

  let variableValues: string[] | undefined;
  if (templateId) {
    const { data: template, error: tErr } = await supabase
      .from("whatsapp_templates")
      .select("name, language, status, variables")
      .eq("project_id", projectId)
      .eq("id", templateId)
      .single();

    if (tErr || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (template.status !== "approved") {
      return NextResponse.json({ error: "Only approved templates can be used. This template is not approved." }, { status: 400 });
    }
    name = template.name;
    language = template.language ?? "en_US";
    if (Array.isArray(template.variables) && template.variables.length > 0) {
      variableValues = (template.variables as string[]).map(String);
    }
  } else {
    name = templateName as string;
    language = name === "hello_world" ? "en_US" : "en";
  }

  const result = await sendTemplateMessage(
    creds.access_token,
    creds.phone_number_id,
    to,
    name,
    language,
    variableValues ? { variableValues } : undefined
  );

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, message_id: result.message_id });
}
