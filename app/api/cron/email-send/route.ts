import { NextResponse } from "next/server";

import { EMAIL_ENABLED } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { processCampaignBatch } from "@/lib/email/process-campaign-batch";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!CRON_SECRET || bearer !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!EMAIL_ENABLED) {
    return NextResponse.json({ skipped: true, reason: "email_disabled" });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: dueScheduled } = await supabase
    .from("email_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now);
  if (dueScheduled?.length) {
    for (const c of dueScheduled) {
      await supabase
        .from("email_campaigns")
        .update({ status: "sending", started_at: now, updated_at: now })
        .eq("id", c.id);
    }
  }

  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("id, project_id, template_id")
    .eq("status", "sending");

  if (!campaigns?.length) {
    return NextResponse.json({
      processed: 0,
      message: dueScheduled?.length ? "Started scheduled campaigns; send batches run next cron cycle" : "No campaigns in sending state",
    });
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const campaign of campaigns) {
    const result = await processCampaignBatch(supabase, campaign.id);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return NextResponse.json({
    processed: totalSent + totalFailed,
    sent: totalSent,
    failed: totalFailed,
  });
}
