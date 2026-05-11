import { NextResponse } from "next/server";

import { normalizeSmsPhone, isValidSmsPhone } from "@/lib/sms/phone";
import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: projectId, contactId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { data, error } = await access.supabase
    .from("sms_contacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", contactId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  return NextResponse.json({ contact: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: projectId, contactId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {
    name: body?.name?.trim() || null,
    email: body?.email?.trim() || null,
    source: body?.source?.trim() || null,
    custom_fields: body?.custom_fields && typeof body.custom_fields === "object" ? body.custom_fields : {},
  };
  if (typeof body?.opt_out === "boolean") patch.opt_out = body.opt_out;
  if (typeof body?.consent_status === "string") {
    patch.consent_status = body.consent_status;
    patch.consent_updated_at = new Date().toISOString();
  }
  if (typeof body?.phone === "string") {
    const phone = normalizeSmsPhone(body.phone);
    if (!isValidSmsPhone(phone)) return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    patch.phone = phone;
  }

  const { data, error } = await access.supabase
    .from("sms_contacts")
    .update(patch)
    .eq("project_id", projectId)
    .eq("id", contactId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: projectId, contactId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { error } = await access.supabase
    .from("sms_contacts")
    .delete()
    .eq("project_id", projectId)
    .eq("id", contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
