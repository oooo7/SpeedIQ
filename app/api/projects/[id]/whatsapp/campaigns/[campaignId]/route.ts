import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

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

  const { data: recipients, error: recError } = await supabase
    .from("whatsapp_campaign_recipients")
    .select("id, contact_id, status, sent_at, error_code, retry_count, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });

  if (recError) {
    return NextResponse.json({ error: recError.message }, { status: 500 });
  }

  const recList = recipients ?? [];
  const contactIds = [...new Set(recList.map((r: { contact_id: string }) => r.contact_id))];
  let contactsMap: Record<string, { phone: string; name: string | null }> = {};
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from("whatsapp_contacts")
      .select("id, phone, name")
      .in("id", contactIds);
    for (const c of contacts ?? []) {
      contactsMap[c.id] = { phone: c.phone, name: c.name };
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

  const wantsRecipientUpdate = tagIds !== undefined || contactIds !== undefined;
  if (wantsRecipientUpdate && existingCampaign) {
    const allowed = ["draft", "scheduled", "failed"].includes(existingCampaign.status);
    if (!allowed) {
      return NextResponse.json(
        { error: "Only draft, scheduled, or failed campaigns can update recipients." },
        { status: 400 }
      );
    }
    const { error: delErr } = await supabase
      .from("whatsapp_campaign_recipients")
      .delete()
      .eq("campaign_id", campaignId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    const contactIdSet = new Set<string>();
    if (tagIds && tagIds.length > 0) {
      const { data: links } = await supabase
        .from("whatsapp_contact_tags")
        .select("contact_id")
        .in("tag_id", tagIds);
      for (const r of links ?? []) {
        contactIdSet.add((r as { contact_id: string }).contact_id);
      }
    }
    if (contactIds && contactIds.length > 0) {
      for (const id of contactIds) contactIdSet.add(id);
    }
    let contactIdList = [...contactIdSet];
    const { data: settingsRow } = await supabase
      .from("whatsapp_account_settings")
      .select("respect_opt_out_for_campaigns")
      .eq("project_id", projectId)
      .maybeSingle();
    if (settingsRow?.respect_opt_out_for_campaigns && contactIdList.length > 0) {
      const { data: allowed } = await supabase
        .from("whatsapp_contacts")
        .select("id")
        .eq("project_id", projectId)
        .in("id", contactIdList)
        .or("opt_out.eq.false,opt_out.is.null");
      contactIdList = (allowed ?? []).map((r: { id: string }) => r.id);
    }
    if (contactIdList.length > 0) {
      const recipients = contactIdList.map((contact_id: string) => ({
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
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name?.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() ?? null;
  if (body.status !== undefined) updates.status = body.status?.trim();
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at?.trim() ?? null;
  if (body.template_id !== undefined) updates.template_id = body.template_id?.trim() ?? null;
  if (body.use_hello_world !== undefined) updates.use_hello_world = !!body.use_hello_world;

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
