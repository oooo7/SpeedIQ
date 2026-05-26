import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  filterOptedInContacts,
  getContactIdsForTags,
} from "@/lib/whatsapp/audience";

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
  const contactIdsParam = searchParams.get("contact_ids")?.trim();
  const tagIds = tagIdsParam
    ? tagIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : [];
  const contactIdsFromParam = contactIdsParam
    ? contactIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  const uniqueContactIds = new Set<string>();
  if (tagIds.length > 0) {
    try {
      for (const id of await getContactIdsForTags(supabase, tagIds)) {
        uniqueContactIds.add(id);
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to resolve tag audience" },
        { status: 500 }
      );
    }
  }
  if (contactIdsFromParam.length > 0) {
    for (const id of contactIdsFromParam) uniqueContactIds.add(id);
  }

  if (uniqueContactIds.size === 0) {
    return NextResponse.json({ count: 0 });
  }

  const { data: settingsRow } = await supabase
    .from("whatsapp_account_settings")
    .select("respect_opt_out_for_campaigns")
    .eq("project_id", projectId)
    .maybeSingle();

  if (settingsRow?.respect_opt_out_for_campaigns) {
    try {
      const allowed = await filterOptedInContacts(supabase, projectId, [...uniqueContactIds]);
      return NextResponse.json({ count: allowed.length });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to filter opted-out contacts" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ count: uniqueContactIds.size });
}
