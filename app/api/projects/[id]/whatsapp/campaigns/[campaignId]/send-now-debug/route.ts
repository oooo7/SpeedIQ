import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRole } from "@/lib/team";
import { getVariableValuesForContact, getWhatsAppAccountToken, sendTemplateMessage } from "@/lib/whatsapp/api";
import { isValidPhone } from "@/lib/whatsapp/phone";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Run send for this campaign synchronously and return sent/failed/errors.
 * Use for development debugging so errors show on the page.
 */
export async function POST(
  _request: Request,
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

  if (!useHelloWorld && campaign.template_id) {
    const { data: templateRow } = await admin
      .from("whatsapp_templates")
      .select("status")
      .eq("id", campaign.template_id)
      .single();
    if (templateRow?.status !== "approved") {
      return NextResponse.json(
        {
          error: "Only approved templates can be used for sending. Get your template approved first.",
          sent: 0,
          failed: 0,
          errors: [{ phone: "(all)", error: "Template must be approved before sending." }],
        },
        { status: 400 }
      );
    }
  }

  await admin
    .from("whatsapp_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  const creds = await getWhatsAppAccountToken(admin, projectId);
  if (!creds) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      errors: [{ phone: "(all)", error: "WhatsApp account not connected. Add credentials in Settings → WhatsApp." }],
    });
  }

  let templateName: string;
  let templateLanguage: string;
  let fallbackVariables: string[] = [];
  let mapping: string[] | null = null;
  let hasVariables = false;

  if (useHelloWorld) {
    templateName = "hello_world";
      templateLanguage = "en";
  } else {
    const { data: template } = await admin
      .from("whatsapp_templates")
      .select("name, language, status, variables, variable_field_mapping")
      .eq("id", campaign.template_id)
      .single();
    if (!template?.name) {
      return NextResponse.json(
        { error: "Campaign template not found.", sent: 0, failed: 0, errors: [{ phone: "(all)", error: "Template not found in database." }] },
        { status: 400 }
      );
    }
    templateName = template.name;
    templateLanguage = template.language ?? "en";
    fallbackVariables =
      Array.isArray(template.variables) && template.variables.length > 0
        ? (template.variables as string[]).map(String)
        : [];
    mapping = Array.isArray(template.variable_field_mapping)
      ? (template.variable_field_mapping as string[])
      : null;
    hasVariables = fallbackVariables.length > 0 || !!(mapping && mapping.length > 0);
  }

  const { data: recipients } = await admin
    .from("whatsapp_campaign_recipients")
    .select("id, contact_id, retry_count")
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  const list = recipients ?? [];
  const errors: Array<{ phone: string; error: string }> = [];
  let sent = 0;
  let failed = 0;

  for (const rec of list) {
    const { data: contact } = await admin
      .from("whatsapp_contacts")
      .select("phone, name, email, custom_fields, opt_out")
      .eq("id", rec.contact_id)
      .single();

    const phone = contact?.phone ?? "(no phone)";
    const nextRetryCount = (rec.retry_count ?? 0) + 1;
    if (!contact?.phone) {
      await admin
        .from("whatsapp_campaign_recipients")
        .update({ status: "failed", error_code: "no_phone", retry_count: nextRetryCount })
        .eq("id", rec.id);
      failed++;
      errors.push({ phone, error: "Contact has no phone number" });
      continue;
    }
    if (contact.opt_out) {
      await admin
        .from("whatsapp_campaign_recipients")
        .update({ status: "failed", error_code: "opt_out", retry_count: nextRetryCount })
        .eq("id", rec.id);
      failed++;
      errors.push({ phone: contact.phone, error: "Contact has opted out" });
      continue;
    }
    if (!isValidPhone(contact.phone)) {
      await admin
        .from("whatsapp_campaign_recipients")
        .update({ status: "failed", error_code: "invalid_phone", retry_count: nextRetryCount })
        .eq("id", rec.id);
      failed++;
      errors.push({ phone: contact.phone, error: "Invalid phone number — missing country code or wrong format" });
      continue;
    }

    const variableValues = hasVariables
      ? getVariableValuesForContact(
          { name: contact?.name, email: contact?.email, phone: contact?.phone, custom_fields: contact?.custom_fields },
          mapping,
          fallbackVariables
        )
      : undefined;

    const result = await sendTemplateMessage(
      creds.access_token,
      creds.phone_number_id,
      contact.phone,
      templateName,
      templateLanguage,
      {
        ...(variableValues && variableValues.length > 0 ? { variableValues } : {}),
        wabaId: creds.waba_id,
      }
    );

    if ("error" in result) {
      const errMsg = result.error.message ?? String(result.error.code);
      await admin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "failed",
          error_code: String(result.error.code ?? errMsg.slice(0, 100)),
          retry_count: nextRetryCount,
        })
        .eq("id", rec.id);
      failed++;
      errors.push({ phone: contact.phone, error: errMsg });
    } else {
      const nowIso = new Date().toISOString();
      await Promise.all([
        admin
          .from("whatsapp_campaign_recipients")
          .update({
            status: "sent",
            sent_at: nowIso,
            meta_message_id: result.message_id,
            retry_count: nextRetryCount,
          })
          .eq("id", rec.id),
        // Record in chat history so the message appears in the live chat
        admin.from("whatsapp_messages").insert({
          project_id: projectId,
          contact_id: rec.contact_id,
          direction: "out",
          type: "text",
          body: `Template: ${templateName}`,
          meta_message_id: result.message_id,
          status: "sent",
        }),
        // Ensure conversation record exists / update last_message_at
        admin.from("whatsapp_conversations").upsert(
          {
            project_id: projectId,
            contact_id: rec.contact_id,
            last_message_at: nowIso,
            updated_at: nowIso,
            unread_count: 0,
          },
          { onConflict: "project_id,contact_id", ignoreDuplicates: false }
        ),
      ]);
      sent++;
    }
  }

  const { count: remainingPending } = await admin
    .from("whatsapp_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  if ((remainingPending ?? 0) === 0) {
    const [{ count: sentCount }, { count: failedCount }] = await Promise.all([
      admin
        .from("whatsapp_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .in("status", ["sent", "delivered", "read"]),
      admin
        .from("whatsapp_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "failed"),
    ]);
    // Only mark as "failed" if every single recipient failed (none sent)
    const finalStatus = (sentCount ?? 0) === 0 && (failedCount ?? 0) > 0 ? "failed" : "completed";
    await admin
      .from("whatsapp_campaigns")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  return NextResponse.json({
    sent,
    failed,
    processed: sent + failed,
    errors,
  });
}
