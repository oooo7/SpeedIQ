import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function GET(
  _request: Request,
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

  const { data: tags, error } = await supabase
    .from("whatsapp_tag_definitions")
    .select("id, project_id, name, color, created_at")
    .eq("project_id", projectId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = tags ?? [];
  const tagIds = list.map((t: { id: string }) => t.id);
  const contactCountByTagId: Record<string, number> = {};
  if (tagIds.length > 0) {
    // Per-tag COUNT queries in parallel. Previous code fetched every link row
    // and counted in JS, which silently truncated at PostgREST's 1000-row cap
    // (a tag with 16k contacts would show "1000 contacts").
    const results = await Promise.all(
      tagIds.map(async (id: string) => {
        const { count } = await supabase
          .from("whatsapp_contact_tags")
          .select("contact_id", { count: "exact", head: true })
          .eq("tag_id", id);
        return [id, count ?? 0] as const;
      })
    );
    for (const [id, count] of results) contactCountByTagId[id] = count;
  }

  const tagsWithCount = list.map((t: { id: string; [k: string]: unknown }) => ({
    ...t,
    contact_count: contactCountByTagId[t.id] ?? 0,
  }));

  return NextResponse.json({ tags: tagsWithCount });
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
  const color = body?.color?.trim() ?? null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: tag, error } = await supabase
    .from("whatsapp_tag_definitions")
    .insert({
      project_id: projectId,
      name,
      color,
    })
    .select("id, project_id, name, color, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Tag with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag }, { status: 201 });
}
