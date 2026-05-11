import type { SupabaseClient } from "@supabase/supabase-js";

import { smsCost } from "@/lib/billing/cost";
import { deductCredits, grantCredits, recordUsageEvent } from "@/lib/billing/credits";
import { sendSmsForProject } from "@/lib/sms/client";
import { isRetryableSmsError } from "@/lib/sms/errors";
import { renderSmsTemplate } from "@/lib/sms/template";
import { recipientStatusFromMessageStatus } from "@/lib/sms/status";

const THROTTLE_MS = 40;
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;

export interface ProcessSmsBatchResult {
  sent: number;
  failed: number;
}

export async function processSmsCampaignBatch(
  supabase: SupabaseClient,
  campaignId: string
): Promise<ProcessSmsBatchResult> {
  let sent = 0;
  let failed = 0;

  const { data: campaign } = await supabase
    .from("sms_campaigns")
    .select("id, project_id, template_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign?.template_id) {
    await supabase
      .from("sms_campaigns")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { sent: 0, failed: 0 };
  }

  const { data: template } = await supabase
    .from("sms_templates")
    .select("body")
    .eq("id", campaign.template_id)
    .maybeSingle();
  if (!template?.body) {
    await supabase
      .from("sms_campaigns")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { sent: 0, failed: 0 };
  }

  const { data: recipients } = await supabase
    .from("sms_campaign_recipients")
    .select("id, contact_id, retry_count")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .limit(BATCH_SIZE);

  const list = recipients ?? [];
  if (list.length === 0) {
    const { count: pendingCount } = await supabase
      .from("sms_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
    if ((pendingCount ?? 0) === 0) {
      const [{ count: okCount }, { count: failCount }] = await Promise.all([
        supabase
          .from("sms_campaign_recipients")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId)
          .in("status", ["sent", "delivered"]),
        supabase
          .from("sms_campaign_recipients")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId)
          .in("status", ["failed", "undelivered"]),
      ]);
      const finalStatus = (okCount ?? 0) === 0 && (failCount ?? 0) > 0 ? "failed" : "completed";
      await supabase
        .from("sms_campaigns")
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
    }
    return { sent: 0, failed: 0 };
  }

  for (const rec of list) {
    const { data: contact } = await supabase
      .from("sms_contacts")
      .select("id, phone, name, email, opt_out, consent_status")
      .eq("id", rec.contact_id)
      .maybeSingle();

    if (!contact?.phone || contact.opt_out || contact.consent_status !== "subscribed") {
      await supabase
        .from("sms_campaign_recipients")
        .update({
          status: "failed",
          retry_count: (rec.retry_count ?? 0) + 1,
          error_code: "missing_or_opt_out_or_not_consented_contact",
        })
        .eq("id", rec.id);
      failed += 1;
      continue;
    }

    const body = renderSmsTemplate(template.body, {
      name: contact.name ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
    });

    const { credits: smsCredits, type: smsMessageType } = smsCost(contact.phone);
    const balanceAfter = await deductCredits({
      client: supabase,
      projectId: campaign.project_id,
      amount: smsCredits,
      reason: "sms_send",
      refType: "sms_campaign_recipient",
      refId: rec.id,
      metadata: { campaign_id: campaign.id, message_type: smsMessageType },
    });
    if (balanceAfter === null) {
      await supabase
        .from("sms_campaign_recipients")
        .update({
          status: "failed",
          retry_count: (rec.retry_count ?? 0) + 1,
          error_code: "insufficient_credits",
        })
        .eq("id", rec.id);
      failed += 1;
      continue;
    }

    const result = await sendSmsForProject(supabase, campaign.project_id, {
      to: contact.phone,
      body,
    });

    if (!result.success) {
      const nextRetry = (rec.retry_count ?? 0) + 1;
      const retryable = isRetryableSmsError(result.errorCode);
      const nextStatus = retryable && nextRetry < MAX_RETRIES ? "pending" : "failed";
      await supabase
        .from("sms_campaign_recipients")
        .update({
          status: nextStatus,
          retry_count: nextRetry,
          error_code: result.errorCode ?? "send_failed",
          error_message: result.error?.slice(0, 500),
        })
        .eq("id", rec.id);
      // Refund credits — user shouldn't pay for a failed send.
      await grantCredits({
        client: supabase,
        projectId: campaign.project_id,
        amount: smsCredits,
        reason: "refund",
        refType: "sms_campaign_recipient",
        refId: rec.id,
        metadata: { reason: "send_failed" },
      });
      if (nextStatus === "failed") failed += 1;
      continue;
    }

    const msgStatus = recipientStatusFromMessageStatus((result.status as never) ?? "queued");
    await Promise.all([
      supabase
        .from("sms_campaign_recipients")
        .update({
          status: msgStatus,
          sent_at: new Date().toISOString(),
          twilio_message_sid: result.sid,
          error_code: null,
          error_message: null,
          retry_count: (rec.retry_count ?? 0) + 1,
        })
        .eq("id", rec.id),
      supabase.from("sms_messages").insert({
        project_id: campaign.project_id,
        contact_id: rec.contact_id,
        campaign_id: campaign.id,
        direction: "out",
        to_number: contact.phone,
        body,
        twilio_message_sid: result.sid,
        status: result.status ?? "queued",
        provider_payload: {},
      }),
      supabase.from("sms_conversations").upsert(
        {
          project_id: campaign.project_id,
          contact_id: rec.contact_id,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,contact_id", ignoreDuplicates: false }
      ),
      recordUsageEvent({
        client: supabase,
        projectId: campaign.project_id,
        channel: "sms",
        messageType: smsMessageType,
        recipientId: rec.contact_id,
        campaignId: campaign.id,
        creditsCharged: smsCredits,
        providerMessageId: result.sid,
        status: result.status ?? "queued",
      }),
    ]);
    sent += 1;

    await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
  }

  const { count: pendingCount } = await supabase
    .from("sms_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  if ((pendingCount ?? 0) === 0) {
    const [{ count: okCount }, { count: failCount }] = await Promise.all([
      supabase
        .from("sms_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .in("status", ["sent", "delivered"]),
      supabase
        .from("sms_campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .in("status", ["failed", "undelivered"]),
    ]);

    const finalStatus = (okCount ?? 0) === 0 && (failCount ?? 0) > 0 ? "failed" : "completed";
    await supabase
      .from("sms_campaigns")
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }

  return { sent, failed };
}
