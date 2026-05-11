import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const url = new URL(request.url);
  const rangeKey = url.searchParams.get("range") ?? "30d";
  const days = RANGE_DAYS[rangeKey] ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [contactsRes, campaignsRes, recipientsRes, messagesRes, recentMessagesRes] = await Promise.all([
    access.supabase.from("sms_contacts").select("id,opt_out,consent_status", { count: "exact" }).eq("project_id", projectId),
    access.supabase
      .from("sms_campaigns")
      .select("id,name,status,scheduled_at,started_at,completed_at,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    access.supabase
      .from("sms_campaign_recipients")
      .select("status,campaign_id,sms_campaigns!inner(project_id,name)")
      .eq("sms_campaigns.project_id", projectId),
    access.supabase
      .from("sms_messages")
      .select("direction,status", { count: "exact" })
      .eq("project_id", projectId),
    access.supabase
      .from("sms_messages")
      .select("direction,created_at,status")
      .eq("project_id", projectId)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  if (
    contactsRes.error ||
    campaignsRes.error ||
    recipientsRes.error ||
    messagesRes.error ||
    recentMessagesRes.error
  ) {
    return NextResponse.json(
      {
        error:
          contactsRes.error?.message ||
          campaignsRes.error?.message ||
          recipientsRes.error?.message ||
          messagesRes.error?.message ||
          recentMessagesRes.error?.message ||
          "Failed to load analytics",
      },
      { status: 500 }
    );
  }

  const recipientStats = { pending: 0, queued: 0, sent: 0, delivered: 0, undelivered: 0, failed: 0 };
  for (const row of recipientsRes.data ?? []) {
    const status = row.status as keyof typeof recipientStats;
    if (status in recipientStats) recipientStats[status] += 1;
  }

  const campaignStatus = {
    draft: 0,
    scheduled: 0,
    sending: 0,
    paused: 0,
    completed: 0,
    failed: 0,
    canceled: 0,
  };
  for (const row of campaignsRes.data ?? []) {
    const status = row.status as keyof typeof campaignStatus;
    if (status in campaignStatus) campaignStatus[status] += 1;
  }

  const messages = messagesRes.data ?? [];
  const outbound = messages.filter((m) => m.direction === "out");
  const delivered = outbound.filter((m) => m.status === "delivered").length;
  const failed = outbound.filter((m) => m.status === "failed" || m.status === "undelivered").length;

  const series: Record<string, { date: string; outbound: number; inbound: number; delivered: number; failed: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    series[key] = { date: key, outbound: 0, inbound: 0, delivered: 0, failed: 0 };
  }
  for (const m of recentMessagesRes.data ?? []) {
    const key = m.created_at.slice(0, 10);
    const bucket = series[key];
    if (!bucket) continue;
    if (m.direction === "out") {
      bucket.outbound += 1;
      if (m.status === "delivered") bucket.delivered += 1;
      if (m.status === "failed" || m.status === "undelivered") bucket.failed += 1;
    } else {
      bucket.inbound += 1;
    }
  }

  const recipientByCampaign: Record<string, { id: string; name: string; sent: number; failed: number; pending: number }> = {};
  for (const row of recipientsRes.data ?? []) {
    const cId = row.campaign_id as string;
    type CampaignRef = { name?: string };
    const camp = row.sms_campaigns as CampaignRef | CampaignRef[] | null;
    const campaignName = Array.isArray(camp) ? camp[0]?.name : camp?.name;
    if (!recipientByCampaign[cId]) {
      recipientByCampaign[cId] = { id: cId, name: campaignName ?? "Untitled", sent: 0, failed: 0, pending: 0 };
    }
    const bucket = recipientByCampaign[cId];
    if (row.status === "sent" || row.status === "delivered") bucket.sent += 1;
    else if (row.status === "failed" || row.status === "undelivered") bucket.failed += 1;
    else if (row.status === "pending" || row.status === "queued") bucket.pending += 1;
  }

  const totalContacts = contactsRes.count ?? 0;
  const contacts = contactsRes.data ?? [];
  const optedOut = contacts.filter((c) => c.opt_out).length;
  const subscribed = contacts.filter((c) => c.consent_status === "subscribed").length;

  return NextResponse.json({
    totals: {
      contacts: totalContacts,
      subscribed_contacts: subscribed,
      opted_out_contacts: optedOut,
      campaigns: campaignsRes.data?.length ?? 0,
      outbound_messages: outbound.length,
      inbound_messages: messages.length - outbound.length,
      delivered_messages: delivered,
      failed_messages: failed,
      delivery_rate: outbound.length === 0 ? 0 : Math.round((delivered / outbound.length) * 1000) / 10,
    },
    campaign_status: campaignStatus,
    recipient_status: recipientStats,
    timeseries: Object.values(series),
    by_campaign: Object.values(recipientByCampaign).sort((a, b) => b.sent + b.failed - (a.sent + a.failed)).slice(0, 10),
    recent_campaigns: (campaignsRes.data ?? []).slice(0, 5),
  });
}
