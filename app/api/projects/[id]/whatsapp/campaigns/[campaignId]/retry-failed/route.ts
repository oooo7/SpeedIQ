import { NextResponse } from "next/server";

import { withRouteErrorHandler } from "@/lib/api/route-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export const dynamic = "force-dynamic";

/**
 * Reset every failed recipient on this campaign back to `pending` (with
 * retry_count = 0 and a cleared error_code) and re-arm the campaign as
 * `sending` so the cron picks them up. The auto-stop guard in the cron
 * still applies on the next pass, so retrying a known-bad list won't burn
 * through more than ~100 credits before being halted again.
 */
export function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; campaignId: string }> }
) {
  return withRouteErrorHandler(() => handlePost(request, ctx));
}

async function handlePost(
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

  const { data: campaign } = await admin
    .from("whatsapp_campaigns")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Reset every failed recipient. select+head gives us the count for the
  // response toast without fetching the whole list.
  // NOTE: this table has no `updated_at` column — writing one returns PGRST204
  // and the entire UPDATE is rejected, which used to make Retry Failed appear
  // to do nothing.
  const { error: updateError, count: retried } = await admin
    .from("whatsapp_campaign_recipients")
    .update(
      {
        status: "pending",
        retry_count: 0,
        error_code: null,
      },
      { count: "exact" }
    )
    .eq("campaign_id", campaignId)
    .eq("status", "failed");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if ((retried ?? 0) === 0) {
    return NextResponse.json({ ok: true, retried: 0, message: "No failed recipients to retry." });
  }

  // Flip the campaign back into the cron's pickup queue. completed_at is
  // cleared so a previously-completed campaign doesn't keep its old timestamp.
  const { error: campaignError } = await admin
    .from("whatsapp_campaigns")
    .update({
      status: "sending",
      started_at: new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (campaignError) {
    return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, retried: retried ?? 0 });
}
