import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendSmsForProject } from "@/lib/sms/client";
import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: projectId, contactId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { data, error } = await access.supabase
    .from("sms_messages")
    .select("id, direction, from_number, to_number, body, num_segments, num_media, status, twilio_message_sid, created_at")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await access.supabase
    .from("sms_conversations")
    .update({ unread_count: 0, updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("contact_id", contactId);

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: projectId, contactId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  if (!["owner", "admin", "editor"].includes(access.role || "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const messageBody = body?.body?.trim();
  if (!messageBody) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: contact } = await supabase
    .from("sms_contacts")
    .select("id,phone,opt_out")
    .eq("project_id", projectId)
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  if (contact.opt_out) return NextResponse.json({ error: "Contact has opted out" }, { status: 400 });

  const result = await sendSmsForProject(supabase, projectId, {
    to: contact.phone,
    body: messageBody,
  });
  if (!result.success) return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sms_messages")
    .insert({
      project_id: projectId,
      contact_id: contactId,
      direction: "out",
      to_number: contact.phone,
      body: messageBody,
      twilio_message_sid: result.sid,
      status: result.status ?? "sent",
      created_at: now,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("sms_conversations").upsert(
    {
      project_id: projectId,
      contact_id: contactId,
      last_message_at: now,
      updated_at: now,
    },
    { onConflict: "project_id,contact_id", ignoreDuplicates: false }
  );

  return NextResponse.json({ message: data }, { status: 201 });
}
