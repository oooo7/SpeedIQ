import { NextResponse } from "next/server";

import { normalizeSmsPhone, isValidSmsPhone } from "@/lib/sms/phone";
import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const optOut = searchParams.get("opt_out");

  let query = access.supabase
    .from("sms_contacts")
    .select("id, project_id, phone, name, email, custom_fields, source, opt_out, consent_status, consent_updated_at, last_inbound_at, created_at, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  if (optOut === "true") query = query.eq("opt_out", true);
  if (optOut === "false") query = query.eq("opt_out", false);

  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const body = await request.json().catch(() => ({}));
  const phone = normalizeSmsPhone(body?.phone ?? "");
  if (!isValidSmsPhone(phone)) {
    return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
  }

  const { data, error } = await access.supabase
    .from("sms_contacts")
    .upsert(
      {
        project_id: projectId,
        phone,
        name: body?.name?.trim() || null,
        email: body?.email?.trim() || null,
        source: body?.source?.trim() || "manual",
        custom_fields: body?.custom_fields && typeof body.custom_fields === "object" ? body.custom_fields : {},
        opt_out: body?.opt_out === true,
        consent_status: body?.consent_status?.trim() || "unknown",
        consent_updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,phone" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contact: data }, { status: 201 });
}
