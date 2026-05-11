import { NextResponse } from "next/server";

import { requireProjectAccess } from "@/lib/sms/access";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id: projectId, contactId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  const body = await request.json().catch(() => ({}));

  const { data, error } = await access.supabase
    .from("sms_conversations")
    .update({
      is_archived: body?.is_archived === true,
      is_deleted: body?.is_deleted === true,
      unread_count: body?.mark_read ? 0 : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation: data });
}
