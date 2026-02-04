import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { getWhatsAppAccountToken, isWithin24hWindow, markMessageAsRead, sendTemplateMessage, sendTextMessage } from "@/lib/whatsapp/api";

export async function GET(
  request: Request,
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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 200);

  const { data: contact } = await supabase
    .from("whatsapp_contacts")
    .select("id, phone, name, last_inbound_at, profile_picture_url")
    .eq("project_id", projectId)
    .eq("id", contactId)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from("whatsapp_messages")
    .select("id, contact_id, direction, type, body, media_url, meta_message_id, status, created_at")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .range(0, limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const within24h = isWithin24hWindow(contact.last_inbound_at);

  const list = messages ?? [];
  const lastInbound = [...list].reverse().find((m: { direction: string }) => m.direction === "in");
  const last_inbound_meta_message_id =
    lastInbound && "meta_message_id" in lastInbound ? (lastInbound as { meta_message_id: string | null }).meta_message_id : null;

  await supabase
    .from("whatsapp_conversations")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("contact_id", contactId);

  return NextResponse.json({
    contact: {
      id: contact.id,
      phone: contact.phone,
      name: contact.name,
      last_inbound_at: contact.last_inbound_at,
      within_24h_window: within24h,
      profile_picture_url: contact.profile_picture_url ?? undefined,
    },
    messages: list,
    last_inbound_meta_message_id: last_inbound_meta_message_id ?? undefined,
  });
}

export async function POST(
  request: Request,
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
  if (!role || (role !== "owner" && role !== "admin" && role !== "editor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const text = body?.text?.trim();
  const template_name = body?.template_name?.trim();
  const template_language = body?.template_language?.trim() ?? "en";

  const { data: contact } = await supabase
    .from("whatsapp_contacts")
    .select("id, phone, last_inbound_at")
    .eq("project_id", projectId)
    .eq("id", contactId)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const within24h = isWithin24hWindow(contact.last_inbound_at);

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
  }

  if (template_name) {
    const result = await sendTemplateMessage(
      creds.access_token,
      creds.phone_number_id,
      contact.phone,
      template_name,
      template_language
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
    const { data: msg, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        project_id: projectId,
        contact_id: contactId,
        direction: "out",
        type: "text",
        body: null,
        meta_message_id: result.message_id,
        status: "sent",
      })
      .select("id, direction, type, body, status, created_at")
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", projectId)
      .eq("contact_id", contactId);
    return NextResponse.json({ message: msg });
  }

  if (within24h && text) {
    const result = await sendTextMessage(
      creds.access_token,
      creds.phone_number_id,
      contact.phone,
      text
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }
    const messageId = result.message_id;
    const { data: msg, error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        project_id: projectId,
        contact_id: contactId,
        direction: "out",
        type: "text",
        body: text,
        meta_message_id: messageId,
        status: "sent",
      })
      .select("id, direction, type, body, status, created_at")
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", projectId)
      .eq("contact_id", contactId);
    return NextResponse.json({ message: msg });
  }

  if (!within24h) {
    return NextResponse.json(
      { error: "Outside 24h window. Send a template message only.", within_24h: false },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "Message text or template_name required" }, { status: 400 });
}
