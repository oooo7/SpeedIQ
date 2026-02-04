import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

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
  const search = searchParams.get("search")?.trim() ?? "";
  const tag = searchParams.get("tag")?.trim();
  const source = searchParams.get("source")?.trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  let query = supabase
    .from("whatsapp_contacts")
    .select("id, project_id, phone, name, email, custom_fields, tags, source, last_inbound_at, created_at, updated_at", { count: "exact" })
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (search) {
    const term = `%${search}%`;
    query = query.or(`phone.ilike.${term},name.ilike.${term},email.ilike.${term}`);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }
  if (source) {
    query = query.eq("source", source);
  }

  const { data: contacts, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    contacts: contacts ?? [],
    total: count ?? 0,
  });
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
  const phone = body?.phone?.trim();
  const name = body?.name?.trim() ?? null;
  const email = body?.email?.trim() ?? null;
  const custom_fields = body?.custom_fields && typeof body.custom_fields === "object" ? body.custom_fields : {};
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean) : [];
  const source = body?.source?.trim() ?? "manual";

  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const { data: contact, error } = await supabase
    .from("whatsapp_contacts")
    .insert({
      project_id: projectId,
      phone,
      name,
      email,
      custom_fields,
      tags,
      source,
    })
    .select("id, project_id, phone, name, email, custom_fields, tags, source, last_inbound_at, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A contact with this phone number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contact }, { status: 201 });
}
