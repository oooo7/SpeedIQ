import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id: projectId, campaignId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { data: campaign, error } = await access.supabase
    .from("sms_campaigns")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const { data: recipients } = await access.supabase
    .from("sms_campaign_recipients")
    .select("id, campaign_id, contact_id, status, sent_at, error_code, error_message, retry_count, twilio_message_sid, sms_contacts(id,phone,name)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ campaign, recipients: recipients ?? [] });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id: projectId, campaignId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  const body = await request.json().catch(() => ({}));

  const { data: existing } = await access.supabase
    .from("sms_campaigns")
    .select("status")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (!["draft", "scheduled"].includes(existing.status)) {
    return NextResponse.json({ error: "Only draft or scheduled campaigns can be edited." }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from("sms_campaigns")
    .update({
      name: body?.name?.trim(),
      description: body?.description?.trim() || null,
      status: body?.status?.trim() || existing.status,
      scheduled_at: body?.scheduled_at?.trim() || null,
    })
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id: projectId, campaignId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { error } = await access.supabase
    .from("sms_campaigns")
    .delete()
    .eq("project_id", projectId)
    .eq("id", campaignId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
