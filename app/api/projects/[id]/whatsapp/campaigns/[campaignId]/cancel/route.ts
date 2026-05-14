import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export const dynamic = "force-dynamic";

/**
 * Cancel a campaign that's stuck in "sending" (typically because cron is broken).
 * Moves the campaign back to "draft" so the user can fix things and retry.
 * Preserves history for recipients already sent / delivered / read / failed.
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

  const { data: campaign } = await supabase
    .from("whatsapp_campaigns")
    .select("status")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "sending" && campaign.status !== "scheduled") {
    return NextResponse.json(
      { error: `Cannot cancel a campaign in '${campaign.status}' state. Only sending or scheduled campaigns can be cancelled.` },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("whatsapp_campaigns")
    .update({
      status: "draft",
      started_at: null,
      scheduled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("project_id", projectId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
