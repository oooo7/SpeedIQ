import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { getProjectEmailSettingsForSend, getEffectiveFromAddress } from "@/lib/email/project-settings";

export async function GET(
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
    return NextResponse.json({ error: "Project ID and campaign ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: campaign, error } = await supabase
    .from("email_campaigns")
    .select("id, project_id, name, description, template_id, status, scheduled_at, started_at, completed_at, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: recipients, error: recError } = await supabase
    .from("email_campaign_recipients")
    .select("id, subscriber_id, status, sent_at, error_message, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (recError) {
    return NextResponse.json({ error: recError.message }, { status: 500 });
  }

  const recList = recipients ?? [];
  const subscriberIds = [...new Set(recList.map((r: { subscriber_id: string }) => r.subscriber_id))];
  let subscribersMap: Record<string, { email: string; name: string | null }> = {};
  if (subscriberIds.length > 0) {
    const { data: subscribers } = await supabase
      .from("email_subscribers")
      .select("id, email, name")
      .in("id", subscriberIds);
    for (const s of subscribers ?? []) {
      subscribersMap[s.id] = { email: s.email, name: s.name };
    }
  }

  let templateDetails: { id: string; name: string; subject: string; body_html: string | null } | null = null;
  if (campaign.template_id) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("id, name, subject, body_html")
      .eq("id", campaign.template_id)
      .single();
    templateDetails = template ?? null;
  }

  const stats = {
    total: recList.length,
    pending: recList.filter((r: { status: string }) => r.status === "pending").length,
    sent: recList.filter((r: { status: string }) => r.status === "sent" || r.status === "bounced").length,
    failed: recList.filter((r: { status: string }) => r.status === "failed").length,
  };

  const recipientsWithSubscriber = recList.map((r: { subscriber_id: string; [k: string]: unknown }) => ({
    ...r,
    email: subscribersMap[r.subscriber_id]?.email ?? null,
    subscriber_name: subscribersMap[r.subscriber_id]?.name ?? null,
  }));

  const settings = await getProjectEmailSettingsForSend(projectId);
  const effective_from = getEffectiveFromAddress(settings, projectId);

  return NextResponse.json({
    campaign,
    template: templateDetails,
    recipients: recipientsWithSubscriber,
    stats,
    effective_from,
  });
}

export async function PATCH(
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

  const { data: existing } = await supabase
    .from("email_campaigns")
    .select("status")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return NextResponse.json({ error: "Only draft or scheduled campaigns can be updated" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name?.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() ?? null;
  if (body.template_id !== undefined) updates.template_id = body.template_id?.trim() ?? null;
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at?.trim() ?? null;

  const { data: campaign, error } = await supabase
    .from("email_campaigns")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .select("id, project_id, name, description, template_id, status, scheduled_at, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign });
}

export async function DELETE(
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
    return NextResponse.json({ error: "Project ID and campaign ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("email_campaigns")
    .delete()
    .eq("project_id", projectId)
    .eq("id", campaignId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
