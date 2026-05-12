import { NextResponse } from "next/server";

import { SMS_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { processSmsCampaignBatch } from "@/lib/sms/process-campaign-batch";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SMS_ENABLED) {
    return NextResponse.json({ skipped: true, reason: "sms_disabled" });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: dueScheduled } = await supabase
    .from("sms_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now);

  if (dueScheduled?.length) {
    for (const campaign of dueScheduled) {
      await supabase
        .from("sms_campaigns")
        .update({ status: "sending", started_at: now, updated_at: now })
        .eq("id", campaign.id);
    }
  }

  const { data: sendingCampaigns } = await supabase
    .from("sms_campaigns")
    .select("id")
    .eq("status", "sending");

  if (!sendingCampaigns?.length) {
    return NextResponse.json({
      processed: 0,
      message: dueScheduled?.length ? "Started due scheduled campaigns." : "No campaigns in sending state",
    });
  }

  let totalSent = 0;
  let totalFailed = 0;
  for (const campaign of sendingCampaigns) {
    const result = await processSmsCampaignBatch(supabase, campaign.id);
    console.info("[sms-cron] campaign_batch", {
      campaign_id: campaign.id,
      sent: result.sent,
      failed: result.failed,
    });
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return NextResponse.json({
    processed: totalSent + totalFailed,
    sent: totalSent,
    failed: totalFailed,
    campaigns: sendingCampaigns.length,
  });
}
