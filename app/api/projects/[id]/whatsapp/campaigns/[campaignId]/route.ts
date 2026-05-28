import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  filterOptedInContacts,
  getContactIdsForTags,
} from "@/lib/whatsapp/audience";

// PostgREST default response cap. Recipients query needs to page past 1000.
const RECIPIENT_PAGE = 1000;
// `.in("id", [N uuids])` becomes a URL parameter — Supabase's PostgREST
// gateway rejects URLs much past ~8KB. 500 UUIDs ≈ 18KB and silently returned
// nothing for 16k-recipient campaigns, which is why the table showed "—" for
// every phone/name. 150 UUIDs ≈ 5.5KB sits comfortably under the limit.
const CONTACT_FETCH_CHUNK = 150;

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
    .from("whatsapp_campaigns")
    .select("id, project_id, name, description, template_id, use_hello_world, status, scheduled_at, started_at, completed_at, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (error || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Page through recipients — at 30k campaigns we'd otherwise silently get
  // only the first 1000 (PostgREST default response cap).
  const recList: Array<{
    id: string;
    contact_id: string;
    status: string;
    sent_at: string | null;
    error_code: string | null;
    retry_count: number | null;
    created_at: string;
    meta_message_id?: string | null;
  }> = [];
  {
    let from = 0;
    while (true) {
      const { data, error: recError } = await supabase
        .from("whatsapp_campaign_recipients")
        .select("id, contact_id, status, sent_at, error_code, retry_count, created_at")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + RECIPIENT_PAGE - 1);
      if (recError) {
        return NextResponse.json({ error: recError.message }, { status: 500 });
      }
      const rows = (data ?? []) as typeof recList;
      if (rows.length === 0) break;
      recList.push(...rows);
      if (rows.length < RECIPIENT_PAGE) break;
      from += RECIPIENT_PAGE;
    }
  }

  const contactIds = [...new Set(recList.map((r) => r.contact_id))];
  const contactsMap: Record<string, { phone: string; name: string | null }> = {};
  if (contactIds.length > 0) {
    // Use admin client: bypasses RLS (the role check above already gated
    // access) and avoids per-row policy evaluation on 16k-contact campaigns,
    // which was returning empty results on some user-client requests.
    const admin = createAdminClient();
    // Chunk the IN filter — see CONTACT_FETCH_CHUNK comment above.
    for (let i = 0; i < contactIds.length; i += CONTACT_FETCH_CHUNK) {
      const chunk = contactIds.slice(i, i + CONTACT_FETCH_CHUNK);
      const { data: contacts, error: contactsError } = await admin
        .from("whatsapp_contacts")
        .select("id, phone, name")
        .in("id", chunk);
      if (contactsError) {
        // Log loudly — silent failure here was the cause of "all rows show —".
        console.error(
          `[campaigns/${campaignId}] contact lookup chunk ${i / CONTACT_FETCH_CHUNK + 1} failed:`,
          contactsError
        );
        continue;
      }
      for (const c of (contacts ?? []) as Array<{ id: string; phone: string; name: string | null }>) {
        contactsMap[c.id] = { phone: c.phone, name: c.name };
      }
    }
  }

  let templateDetails: { id: string; name: string; body: string | null; status: string; language: string; category: string } | null = null;
  if (campaign.use_hello_world) {
    templateDetails = {
      id: "",
      name: "hello_world",
      body: "Hello World",
      status: "approved",
      language: "en_US",
      category: "utility",
    };
  } else if (campaign.template_id) {
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("id, name, body, status, language, category")
      .eq("id", campaign.template_id)
      .single();
    templateDetails = template ?? null;
  }

  const stats = {
    total: recList.length,
    pending: recList.filter((r: { status: string }) => r.status === "pending").length,
    sent: recList.filter((r: { status: string }) => r.status === "sent").length,
    delivered: recList.filter((r: { status: string }) => r.status === "delivered").length,
    read: recList.filter((r: { status: string }) => r.status === "read").length,
    failed: recList.filter((r: { status: string }) => r.status === "failed").length,
  };

  const recipientsWithContact = recList.map((r: { contact_id: string; [k: string]: unknown }) => ({
    ...r,
    phone: contactsMap[r.contact_id]?.phone ?? null,
    contact_name: contactsMap[r.contact_id]?.name ?? null,
  }));

  return NextResponse.json({
    campaign,
    template: templateDetails,
    recipients: recipientsWithContact,
    stats,
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

  const body = await request.json().catch(() => ({}));
  const tagIds = Array.isArray(body.tag_ids)
    ? (body.tag_ids as unknown[]).filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean)
    : undefined;
  const contactIds = Array.isArray(body.contact_ids)
    ? (body.contact_ids as unknown[]).filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean)
    : undefined;

  const { data: existingCampaign } = await supabase
    .from("whatsapp_campaigns")
    .select("status")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  // Only touch recipients when the client explicitly says the picker was
  // changed. The legacy "any tag_ids/contact_ids present in body" trigger
  // caused every save of the edit modal to wipe + reinsert recipients
  // (resetting sent/delivered/read rows back to pending), which is how the
  // same contact got the template re-sent on every restart.
  const recipientsTouched = body.recipients_touched === true;
  const wantsRecipientUpdate = recipientsTouched && (tagIds !== undefined || contactIds !== undefined);
  if (wantsRecipientUpdate && existingCampaign) {
    const allowed = ["draft", "scheduled", "failed"].includes(existingCampaign.status);
    if (!allowed) {
      return NextResponse.json(
        { error: "Only draft, scheduled, or failed campaigns can update recipients." },
        { status: 400 }
      );
    }

    // Resolve the new desired contact set from tag_ids + contact_ids.
    const contactIdSet = new Set<string>();
    if (tagIds && tagIds.length > 0) {
      try {
        for (const id of await getContactIdsForTags(supabase, tagIds)) {
          contactIdSet.add(id);
        }
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to resolve tag audience" },
          { status: 500 }
        );
      }
    }
    if (contactIds && contactIds.length > 0) {
      for (const id of contactIds) contactIdSet.add(id);
    }
    let desiredContactIds = [...contactIdSet];
    const { data: settingsRow } = await supabase
      .from("whatsapp_account_settings")
      .select("respect_opt_out_for_campaigns")
      .eq("project_id", projectId)
      .maybeSingle();
    const respectOptOut = settingsRow?.respect_opt_out_for_campaigns !== false;
    if (respectOptOut && desiredContactIds.length > 0) {
      try {
        desiredContactIds = await filterOptedInContacts(supabase, projectId, desiredContactIds);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Failed to filter opted-out contacts" },
          { status: 500 }
        );
      }
    }

    // Diff against existing recipients instead of DELETE+INSERT. Existing
    // rows that survive the diff keep their status (sent/delivered/read/
    // failed) so a recipient that already received the template doesn't get
    // it again on the next cron tick.
    const desiredSet = new Set(desiredContactIds);
    const { data: existingRecipientsRows, error: existingErr } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("contact_id")
      .eq("campaign_id", campaignId);
    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }
    const existingContactIds = new Set<string>(
      (existingRecipientsRows ?? []).map((r) => r.contact_id as string)
    );

    const toRemove = [...existingContactIds].filter((id) => !desiredSet.has(id));
    const toAdd = desiredContactIds.filter((id) => !existingContactIds.has(id));

    if (toRemove.length > 0) {
      const DELETE_CHUNK = 1000;
      for (let i = 0; i < toRemove.length; i += DELETE_CHUNK) {
        const chunk = toRemove.slice(i, i + DELETE_CHUNK);
        const { error: delErr } = await supabase
          .from("whatsapp_campaign_recipients")
          .delete()
          .eq("campaign_id", campaignId)
          .in("contact_id", chunk);
        if (delErr) {
          return NextResponse.json({ error: delErr.message }, { status: 500 });
        }
      }
    }

    if (toAdd.length > 0) {
      const INSERT_CHUNK = 1000;
      for (let i = 0; i < toAdd.length; i += INSERT_CHUNK) {
        const chunk = toAdd.slice(i, i + INSERT_CHUNK);
        const recipients = chunk.map((contact_id: string) => ({
          campaign_id: campaignId,
          contact_id,
          status: "pending",
        }));
        const { error: insErr } = await supabase
          .from("whatsapp_campaign_recipients")
          .insert(recipients);
        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
      }
    }
  }

  const newStatus = body.status !== undefined ? body.status?.trim() : undefined;
  if (newStatus === "sending" || newStatus === "scheduled") {
    const { data: existing } = await supabase
      .from("whatsapp_campaigns")
      .select("template_id, use_hello_world")
      .eq("project_id", projectId)
      .eq("id", campaignId)
      .single();
    const effectiveUseHelloWorld =
      body.use_hello_world !== undefined ? !!body.use_hello_world : !!existing?.use_hello_world;
    const effectiveTemplateId =
      body.template_id !== undefined ? (body.template_id?.trim() || null) : existing?.template_id ?? null;
    if (!effectiveUseHelloWorld && !effectiveTemplateId) {
      return NextResponse.json(
        { error: "Add a template or enable the default hello_world template before sending or scheduling." },
        { status: 400 }
      );
    }
    if (!effectiveUseHelloWorld && effectiveTemplateId) {
      const { data: templateRow } = await supabase
        .from("whatsapp_templates")
        .select("status")
        .eq("project_id", projectId)
        .eq("id", effectiveTemplateId)
        .single();
      if (templateRow?.status !== "approved") {
        return NextResponse.json(
          { error: "Only approved templates can be used for sending or scheduling. Get your template approved first." },
          { status: 400 }
        );
      }
    }
    const { count: recipientCount } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);
    if (!recipientCount || recipientCount === 0) {
      return NextResponse.json(
        { error: "Add at least one recipient before sending or scheduling this campaign." },
        { status: 400 }
      );
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name?.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() ?? null;
  if (body.status !== undefined) updates.status = body.status?.trim();
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at?.trim() ?? null;
  if (body.template_id !== undefined) updates.template_id = body.template_id?.trim() ?? null;
  if (body.use_hello_world !== undefined) updates.use_hello_world = !!body.use_hello_world;
  // Set started_at when transitioning to "sending" so detail page shows correct timing
  // and the stuck-detection banner can age from a real timestamp.
  if (newStatus === "sending") updates.started_at = new Date().toISOString();

  const { data: campaign, error } = await supabase
    .from("whatsapp_campaigns")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .select("id, project_id, name, description, template_id, use_hello_world, status, scheduled_at, started_at, completed_at, created_at, updated_at")
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
    .from("whatsapp_campaigns")
    .delete()
    .eq("project_id", projectId)
    .eq("id", campaignId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
