import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  filterOptedInContacts,
  getContactIdsForTags,
} from "@/lib/whatsapp/audience";

// A 30k bulk insert risks the Vercel function timeout because Supabase
// evaluates RLS per row at insert time. Chunked inserts keep each request
// under a few seconds.
const RECIPIENT_INSERT_CHUNK = 1000;

export const maxDuration = 60;

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
    .select("id, project_id, name, description, template_id, use_hello_world, status, scheduled_at, started_at, completed_at, created_at, updated_at")
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
      ? supabase.from("whatsapp_templates").select("id, name, status").in("id", templateIds)
      : Promise.resolve({ data: [] }),
  ]);

  const recCounts = (recCountsRes.data ?? []) as Array<{ campaign_id: string; status: string }>;
  const templatesMap: Record<string, { name: string; status: string }> = {};
  for (const t of templatesRes.data ?? []) {
    templatesMap[t.id] = { name: t.name, status: t.status ?? "draft" };
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

  const campaignsWithMeta = list.map((c: { id: string; template_id: string | null; [k: string]: unknown }) => {
    const templateMeta = c.template_id ? templatesMap[c.template_id] : null;
    return {
      ...c,
      template_name: templateMeta?.name ?? null,
      template_status: templateMeta?.status ?? null,
    recipient_count: statsByCampaign[c.id]?.total ?? 0,
    sent_count: (statsByCampaign[c.id]?.sent ?? 0) + (statsByCampaign[c.id]?.delivered ?? 0) + (statsByCampaign[c.id]?.read ?? 0),
    delivered_count: (statsByCampaign[c.id]?.delivered ?? 0) + (statsByCampaign[c.id]?.read ?? 0),
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
  const use_hello_world = !!body?.use_hello_world;
  const contact_ids = Array.isArray(body?.contact_ids) ? body.contact_ids.filter((id: unknown) => typeof id === "string") : [];
  const tag_ids = Array.isArray(body?.tag_ids) ? body.tag_ids.filter((id: unknown) => typeof id === "string").map((id: string) => id.trim()).filter(Boolean) : [];
  const send_now = body?.send_now === true;
  const save_as_draft = body?.save_as_draft === true;
  const scheduled_at = body?.scheduled_at?.trim() ?? null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Dedupe up front so a duplicate id in the request body doesn't break a
  // recipient chunk insert (unique constraint on campaign_id,contact_id).
  let contactIdList: string[] = [...new Set<string>(contact_ids)];
  if (contactIdList.length === 0 && tag_ids.length > 0) {
    try {
      contactIdList = await getContactIdsForTags(supabase, tag_ids);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to resolve tag audience" },
        { status: 500 }
      );
    }
  }

  const { data: settingsRow } = await supabase
    .from("whatsapp_account_settings")
    .select("respect_opt_out_for_campaigns")
    .eq("project_id", projectId)
    .maybeSingle();
  // Default to "respect opt-out" when no row exists — match the cron's
  // default so we don't insert recipients the cron will later skip.
  const respectOptOut = settingsRow?.respect_opt_out_for_campaigns !== false;
  if (respectOptOut && contactIdList.length > 0) {
    try {
      contactIdList = await filterOptedInContacts(supabase, projectId, contactIdList);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to filter opted-out contacts" },
        { status: 500 }
      );
    }
  }

  const isDraft = save_as_draft || (!send_now && !scheduled_at);
  if (contactIdList.length === 0 && !isDraft) {
    return NextResponse.json({ error: "Select at least one contact or one or more tags so the campaign has recipients." }, { status: 400 });
  }

  if (!isDraft && !use_hello_world && template_id) {
    const { data: templateRow } = await supabase
      .from("whatsapp_templates")
      .select("status")
      .eq("project_id", projectId)
      .eq("id", template_id)
      .single();
    if (templateRow?.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved templates can be used for sending or scheduling. Submit your draft template for approval first." },
        { status: 400 }
      );
    }
  }

  const status = send_now ? "sending" : save_as_draft || !scheduled_at ? "draft" : "scheduled";
  const { data: campaign, error: campaignError } = await supabase
    .from("whatsapp_campaigns")
    .insert({
      project_id: projectId,
      name,
      description,
      template_id: use_hello_world ? null : (template_id || null),
      use_hello_world,
      status,
      scheduled_at: scheduled_at || null,
    })
    .select("id, project_id, name, description, template_id, use_hello_world, status, scheduled_at, created_at, updated_at")
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: campaignError?.message ?? "Failed to create campaign" }, { status: 500 });
  }

  if (contactIdList.length > 0) {
    // Chunk to avoid timing out on large audiences. RLS evaluates per row, so
    // a single 30k insert can exceed the function timeout even though
    // postgres can handle the bulk write itself just fine.
    for (let offset = 0; offset < contactIdList.length; offset += RECIPIENT_INSERT_CHUNK) {
      const chunk = contactIdList.slice(offset, offset + RECIPIENT_INSERT_CHUNK);
      const recipients = chunk.map((contact_id: string) => ({
        campaign_id: campaign.id,
        contact_id,
        status: "pending",
      }));

      const { error: recipientsError } = await supabase
        .from("whatsapp_campaign_recipients")
        .insert(recipients);

      if (recipientsError) {
        // Cleanup: drop the half-built campaign + any recipients we managed to
        // insert (FK cascade handles the recipients).
        await supabase.from("whatsapp_campaigns").delete().eq("id", campaign.id);
        return NextResponse.json(
          {
            error: `Recipient insert failed at row ${offset + 1}/${contactIdList.length}: ${recipientsError.message}`,
          },
          { status: 500 }
        );
      }
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

