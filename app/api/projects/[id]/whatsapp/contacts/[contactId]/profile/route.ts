import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { isWithin24hWindow } from "@/lib/whatsapp/api";

/**
 * GET contact profile for Chat Profile sidebar: status, campaigns, tags, customer journey.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, contactId } = await params;
  if (!projectId || !contactId) {
    return NextResponse.json({ error: "Project ID and contact ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: contact, error: contactError } = await supabase
    .from("whatsapp_contacts")
    .select("id, phone, name, email, source, last_inbound_at, created_at, updated_at, opt_out, profile_picture_url, custom_fields")
    .eq("project_id", projectId)
    .eq("id", contactId)
    .single();

  if (contactError || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const within24h = isWithin24hWindow(contact.last_inbound_at);

  const [messagesRes, campaignRecipientsRes, tagsRes] = await Promise.all([
    supabase
      .from("whatsapp_messages")
      .select("id, direction, type, created_at")
      .eq("project_id", projectId)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true }),
    supabase
      .from("whatsapp_campaign_recipients")
      .select("id, campaign_id, status, sent_at")
      .eq("contact_id", contactId)
      .in("status", ["sent", "delivered", "read"]),
    supabase
      .from("whatsapp_contact_tags")
      .select("tag_id")
      .eq("contact_id", contactId),
  ]);

  const messages = messagesRes.data ?? [];
  const campaignRecipients = campaignRecipientsRes.data ?? [];
  const tagLinks = tagsRes.data ?? [];

  const templateMessageCount = campaignRecipients.length;
  const sessionMessageCount = messages.filter(
    (m: { direction: string; type: string }) => m.direction === "out" && m.type === "text"
  ).length;

  const campaignIds = [...new Set(campaignRecipients.map((r: { campaign_id: string }) => r.campaign_id))];
  let campaignsList: Array<{ id: string; name: string; sent_at: string | null }> = [];
  if (campaignIds.length > 0) {
    const { data: campaigns } = await supabase
      .from("whatsapp_campaigns")
      .select("id, name")
      .in("id", campaignIds);
    const campaignMap: Record<string, { name: string }> = {};
    for (const c of campaigns ?? []) {
      campaignMap[c.id] = { name: c.name };
    }
    const sentAtByCampaign: Record<string, string> = {};
    for (const r of campaignRecipients) {
      const rec = r as { campaign_id: string; sent_at: string | null };
      if (rec.sent_at && (!sentAtByCampaign[rec.campaign_id] || rec.sent_at > sentAtByCampaign[rec.campaign_id])) {
        sentAtByCampaign[rec.campaign_id] = rec.sent_at;
      }
    }
    campaignsList = campaignIds.map((id) => ({
      id,
      name: campaignMap[id]?.name ?? "Unknown",
      sent_at: sentAtByCampaign[id] ?? null,
    }));
  }

  let tags: Array<{ id: string; name: string; color: string | null }> = [];
  if (tagLinks.length > 0) {
    const tagIds = tagLinks.map((r: { tag_id: string }) => r.tag_id);
    const { data: defs } = await supabase
      .from("whatsapp_tag_definitions")
      .select("id, name, color")
      .eq("project_id", projectId)
      .in("id", tagIds);
    tags = (defs ?? []).map((d: { id: string; name: string; color: string | null }) => ({
      id: d.id,
      name: d.name,
      color: d.color ?? null,
    }));
  }

  type JourneyEvent = { type: string; label: string; at: string; campaign_id?: string };
  const journey: JourneyEvent[] = [];
  journey.push({
    type: "created",
    label: "User created",
    at: contact.created_at,
  });
  for (const r of campaignRecipients) {
    const rec = r as { campaign_id: string; sent_at: string | null };
    if (rec.sent_at) {
      const camp = campaignsList.find((c) => c.id === rec.campaign_id);
      journey.push({
        type: "campaign_sent",
        label: `${camp?.name ?? "Campaign"} sent to user`,
        at: rec.sent_at,
        campaign_id: rec.campaign_id,
      });
    }
  }
  journey.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return NextResponse.json({
    contact: {
      id: contact.id,
      phone: contact.phone,
      name: contact.name,
      email: contact.email,
      source: contact.source,
      last_inbound_at: contact.last_inbound_at,
      created_at: contact.created_at,
      opt_out: contact.opt_out ?? false,
      profile_picture_url: contact.profile_picture_url ?? null,
      custom_fields: contact.custom_fields ?? {},
    },
    status: {
      active: within24h,
      last_active: contact.last_inbound_at ?? (contact as { updated_at?: string }).updated_at ?? contact.created_at,
      template_messages: templateMessageCount,
      session_messages: sessionMessageCount,
      unresolved_queries: 0,
      wa_conversation_active: within24h,
      incoming_allowed: true,
      opted_in: !(contact.opt_out ?? false),
    },
    campaigns: campaignsList,
    tags,
    journey,
  });
}
