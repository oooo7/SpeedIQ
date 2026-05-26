import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

const MAX_IDS = 500;

/**
 * Bulk-edit multiple WhatsApp contacts in one call.
 * Body:
 *   ids:             string[]   (required, max 500)
 *   add_tag_ids:     string[]   (optional, union add — junction upsert)
 *   remove_tag_ids:  string[]   (optional, deletes matching junction rows)
 *   set_source:      string|null (optional, overwrites source on every id)
 *   set_opt_out:     boolean    (optional, overwrites opt_out on every id)
 *
 * Tag operations are additive/subtractive, not replace — so a user can
 * "Tag these 50 as VIP" without nuking their existing tags.
 */
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

  const body = await request.json().catch(() => ({} as Record<string, unknown>));

  const filterStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];

  const allIds = filterStrings(body.ids);
  if (allIds.length === 0) {
    return NextResponse.json({ error: "ids[] is required" }, { status: 400 });
  }
  if (allIds.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IDS} contacts per bulk update.` },
      { status: 400 }
    );
  }
  const ids = allIds;

  const addTagIds = filterStrings(body.add_tag_ids);
  const removeTagIds = filterStrings(body.remove_tag_ids);

  const hasSetSource = Object.prototype.hasOwnProperty.call(body, "set_source");
  const setSource: string | null = hasSetSource
    ? typeof body.set_source === "string"
      ? body.set_source.trim() || null
      : null
    : null;

  const hasSetOptOut = typeof body.set_opt_out === "boolean";
  const setOptOut = hasSetOptOut ? (body.set_opt_out as boolean) : false;

  if (
    addTagIds.length === 0 &&
    removeTagIds.length === 0 &&
    !hasSetSource &&
    !hasSetOptOut
  ) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  // Whitelist contact ids to those that actually belong to this project.
  // Prevents a caller from mutating other projects' rows via id-guessing.
  const { data: ownedRows, error: ownedErr } = await supabase
    .from("whatsapp_contacts")
    .select("id")
    .eq("project_id", projectId)
    .in("id", ids);
  if (ownedErr) {
    return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  }
  const ownedIds = (ownedRows ?? []).map((r: { id: string }) => r.id);
  if (ownedIds.length === 0) {
    return NextResponse.json({ error: "No matching contacts in this project" }, { status: 404 });
  }

  // Tag id validity (must belong to this project too).
  let validAddTagIds: string[] = [];
  if (addTagIds.length > 0) {
    const { data: defs } = await supabase
      .from("whatsapp_tag_definitions")
      .select("id")
      .eq("project_id", projectId)
      .in("id", addTagIds);
    validAddTagIds = (defs ?? []).map((d: { id: string }) => d.id);
  }
  let validRemoveTagIds: string[] = [];
  if (removeTagIds.length > 0) {
    const { data: defs } = await supabase
      .from("whatsapp_tag_definitions")
      .select("id")
      .eq("project_id", projectId)
      .in("id", removeTagIds);
    validRemoveTagIds = (defs ?? []).map((d: { id: string }) => d.id);
  }

  const errors: string[] = [];

  // 1. Field updates (source / opt_out) — one query for the whole batch.
  if (hasSetSource || hasSetOptOut) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (hasSetSource) updates.source = setSource;
    if (hasSetOptOut) updates.opt_out = setOptOut;
    const { error } = await supabase
      .from("whatsapp_contacts")
      .update(updates)
      .eq("project_id", projectId)
      .in("id", ownedIds);
    if (error) errors.push(`field update: ${error.message}`);
  }

  // 2. Add tags — junction upsert, idempotent on (contact_id, tag_id).
  let tagsAdded = 0;
  if (validAddTagIds.length > 0) {
    const rows: Array<{ contact_id: string; tag_id: string }> = [];
    for (const contactId of ownedIds) {
      for (const tagId of validAddTagIds) {
        rows.push({ contact_id: contactId, tag_id: tagId });
      }
    }
    const { error } = await supabase
      .from("whatsapp_contact_tags")
      .upsert(rows, { onConflict: "contact_id,tag_id", ignoreDuplicates: true });
    if (error) errors.push(`add tags: ${error.message}`);
    else tagsAdded = rows.length;
  }

  // 3. Remove tags — delete junction rows matching either filter.
  let tagsRemoved = 0;
  if (validRemoveTagIds.length > 0) {
    const { error, count } = await supabase
      .from("whatsapp_contact_tags")
      .delete({ count: "exact" })
      .in("contact_id", ownedIds)
      .in("tag_id", validRemoveTagIds);
    if (error) errors.push(`remove tags: ${error.message}`);
    else tagsRemoved = count ?? 0;
  }

  return NextResponse.json({
    updated: ownedIds.length,
    requested: ids.length,
    tags_added: tagsAdded,
    tags_removed: tagsRemoved,
    errors,
  });
}
