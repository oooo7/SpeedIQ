import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  fetchMessageTemplatesFromMeta,
  getFriendlyErrorMessage,
  getWhatsAppAccountToken,
  sendTemplateMessage,
} from "@/lib/whatsapp/api";

export const dynamic = "force-dynamic";

/**
 * Send a test template message.
 * POST body: { to, template_name?, template_id?, auto_pick? }
 * - auto_pick: true = pick any approved template from Meta (for "just test it works")
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
  const autoPick = body?.auto_pick === true;

  if (!to) {
    return NextResponse.json({ error: "Enter a phone number to send to." }, { status: 400 });
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected." }, { status: 400 });
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
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    }
    if (template.status !== "approved") {
      return NextResponse.json({ error: "This template isn't approved yet. Use an approved template." }, { status: 400 });
    }
    name = template.name;
    language = template.language ?? "en_US";
    if (Array.isArray(template.variables) && template.variables.length > 0) {
      variableValues = (template.variables as string[]).map(String);
    }
  } else if (templateName) {
    name = templateName;
    language = "en";
  } else if (autoPick) {
    const metaResult = await fetchMessageTemplatesFromMeta(creds.access_token, creds.waba_id);
    if ("error" in metaResult) {
      return NextResponse.json(
        { error: "Couldn't fetch templates from Meta. Check your WhatsApp connection." },
        { status: 400 }
      );
    }
    const approved = metaResult.templates.filter(
      (t) => t.status.toLowerCase() === "approved"
    );
    if (approved.length === 0) {
      return NextResponse.json(
        {
          error:
            "No approved templates found on your WhatsApp account. Create and approve a template in WhatsApp Manager first, then sync templates here.",
          noTemplates: true,
        },
        { status: 400 }
      );
    }
    const picked = approved[0];
    name = picked.name;
    language = picked.language;
  } else {
    return NextResponse.json({ error: "Select a template to send." }, { status: 400 });
  }

  const result = await sendTemplateMessage(
    creds.access_token,
    creds.phone_number_id,
    to,
    name,
    language,
    { ...(variableValues ? { variableValues } : {}), wabaId: creds.waba_id }
  );

  if ("error" in result) {
    const code = result.error.code;
    const needsRegistration = code === 133010;
    const errorMessage = needsRegistration
      ? "Your WhatsApp number isn't set up for sending yet. Complete the quick step in the popup to start messaging."
      : getFriendlyErrorMessage(result.error.message ?? "", code);
    return NextResponse.json(
      { error: errorMessage, code, needsRegistration: needsRegistration || undefined },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message_id: result.message_id,
    template_used: name,
  });
}
