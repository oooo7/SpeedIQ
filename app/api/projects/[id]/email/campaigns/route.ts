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
    .from("email_campaigns")
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
      .from("email_campaign_recipients")
      .select("campaign_id, status")
      .in("campaign_id", campaignIds),
    templateIds.length > 0
      ? supabase.from("email_templates").select("id, name").in("id", templateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const recCounts = (recCountsRes.data ?? []) as Array<{ campaign_id: string; status: string }>;
  const templatesMap: Record<string, { name: string }> = {};
  for (const t of templatesRes.data ?? []) {
    templatesMap[t.id] = { name: t.name };
  }

  const statsByCampaign: Record<string, { total: number; sent: number; failed: number; pending: number }> = {};
  for (const cid of campaignIds) {
    statsByCampaign[cid] = { total: 0, sent: 0, failed: 0, pending: 0 };
  }
  for (const r of recCounts) {
    const s = statsByCampaign[r.campaign_id];
    if (s) {
      s.total++;
      if (r.status === "pending") s.pending++;
      else if (r.status === "sent" || r.status === "bounced") s.sent++;
      else if (r.status === "failed") s.failed++;
    }
  }

  const campaignsWithMeta = list.map((c: { id: string; template_id: string | null; [k: string]: unknown }) => {
    const templateMeta = c.template_id ? templatesMap[c.template_id] : null;
    return {
      ...c,
      template_name: templateMeta?.name ?? null,
      recipient_count: statsByCampaign[c.id]?.total ?? 0,
      sent_count: statsByCampaign[c.id]?.sent ?? 0,
      failed_count: statsByCampaign[c.id]?.failed ?? 0,
      pending_count: statsByCampaign[c.id]?.pending ?? 0,
    };
  });

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
  const subscriber_ids = Array.isArray(body?.subscriber_ids) ? body.subscriber_ids.filter((id: unknown) => typeof id === "string") : [];
  const send_now = body?.send_now === true;
  const save_as_draft = body?.save_as_draft === true;
  const scheduled_at = body?.scheduled_at?.trim() ?? null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (!template_id) {
    return NextResponse.json({ error: "template_id is required" }, { status: 400 });
  }

  const isDraft = save_as_draft || (!send_now && !scheduled_at);
  if (subscriber_ids.length === 0 && !isDraft) {
    return NextResponse.json({ error: "Select at least one subscriber for send or schedule." }, { status: 400 });
  }

  const { data: templateRow } = await supabase
    .from("email_templates")
    .select("id")
    .eq("project_id", projectId)
    .eq("id", template_id)
    .single();
  if (!templateRow) {
    return NextResponse.json({ error: "Template not found" }, { status: 400 });
  }

  const status = send_now ? "sending" : isDraft || !scheduled_at ? "draft" : "scheduled";
  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .insert({
      project_id: projectId,
      name,
      description,
      template_id,
      status,
      scheduled_at: scheduled_at || null,
    })
    .select("id, project_id, name, description, template_id, status, scheduled_at, created_at, updated_at")
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: campaignError?.message ?? "Failed to create campaign" }, { status: 500 });
  }

  if (subscriber_ids.length > 0) {
    const recipients = subscriber_ids.map((subscriber_id: string) => ({
      campaign_id: campaign.id,
      subscriber_id,
      status: "pending",
    }));

    const { error: recipientsError } = await supabase
      .from("email_campaign_recipients")
      .insert(recipients);

    if (recipientsError) {
      await supabase.from("email_campaigns").delete().eq("id", campaign.id);
      return NextResponse.json({ error: recipientsError.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      campaign: {
        ...campaign,
        recipient_count: subscriber_ids.length,
      },
    },
    { status: 201 }
  );
}
