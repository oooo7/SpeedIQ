import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  fetchMessageTemplatesFromMeta,
  getFriendlyErrorMessage,
  getWhatsAppAccountToken,
  resolveHeaderMediaForSend,
  sendTemplateMessage,
  type TemplateHeaderMedia,
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
  const templateLanguage = body?.template_language?.trim();
  const templateId = body?.template_id?.trim();
  const autoPick = body?.auto_pick === true;
  const manualVariableValues: string[] | undefined =
    Array.isArray(body?.variable_values) && body.variable_values.length > 0
      ? (body.variable_values as unknown[]).map((v) => String(v ?? ""))
      : undefined;

  if (!to) {
    return NextResponse.json({ error: "Enter a phone number to send to." }, { status: 400 });
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected." }, { status: 400 });
  }

  const admin = createAdminClient();

  let name: string;
  let language: string;
  let variableValues: string[] | undefined;
  let headerMedia: TemplateHeaderMedia | null = null;

  if (templateId) {
    const { data: template, error: tErr } = await supabase
      .from("whatsapp_templates")
      .select("name, language, status, variables, header_format, header_media_url")
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
    headerMedia = await resolveHeaderMediaForSend(admin, template.header_format, template.header_media_url);
  } else if (templateName) {
    name = templateName;
    language = templateLanguage || "en";
    // Look up example variable values + header media from local DB (populated during sync)
    const { data: localTemplate } = await supabase
      .from("whatsapp_templates")
      .select("variables, header_format, header_media_url")
      .eq("project_id", projectId)
      .eq("name", templateName)
      .maybeSingle();
    if (Array.isArray(localTemplate?.variables) && localTemplate.variables.length > 0) {
      variableValues = (localTemplate.variables as string[]).map(String);
    }
    headerMedia = await resolveHeaderMediaForSend(admin, localTemplate?.header_format, localTemplate?.header_media_url);
  } else if (autoPick) {
    const metaResult = await fetchMessageTemplatesFromMeta(creds.access_token, creds.waba_id);
    if ("error" in metaResult) {
      return NextResponse.json(
        { error: "Couldn't fetch templates from Meta. Check your WhatsApp connection." },
        { status: 400 }
      );
    }
    const approved = metaResult.templates.filter((t) => {
      if (t.status.toLowerCase() !== "approved") return false;
      // Skip media-header templates — auto-pick can't supply the required header media.
      const headerComp = t.components?.find((c) => c.type === "HEADER");
      const fmt = (headerComp?.format ?? "").toUpperCase();
      return !["IMAGE", "VIDEO", "DOCUMENT"].includes(fmt);
    });
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

  // Manual values from the UI take priority over auto-looked-up example values
  const finalVariableValues = manualVariableValues ?? variableValues;

  const result = await sendTemplateMessage(
    creds.access_token,
    creds.phone_number_id,
    to,
    name,
    language,
    {
      ...(finalVariableValues ? { variableValues: finalVariableValues } : {}),
      ...(headerMedia ? { headerMedia } : {}),
      wabaId: creds.waba_id,
    }
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

  // Log the send to whatsapp_messages so the template's delivery log captures
  // it (and the status webhook can later update it to delivered/read/failed).
  // Without this row, Meta's async failure webhook has nothing to update,
  // and the user sees a successful send in the UI while the message never lands.
  try {
    // Resolve template_id when only name+language were given (test-by-name path).
    let resolvedTemplateId: string | null = templateId || null;
    if (!resolvedTemplateId && templateName) {
      const { data: localTemplate } = await supabase
        .from("whatsapp_templates")
        .select("id")
        .eq("project_id", projectId)
        .eq("name", templateName)
        .maybeSingle();
      resolvedTemplateId = localTemplate?.id ?? null;
    }

    // Make sure a contact exists for the recipient — whatsapp_messages.contact_id
    // is NOT NULL. Don't upsert by phone (some projects allow duplicates); pick
    // the first matching contact, or insert a minimal one.
    const normalizedPhone = to.replace(/[^\d+]/g, "");
    const { data: existingContact } = await supabase
      .from("whatsapp_contacts")
      .select("id")
      .eq("project_id", projectId)
      .eq("phone", normalizedPhone)
      .limit(1)
      .maybeSingle();

    let contactId: string | null = existingContact?.id ?? null;
    if (!contactId) {
      const { data: insertedContact } = await supabase
        .from("whatsapp_contacts")
        .insert({ project_id: projectId, phone: normalizedPhone })
        .select("id")
        .single();
      contactId = insertedContact?.id ?? null;
    }

    if (contactId) {
      await supabase.from("whatsapp_messages").insert({
        project_id: projectId,
        contact_id: contactId,
        direction: "out",
        type: "text",
        body: `Template: ${name}`,
        meta_message_id: result.message_id,
        status: "sent",
        template_id: resolvedTemplateId,
      });
    }
  } catch (err) {
    console.error("[test-message] failed to log send to whatsapp_messages", err);
    // Don't fail the response — the actual send already succeeded.
  }

  return NextResponse.json({
    success: true,
    message_id: result.message_id,
    template_used: name,
  });
}
