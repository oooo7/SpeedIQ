import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectRole } from "@/lib/team";
import { processCampaignBatch } from "@/lib/email/process-campaign-batch";

/**
 * Add recipients to a draft or scheduled campaign. Optionally set status to sending.
 * POST body: { subscriber_ids: string[], send_now?: boolean }
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
    return NextResponse.json({ error: "Project ID and campaign ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const subscriber_ids = Array.isArray(body?.subscriber_ids) ? body.subscriber_ids.filter((id: unknown) => typeof id === "string") : [];
  const send_now = body?.send_now === true;

  const { data: campaign, error: campError } = await supabase
    .from("email_campaigns")
    .select("id, status, template_id")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "Only draft or scheduled campaigns can receive new recipients" }, { status: 400 });
  }
  if (!campaign.template_id) {
    return NextResponse.json({ error: "Campaign has no template" }, { status: 400 });
  }

  if (subscriber_ids.length === 0 && !send_now) {
    return NextResponse.json({ error: "subscriber_ids required or send_now to trigger send" }, { status: 400 });
  }

  let added = 0;
  if (subscriber_ids.length > 0) {
    const existing = await supabase
      .from("email_campaign_recipients")
      .select("subscriber_id")
      .eq("campaign_id", campaignId);
    const existingIds = new Set((existing.data ?? []).map((r: { subscriber_id: string }) => r.subscriber_id));
    const toAdd = subscriber_ids.filter((id: string) => !existingIds.has(id));
    if (toAdd.length > 0) {
      const { error: insertError } = await supabase.from("email_campaign_recipients").insert(
        toAdd.map((subscriber_id: string) => ({
          campaign_id: campaignId,
          subscriber_id,
          status: "pending",
        }))
      );
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      added = toAdd.length;
    }
  }

  if (send_now) {
    const now = new Date().toISOString();
    await supabase
      .from("email_campaigns")
      .update({ status: "sending", started_at: now, updated_at: now })
      .eq("id", campaignId);

    // Process immediately so user gets feedback (don't wait for cron)
    const admin = createAdminClient();
    const result = await processCampaignBatch(admin, campaignId);
    return NextResponse.json({
      added,
      send_now: true,
      sent: result.sent,
      failed: result.failed,
    });
  }

  return NextResponse.json({ added, send_now });
}
