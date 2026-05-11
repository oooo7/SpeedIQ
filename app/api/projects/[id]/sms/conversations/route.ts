import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  let query = access.supabase
    .from("sms_conversations")
    .select("id, project_id, contact_id, assigned_to, last_message_at, unread_count, is_archived, is_deleted, updated_at, sms_contacts(id,phone,name,email,opt_out)")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (filter === "unread") query = query.gt("unread_count", 0);
  if (filter === "archived") query = query.eq("is_archived", true);
  if (filter === "all") query = query.eq("is_archived", false);

  const { data, error } = await query.limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}
