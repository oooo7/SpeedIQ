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
  const filter = searchParams.get("filter")?.trim() ?? "all";

  let query = supabase
    .from("whatsapp_conversations")
    .select("id, project_id, contact_id, assigned_to, last_message_at, unread_count, is_archived, is_deleted, created_at")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (filter === "archived") {
    query = query.eq("is_archived", true);
  } else {
    // "all" and "unread" exclude archived
    query = query.eq("is_archived", false);
    if (filter === "unread") {
      query = query.gt("unread_count", 0);
    }
    if (filter === "assigned" && user.id) {
      query = query.eq("assigned_to", user.id);
    }
  }

  const { data: conversations, error } = await query.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = conversations ?? [];
  const contactIds = [...new Set(list.map((c: { contact_id: string }) => c.contact_id))];
  const contactsMap: Record<string, { phone: string; name: string | null; profile_picture_url: string | null }> = {};
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from("whatsapp_contacts")
      .select("id, phone, name, profile_picture_url")
      .in("id", contactIds);
    for (const c of contacts ?? []) {
      contactsMap[c.id] = {
        phone: c.phone,
        name: c.name,
        profile_picture_url: c.profile_picture_url ?? null,
      };
    }
  }

  const enriched = list.map((c: { contact_id: string; [k: string]: unknown }) => ({
    ...c,
    contact_phone: contactsMap[c.contact_id]?.phone ?? null,
    contact_name: contactsMap[c.contact_id]?.name ?? null,
    contact_profile_picture_url: contactsMap[c.contact_id]?.profile_picture_url ?? null,
    is_archived: (c as { is_archived?: boolean }).is_archived ?? false,
    is_deleted: (c as { is_deleted?: boolean }).is_deleted ?? false,
  }));

  return NextResponse.json({ conversations: enriched });
}
