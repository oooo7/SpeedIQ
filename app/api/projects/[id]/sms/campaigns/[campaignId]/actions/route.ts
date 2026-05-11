import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

const ALLOWED_ACTIONS = ["send_now", "pause", "resume", "cancel", "retry_failed"] as const;
type CampaignAction = (typeof ALLOWED_ACTIONS)[number];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id: projectId, campaignId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  if (!["owner", "admin", "editor"].includes(access.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action ?? "") as CampaignAction;
  if (!ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const { data: campaign } = await access.supabase
    .from("sms_campaigns")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const now = new Date().toISOString();

  if (action === "send_now") {
    if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
      return NextResponse.json({ error: `Cannot send a ${campaign.status} campaign.` }, { status: 400 });
    }
    const { data, error } = await access.supabase
      .from("sms_campaigns")
      .update({ status: "sending", started_at: now, scheduled_at: null, updated_at: now })
      .eq("id", campaignId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  }

  if (action === "pause") {
    if (!["sending", "scheduled"].includes(campaign.status)) {
      return NextResponse.json({ error: `Cannot pause a ${campaign.status} campaign.` }, { status: 400 });
    }
    const { data, error } = await access.supabase
      .from("sms_campaigns")
      .update({ status: "paused", updated_at: now })
      .eq("id", campaignId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  }

  if (action === "resume") {
    if (campaign.status !== "paused") {
      return NextResponse.json({ error: `Cannot resume a ${campaign.status} campaign.` }, { status: 400 });
    }
    const { data, error } = await access.supabase
      .from("sms_campaigns")
      .update({ status: "sending", updated_at: now })
      .eq("id", campaignId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  }

  if (action === "cancel") {
    if (["completed", "failed", "canceled"].includes(campaign.status)) {
      return NextResponse.json({ error: `Cannot cancel a ${campaign.status} campaign.` }, { status: 400 });
    }
    const { data, error } = await access.supabase
      .from("sms_campaigns")
      .update({ status: "canceled", completed_at: now, updated_at: now })
      .eq("id", campaignId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await access.supabase
      .from("sms_campaign_recipients")
      .update({ status: "failed", error_code: "campaign_canceled", error_message: "Campaign was canceled" })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
    return NextResponse.json({ campaign: data });
  }

  if (action === "retry_failed") {
    const { error: retryError } = await access.supabase
      .from("sms_campaign_recipients")
      .update({ status: "pending", error_code: null, error_message: null })
      .eq("campaign_id", campaignId)
      .in("status", ["failed", "undelivered"]);
    if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 });

    const next = ["completed", "failed"].includes(campaign.status) ? "sending" : campaign.status;
    const { data, error } = await access.supabase
      .from("sms_campaigns")
      .update({ status: next, completed_at: null, updated_at: now })
      .eq("id", campaignId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
