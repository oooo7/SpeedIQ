import type { SupabaseClient } from "@supabase/supabase-js";

import { emailCost } from "@/lib/billing/cost";
import { deductCredits, grantCredits, recordUsageEvent } from "@/lib/billing/credits";
import { sendEmailForProject } from "@/lib/email/client";
import { renderEmailBody, buildSubscriberVariables } from "@/lib/email/template";
import { getUnsubscribeUrl } from "@/lib/email/unsubscribe";

const THROTTLE_MS = 100;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

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
    .select("id, subscriber_id, retry_count")
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
      const [{ count: sentCount }, { count: failedCount }] = await Promise.all([
        supabase.from("email_campaign_recipients").select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId).eq("status", "sent"),
        supabase.from("email_campaign_recipients").select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId).eq("status", "failed"),
      ]);
      // Only mark as "failed" if every recipient failed (none sent successfully)
      const finalStatus = (sentCount ?? 0) === 0 && (failedCount ?? 0) > 0 ? "failed" : "completed";
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
      .select("email, name, status")
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

    // Skip unsubscribed or bounced contacts — mark as failed so the campaign can complete
    if (subscriber.status === "unsubscribed" || subscriber.status === "bounced") {
      await supabase
        .from("email_campaign_recipients")
        .update({ status: "failed", error_message: subscriber.status })
        .eq("id", rec.id);
      failed++;
      continue;
    }

    const unsubscribeUrl = getUnsubscribeUrl(campaign.project_id, rec.subscriber_id);
    const variables = buildSubscriberVariables(subscriber?.name ?? null, email, unsubscribeUrl);
    const html = renderEmailBody(template.body_html ?? "", variables);
    const subject = renderEmailBody(template.subject, variables);
    const text = template.body_text ? renderEmailBody(template.body_text, variables) : undefined;

    const credits = emailCost();
    const balanceAfter = await deductCredits({
      client: supabase,
      projectId: campaign.project_id,
      amount: credits,
      reason: "email_send",
      refType: "email_campaign_recipient",
      refId: rec.id,
      metadata: { campaign_id: campaignId },
    });
    if (balanceAfter === null) {
      await supabase
        .from("email_campaign_recipients")
        .update({ status: "failed", error_message: "insufficient_credits" })
        .eq("id", rec.id);
      failed++;
      continue;
    }

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
      await recordUsageEvent({
        client: supabase,
        projectId: campaign.project_id,
        channel: "email",
        messageType: "campaign",
        recipientId: rec.subscriber_id,
        campaignId,
        creditsCharged: credits,
        status: "sent",
      });
      sent++;
    } else {
      const currentRetry = (rec as { retry_count?: number }).retry_count ?? 0;
      const nextRetry = currentRetry + 1;
      // Re-queue for retry if under the limit; permanently fail otherwise
      const nextStatus = nextRetry < MAX_RETRIES ? "pending" : "failed";
      await supabase
        .from("email_campaign_recipients")
        .update({
          status: nextStatus,
          error_message: (result.error ?? "").slice(0, 500),
          retry_count: nextRetry,
        })
        .eq("id", rec.id);
      // Refund credits on send failure — user shouldn't pay for a failed send.
      await grantCredits({
        client: supabase,
        projectId: campaign.project_id,
        amount: credits,
        reason: "refund",
        refType: "email_campaign_recipient",
        refId: rec.id,
        metadata: { reason: "send_failed" },
      });
      if (nextStatus === "failed") failed++;
      // If re-queued, don't count as failed yet — it'll be retried next cron tick
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
