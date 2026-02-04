import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

/**
 * GET ?tag_ids=id1,id2
 * Returns the number of unique contacts that have any of the given tags.
 * Used to show "X contacts will receive" when selecting tags in campaign wizard.
 */
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
  const tagIdsParam = searchParams.get("tag_ids")?.trim();
  const tagIds = tagIdsParam
    ? tagIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  if (tagIds.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const { data: links } = await supabase
    .from("whatsapp_contact_tags")
    .select("contact_id")
    .in("tag_id", tagIds);

  const uniqueContactIds = new Set((links ?? []).map((r: { contact_id: string }) => r.contact_id));
  return NextResponse.json({ count: uniqueContactIds.size });
}
