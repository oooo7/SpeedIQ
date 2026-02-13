import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmailForProject } from "@/lib/email/client";
import { renderEmailBody, buildSubscriberVariables } from "@/lib/email/template";
import { getUnsubscribeUrl } from "@/lib/email/unsubscribe";

const THROTTLE_MS = 100;
const BATCH_SIZE = 50;

export interface ProcessResult {
  sent: number;
  failed: number;
}

/**
 * Process one batch of pending recipients for a campaign.
 * Updates recipient status (sent/failed) and campaign status when done.
 * Uses admin client for RLS bypass.
 */
export async function processCampaignBatch(
  supabase: SupabaseClient,
  campaignId: string
): Promise<ProcessResult> {
  const now = new Date().toISOString();
  let sent = 0;
  let failed = 0;

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select("id, project_id, template_id")
    .eq("id", campaignId)
    .single();

  if (!campaign?.template_id) {
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", updated_at: now })
      .eq("id", campaignId);
    return { sent: 0, failed: 0 };
  }

  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body_html, body_text, variables")
    .eq("id", campaign.template_id)
    .single();

  if (!template?.subject) {
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", updated_at: now })
      .eq("id", campaignId);
    return { sent: 0, failed: 0 };
  }

  const { data: recipients } = await supabase
    .from("email_campaign_recipients")
    .select("id, subscriber_id")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(BATCH_SIZE);

  const list = recipients ?? [];

  if (list.length === 0) {
    const { count: pendingCount } = await supabase
      .from("email_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
    if ((pendingCount ?? 0) === 0) {
      const { count: failedCount } = await supabase
        .from("email_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .eq("status", "failed");
      const finalStatus = (failedCount ?? 0) > 0 ? "failed" : "completed";
      await supabase
        .from("email_campaigns")
        .update({
          status: finalStatus,
          completed_at: now,
          updated_at: now,
        })
        .eq("id", campaignId);
    }
    return { sent: 0, failed: 0 };
  }

  for (const rec of list) {
    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("email, name")
      .eq("id", rec.subscriber_id)
      .single();

    const email = subscriber?.email;
    if (!email) {
      await supabase
        .from("email_campaign_recipients")
        .update({ status: "failed", error_message: "no_email" })
        .eq("id", rec.id);
      failed++;
      continue;
    }

    const unsubscribeUrl = getUnsubscribeUrl(campaign.project_id, rec.subscriber_id);
    const variables = buildSubscriberVariables(subscriber?.name ?? null, email, unsubscribeUrl);
    const html = renderEmailBody(template.body_html ?? "", variables);
    const subject = renderEmailBody(template.subject, variables);
    const text = template.body_text ? renderEmailBody(template.body_text, variables) : undefined;

    const result = await sendEmailForProject(campaign.project_id, {
      to: email,
      subject,
      html,
      text,
    });

    if (result.success) {
      await supabase
        .from("email_campaign_recipients")
        .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
        .eq("id", rec.id);
      sent++;
    } else {
      await supabase
        .from("email_campaign_recipients")
        .update({ status: "failed", error_message: (result.error ?? "").slice(0, 500) })
        .eq("id", rec.id);
      failed++;
    }

    await new Promise((r) => setTimeout(r, THROTTLE_MS));
  }

  const { count: pendingCount } = await supabase
    .from("email_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  if ((pendingCount ?? 0) === 0) {
    const { count: failedCount } = await supabase
      .from("email_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "failed");
    const finalStatus = (failedCount ?? 0) > 0 ? "failed" : "completed";
    await supabase
      .from("email_campaigns")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  return { sent, failed };
}
