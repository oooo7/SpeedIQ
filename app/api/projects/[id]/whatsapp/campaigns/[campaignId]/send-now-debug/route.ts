import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRole } from "@/lib/team";
import { getWhatsAppAccountToken, sendTemplateMessage } from "@/lib/whatsapp/api";

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
    .select("id, project_id, template_id")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!campaign.template_id) {
    return NextResponse.json(
      { error: "Campaign has no template selected. Add a template before sending." },
      { status: 400 }
    );
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
      errors: [{ phone: "(all)", error: "WhatsApp account not connected. Add credentials in Settings > WhatsApp Account." }],
    });
  }

  const { data: template } = await admin
    .from("whatsapp_templates")
    .select("name, language, status")
    .eq("id", campaign.template_id)
    .single();

  if (!template?.name) {
    return NextResponse.json(
      { error: "Campaign template not found.", sent: 0, failed: 0, errors: [{ phone: "(all)", error: "Template not found in database." }] },
      { status: 400 }
    );
  }

  const templateName = template.name;
  const templateLanguage = template.language ?? "en";

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
      .select("phone")
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

    const result = await sendTemplateMessage(
      creds.access_token,
      creds.phone_number_id,
      contact.phone,
      templateName,
      templateLanguage
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
      await admin
        .from("whatsapp_campaign_recipients")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          meta_message_id: result.message_id,
          retry_count: nextRetryCount,
        })
        .eq("id", rec.id);
      sent++;
    }
  }

  const { count: remainingPending } = await admin
    .from("whatsapp_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  if ((remainingPending ?? 0) === 0) {
    const { count: failedCount } = await admin
      .from("whatsapp_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "failed");
    const finalStatus = (failedCount ?? 0) > 0 ? "failed" : "completed";
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
