import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppAccountToken, sendTemplateMessage } from "@/lib/whatsapp/api";

const CRON_SECRET = process.env.CRON_SECRET;
const THROTTLE_MS = 15;
const BATCH_SIZE = 50;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: campaigns } = await supabase
    .from("whatsapp_campaigns")
    .select("id, project_id, template_id")
    .eq("status", "sending");

  if (!campaigns?.length) {
    return NextResponse.json({ processed: 0, message: "No campaigns in sending state" });
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const campaign of campaigns) {
    if (!campaign.template_id) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
      continue;
    }

    const creds = await getWhatsAppAccountToken(supabase, campaign.project_id);
    if (!creds) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
      continue;
    }

    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("name, language, status")
      .eq("id", campaign.template_id)
      .single();

    if (!template?.name) {
      await supabase
        .from("whatsapp_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaign.id);
      continue;
    }

    const templateName = template.name;
    const templateLanguage = template.language ?? "en";

    const { data: recipients } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("id, contact_id, retry_count")
      .eq("campaign_id", campaign.id)
      .eq("status", "pending")
      .limit(BATCH_SIZE);

    const list = recipients ?? [];

    for (const rec of list) {
      const { data: contact } = await supabase
        .from("whatsapp_contacts")
        .select("phone")
        .eq("id", rec.contact_id)
        .single();
      const phone = contact?.phone;
      const nextRetryCount = (rec.retry_count ?? 0) + 1;
      if (!phone) {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({ status: "failed", error_code: "no_phone", retry_count: nextRetryCount })
          .eq("id", rec.id);
        totalFailed++;
        continue;
      }

      const result = await sendTemplateMessage(
        creds.access_token,
        creds.phone_number_id,
        phone,
        templateName,
        templateLanguage
      );

      if ("error" in result) {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({
            status: "failed",
            error_code: String(result.error.code ?? result.error.message?.slice(0, 100)),
            retry_count: nextRetryCount,
          })
          .eq("id", rec.id);
        totalFailed++;
      } else {
        await supabase
          .from("whatsapp_campaign_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            meta_message_id: result.message_id,
            retry_count: nextRetryCount,
          })
          .eq("id", rec.id);
        totalSent++;
      }

      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }

    const { count: pendingCount } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", "pending");
    if ((pendingCount ?? 0) === 0) {
      const { count: failedCount } = await supabase
        .from("whatsapp_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "failed");
      const finalStatus = (failedCount ?? 0) > 0 ? "failed" : "completed";
      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
    }
  }

  return NextResponse.json({
    processed: totalSent + totalFailed,
    sent: totalSent,
    failed: totalFailed,
  });
}
