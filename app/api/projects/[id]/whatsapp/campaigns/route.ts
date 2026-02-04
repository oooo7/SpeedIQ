import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status")?.trim();

  let query = supabase
    .from("whatsapp_campaigns")
    .select("id, project_id, name, description, template_id, status, scheduled_at, started_at, completed_at, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: campaigns, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = campaigns ?? [];
  if (list.length === 0) {
    return NextResponse.json({ campaigns: [] });
  }

  const campaignIds = list.map((c: { id: string }) => c.id);
  const templateIds = [...new Set(list.map((c: { template_id: string | null }) => c.template_id).filter(Boolean))] as string[];

  const [recCountsRes, templatesRes] = await Promise.all([
    supabase
      .from("whatsapp_campaign_recipients")
      .select("campaign_id, status")
      .in("campaign_id", campaignIds),
    templateIds.length > 0
      ? supabase.from("whatsapp_templates").select("id, name").in("id", templateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const recCounts = (recCountsRes.data ?? []) as Array<{ campaign_id: string; status: string }>;
  const templatesMap: Record<string, string> = {};
  for (const t of templatesRes.data ?? []) {
    templatesMap[t.id] = t.name;
  }

  const statsByCampaign: Record<string, { total: number; sent: number; delivered: number; read: number; failed: number; pending: number }> = {};
  for (const cid of campaignIds) {
    statsByCampaign[cid] = { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, pending: 0 };
  }
  for (const r of recCounts) {
    const s = statsByCampaign[r.campaign_id];
    if (s) {
      s.total++;
      if (r.status === "pending") s.pending++;
      else if (r.status === "sent") s.sent++;
      else if (r.status === "delivered") s.delivered++;
      else if (r.status === "read") s.read++;
      else if (r.status === "failed") s.failed++;
    }
  }

  const campaignsWithMeta = list.map((c: { id: string; template_id: string | null; [k: string]: unknown }) => ({
    ...c,
    template_name: c.template_id ? templatesMap[c.template_id] ?? null : null,
    recipient_count: statsByCampaign[c.id]?.total ?? 0,
    sent_count: (statsByCampaign[c.id]?.sent ?? 0) + (statsByCampaign[c.id]?.delivered ?? 0) + (statsByCampaign[c.id]?.read ?? 0),
    delivered_count: (statsByCampaign[c.id]?.delivered ?? 0) + (statsByCampaign[c.id]?.read ?? 0),
    failed_count: statsByCampaign[c.id]?.failed ?? 0,
    pending_count: statsByCampaign[c.id]?.pending ?? 0,
  }));

  return NextResponse.json({ campaigns: campaignsWithMeta });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body?.name?.trim();
  const description = body?.description?.trim() ?? null;
  const template_id = body?.template_id?.trim() ?? null;
  const contact_ids = Array.isArray(body?.contact_ids) ? body.contact_ids.filter((id: unknown) => typeof id === "string") : [];
  const segment_id = body?.segment_id?.trim() ?? null;
  const send_now = body?.send_now === true;
  const save_as_draft = body?.save_as_draft === true;
  const scheduled_at = body?.scheduled_at?.trim() ?? null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let contactIdList: string[] = contact_ids;
  if (segment_id && contact_ids.length === 0) {
    const { data: segment } = await supabase
      .from("contact_segments")
      .select("filter_json")
      .eq("project_id", projectId)
      .eq("id", segment_id)
      .single();
    if (segment?.filter_json && typeof segment.filter_json === "object") {
      const filter = segment.filter_json as { tags?: string[] };
      if (filter.tags?.length) {
        const { data: contactsInSegment } = await supabase
          .from("whatsapp_contacts")
          .select("id")
          .eq("project_id", projectId)
          .contains("tags", filter.tags);
        contactIdList = (contactsInSegment ?? []).map((c: { id: string }) => c.id);
      }
    }
  }
  const isDraft = save_as_draft || (!send_now && !scheduled_at);
  if (contactIdList.length === 0 && !isDraft) {
    return NextResponse.json({ error: "At least one contact or a segment with contacts is required" }, { status: 400 });
  }

  const status = send_now ? "sending" : save_as_draft || !scheduled_at ? "draft" : "scheduled";
  const { data: campaign, error: campaignError } = await supabase
    .from("whatsapp_campaigns")
    .insert({
      project_id: projectId,
      name,
      description,
      template_id: template_id || null,
      status,
      scheduled_at: scheduled_at || null,
    })
    .select("id, project_id, name, description, template_id, status, scheduled_at, created_at, updated_at")
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: campaignError?.message ?? "Failed to create campaign" }, { status: 500 });
  }

  if (contactIdList.length > 0) {
    const recipients = contactIdList.map((contact_id: string) => ({
      campaign_id: campaign.id,
      contact_id,
      status: "pending",
    }));

    const { error: recipientsError } = await supabase
      .from("whatsapp_campaign_recipients")
      .insert(recipients);

    if (recipientsError) {
      await supabase.from("whatsapp_campaigns").delete().eq("id", campaign.id);
      return NextResponse.json({ error: recipientsError.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      campaign: {
        ...campaign,
        recipient_count: contactIdList.length,
      },
    },
    { status: 201 }
  );
}

