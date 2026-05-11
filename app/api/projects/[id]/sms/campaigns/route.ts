import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.trim();

  let query = access.supabase
    .from("sms_campaigns")
    .select("id, project_id, name, description, template_id, status, scheduled_at, started_at, completed_at, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map((row) => row.id);
  if (ids.length === 0) return NextResponse.json({ campaigns: [] });

  const { data: recipients } = await access.supabase
    .from("sms_campaign_recipients")
    .select("campaign_id,status")
    .in("campaign_id", ids);

  const stats: Record<string, { total: number; pending: number; sent: number; delivered: number; failed: number }> = {};
  for (const id of ids) stats[id] = { total: 0, pending: 0, sent: 0, delivered: 0, failed: 0 };
  for (const row of recipients ?? []) {
    const bucket = stats[row.campaign_id];
    if (!bucket) continue;
    bucket.total += 1;
    if (row.status === "pending" || row.status === "queued") bucket.pending += 1;
    if (row.status === "sent") bucket.sent += 1;
    if (row.status === "delivered") bucket.delivered += 1;
    if (row.status === "failed" || row.status === "undelivered") bucket.failed += 1;
  }

  return NextResponse.json({
    campaigns: (data ?? []).map((row) => ({
      ...row,
      recipient_count: stats[row.id]?.total ?? 0,
      pending_count: stats[row.id]?.pending ?? 0,
      sent_count: (stats[row.id]?.sent ?? 0) + (stats[row.id]?.delivered ?? 0),
      failed_count: stats[row.id]?.failed ?? 0,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  const body = await request.json().catch(() => ({}));

  const name = body?.name?.trim();
  const templateId = body?.template_id?.trim();
  const contactIds = Array.isArray(body?.contact_ids) ? body.contact_ids.filter((id: unknown) => typeof id === "string") : [];
  const sendNow = body?.send_now === true;
  const saveAsDraft = body?.save_as_draft === true;
  const scheduledAt = body?.scheduled_at?.trim() || null;

  if (!name || !templateId) {
    return NextResponse.json({ error: "name and template_id are required" }, { status: 400 });
  }

  const isDraft = saveAsDraft || (!sendNow && !scheduledAt);
  if (!isDraft && contactIds.length === 0) {
    return NextResponse.json({ error: "Select at least one contact for scheduled or immediate send." }, { status: 400 });
  }

  const status = sendNow ? "sending" : isDraft ? "draft" : "scheduled";
  const { data: campaign, error: campaignError } = await access.supabase
    .from("sms_campaigns")
    .insert({
      project_id: projectId,
      name,
      description: body?.description?.trim() || null,
      template_id: templateId,
      status,
      scheduled_at: scheduledAt,
      started_at: sendNow ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (campaignError || !campaign) {
    return NextResponse.json({ error: campaignError?.message ?? "Failed to create campaign" }, { status: 500 });
  }

  if (contactIds.length > 0) {
    const { data: eligible } = await access.supabase
      .from("sms_contacts")
      .select("id")
      .eq("project_id", projectId)
      .in("id", contactIds)
      .eq("opt_out", false)
      .eq("consent_status", "subscribed");
    const recipients = (eligible ?? []).map((row) => ({
      campaign_id: campaign.id,
      contact_id: row.id,
      status: "pending",
    }));
    if (recipients.length > 0) {
      const { error: recipientsError } = await access.supabase
        .from("sms_campaign_recipients")
        .insert(recipients);
      if (recipientsError) {
        await access.supabase.from("sms_campaigns").delete().eq("id", campaign.id);
        return NextResponse.json({ error: recipientsError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
