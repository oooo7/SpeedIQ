import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

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
  const status = searchParams.get("status")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  let query = supabase
    .from("email_subscribers")
    .select("id, project_id, email, name, tags, source, status, subscribed_at, unsubscribed_at, created_at, updated_at", { count: "exact" })
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (search) {
    const term = `%${search}%`;
    query = query.or(`email.ilike.${term},name.ilike.${term}`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data: subscribers, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    subscribers: subscribers ?? [],
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
  const email = (body?.email ?? "").trim().toLowerCase();
  const name = body?.name?.trim() ?? null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean) : [];
  const source = body?.source?.trim() ?? "manual";

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const subscribedAt = new Date().toISOString();
  const { data: subscriber, error } = await supabase
    .from("email_subscribers")
    .insert({
      project_id: projectId,
      email,
      name,
      tags,
      source,
      status: "subscribed",
      subscribed_at: subscribedAt,
    })
    .select("id, project_id, email, name, tags, source, status, subscribed_at, unsubscribed_at, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A subscriber with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscriber }, { status: 201 });
}
