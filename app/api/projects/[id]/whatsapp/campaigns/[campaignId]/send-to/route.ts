import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRole } from "@/lib/team";
import {
  getVariableValuesForContact,
  getWhatsAppAccountToken,
  resolveHeaderMediaForSend,
  sendTemplateMessage,
  type TemplateHeaderMedia,
} from "@/lib/whatsapp/api";

export const dynamic = "force-dynamic";

/**
 * Send campaign message to a single contact (for testing / dev).
 * POST body: { contact_id: string } (the contact_id from campaign_recipients).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, campaignId } = await params;
  if (!projectId || !campaignId) {
    return NextResponse.json({ error: "Project and campaign ID required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const contactId = body?.contact_id?.trim();
  if (!contactId) {
    return NextResponse.json({ error: "contact_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: campaign, error: campError } = await admin
    .from("whatsapp_campaigns")
    .select("id, project_id, template_id, use_hello_world")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const useHelloWorld = !!campaign.use_hello_world;
  if (!useHelloWorld && !campaign.template_id) {
    return NextResponse.json(
      { error: "Campaign has no template selected. Add a template or enable the default hello_world template." },
      { status: 400 }
    );
  }

  const { data: recipient, error: recError } = await admin
    .from("whatsapp_campaign_recipients")
    .select("id, contact_id, retry_count, status")
    .eq("campaign_id", campaignId)
    .eq("contact_id", contactId)
    .single();

  if (recError || !recipient) {
    return NextResponse.json({ error: "Recipient not found in this campaign" }, { status: 404 });
  }

  // Guard against re-sending to a recipient who already received the
  // template. The UI hides the Send/Retry button for these statuses but a
  // stale tab or scripted caller could still hit this endpoint.
  if (recipient.status === "sent" || recipient.status === "delivered" || recipient.status === "read") {
    return NextResponse.json({
      ok: false,
      error: `This contact already received the message (status: ${recipient.status}). Refusing to send again.`,
      error_code: "already_sent",
    });
  }

  const creds = await getWhatsAppAccountToken(admin, projectId);
  if (!creds) {
    return NextResponse.json({
      ok: false,
      error: "WhatsApp account not connected",
      error_code: "no_account",
    });
  }

  const { data: contact } = await admin
    .from("whatsapp_contacts")
    .select("phone, name, email, custom_fields")
    .eq("id", contactId)
    .single();

  const phone = contact?.phone;
  const nextRetryCount = (recipient.retry_count ?? 0) + 1;
  if (!phone) {
    await admin
      .from("whatsapp_campaign_recipients")
      .update({ status: "failed", error_code: "no_phone", retry_count: nextRetryCount })
      .eq("id", recipient.id);
    return NextResponse.json({
      ok: false,
      error: "Contact has no phone",
      error_code: "no_phone",
    });
  }

  let templateName: string;
  let templateLanguage: string;
  let variableValues: string[] | undefined;
  let headerMedia: TemplateHeaderMedia | null = null;

  if (useHelloWorld) {
    templateName = "hello_world";
    templateLanguage = "en";
    variableValues = undefined;
  } else {
    const { data: template } = await admin
      .from("whatsapp_templates")
      .select("name, language, status, variables, variable_field_mapping, header_format, header_media_url")
      .eq("id", campaign.template_id)
      .single();

    if (!template?.name) {
      return NextResponse.json(
        { ok: false, error: "Campaign template not found.", error_code: "template_not_found" },
        { status: 400 }
      );
    }
    templateName = template.name;
    templateLanguage = template.language ?? "en";
    const fallbackVariables =
      Array.isArray(template.variables) && template.variables.length > 0
        ? (template.variables as string[]).map(String)
        : [];
    const mapping = Array.isArray(template.variable_field_mapping)
      ? (template.variable_field_mapping as string[])
      : null;
    const hasVariables = fallbackVariables.length > 0 || (mapping && mapping.length > 0);
    variableValues = hasVariables
      ? getVariableValuesForContact(
          { name: contact?.name, email: contact?.email, phone: contact?.phone, custom_fields: contact?.custom_fields },
          mapping,
          fallbackVariables
        )
      : undefined;
    headerMedia = await resolveHeaderMediaForSend(admin, template.header_format, template.header_media_url);
  }

  const result = await sendTemplateMessage(
    creds.access_token,
    creds.phone_number_id,
    phone,
    templateName,
    templateLanguage,
    {
      ...(variableValues && variableValues.length > 0 ? { variableValues } : {}),
      ...(headerMedia ? { headerMedia } : {}),
      wabaId: creds.waba_id,
    }
  );

  if ("error" in result) {
    const errorCode = String(result.error.code ?? result.error.message?.slice(0, 100));
    await admin
      .from("whatsapp_campaign_recipients")
      .update({ status: "failed", error_code: errorCode, retry_count: nextRetryCount })
      .eq("id", recipient.id);
    const userHint =
      result.error.code === 132001 || String(result.error.message ?? "").includes("Template name does not exist")
        ? " Approve your template in Meta Business Manager or choose another template in Edit campaign."
        : "";
    return NextResponse.json({
      ok: false,
      error: result.error.message + userHint,
      error_code: errorCode,
    });
  }

  const nowIso = new Date().toISOString();
  await admin
    .from("whatsapp_campaign_recipients")
    .update({
      status: "sent",
      sent_at: nowIso,
      meta_message_id: result.message_id,
      retry_count: nextRetryCount,
    })
    .eq("id", recipient.id);

  // Log the send so the template's delivery log captures it and the webhook
  // can later update delivered/read/failed status.
  try {
    await Promise.all([
      admin.from("whatsapp_messages").insert({
        project_id: projectId,
        contact_id: recipient.contact_id,
        direction: "out",
        type: "text",
        body: `Template: ${templateName}`,
        meta_message_id: result.message_id,
        status: "sent",
        template_id: campaign.template_id ?? null,
      }),
      admin.from("whatsapp_conversations").upsert(
        {
          project_id: projectId,
          contact_id: recipient.contact_id,
          last_message_at: nowIso,
          updated_at: nowIso,
          unread_count: 0,
        },
        { onConflict: "project_id,contact_id", ignoreDuplicates: false }
      ),
    ]);
  } catch (err) {
    console.error("[send-to] failed to log message / upsert conversation", err);
  }

  return NextResponse.json({
    ok: true,
    message_id: result.message_id,
  });
}
