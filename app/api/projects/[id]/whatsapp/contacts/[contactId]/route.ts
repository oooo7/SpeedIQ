import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

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

  const { data: contact, error } = await supabase
    .from("whatsapp_contacts")
    .select("id, project_id, phone, name, email, custom_fields, tags, source, last_inbound_at, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ contact });
}

export async function PATCH(
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

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.phone !== undefined) updates.phone = body.phone?.trim();
  if (body.name !== undefined) updates.name = body.name?.trim() ?? null;
  if (body.email !== undefined) updates.email = body.email?.trim() ?? null;
  if (body.custom_fields !== undefined && typeof body.custom_fields === "object") updates.custom_fields = body.custom_fields;
  if (Array.isArray(body.tags)) updates.tags = body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean);
  if (body.source !== undefined) updates.source = body.source?.trim() ?? null;

  const { data: contact, error } = await supabase
    .from("whatsapp_contacts")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", contactId)
    .select("id, project_id, phone, name, email, custom_fields, tags, source, last_inbound_at, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A contact with this phone number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact });
}

export async function DELETE(
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

  const { error } = await supabase
    .from("whatsapp_contacts")
    .delete()
    .eq("project_id", projectId)
    .eq("id", contactId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
