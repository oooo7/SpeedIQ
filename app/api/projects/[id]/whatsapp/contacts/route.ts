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
  // all=1: return up to ALL_CAP rows for the "Select all matching" UX.
  // Supabase / PostgREST caps any single response at 1000 rows regardless
  // of the requested range, so we have to loop and accumulate.
  // Payload is slimmed to {id, phone, name} so 25k rows ≈ 1.75MB — fits
  // comfortably under Vercel's 4.5MB response limit even on Hobby tier.
  const allMode = searchParams.get("all") === "1";
  const ALL_CAP = 25000;
  const PAGE = 1000;

  // Resolve the tag filter once (it requires its own queries — would be a
  // waste to redo per page). Same special-case for "tag doesn't exist".
  let tagFilteredIds: string[] | null = null;
  if (tag) {
    const { data: tagRow } = await supabase
      .from("whatsapp_tag_definitions")
      .select("id")
      .eq("project_id", projectId)
      .eq("name", tag)
      .single();
    if (tagRow?.id) {
      // The contact_tags lookup can itself exceed 1000 — page through.
      const ids: string[] = [];
      let from = 0;
      while (from < ALL_CAP) {
        const { data: chunk } = await supabase
          .from("whatsapp_contact_tags")
          .select("contact_id")
          .eq("tag_id", tagRow.id)
          .order("contact_id")
          .range(from, from + PAGE - 1);
        const rows = (chunk ?? []) as Array<{ contact_id: string }>;
        if (rows.length === 0) break;
        for (const r of rows) ids.push(r.contact_id);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      tagFilteredIds = ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
    } else {
      tagFilteredIds = ["00000000-0000-0000-0000-000000000000"];
    }
  }

  // Factory: fresh query for each page (supabase-js builders aren't reusable
  // after .range()).
  const buildQuery = (withCount: boolean) => {
    let q = supabase
      .from("whatsapp_contacts")
      .select(
        "id, project_id, phone, name, email, custom_fields, source, last_inbound_at, created_at, updated_at",
        withCount ? { count: "exact" } : {}
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }); // stable tiebreaker for pagination
    if (search) {
      const term = `%${search}%`;
      q = q.or(`phone.ilike.${term},name.ilike.${term},email.ilike.${term}`);
    }
    if (tagFilteredIds) q = q.in("id", tagFilteredIds);
    if (source) q = q.eq("source", source);
    return q;
  };

  let list: Array<{ id: string; [k: string]: unknown }> = [];
  let count: number | null = null;

  if (allMode) {
    // Loop through pages until we hit the end or the cap.
    let from = 0;
    let first = true;
    while (from < ALL_CAP) {
      const { data, error, count: c } = await buildQuery(first).range(from, from + PAGE - 1);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const page = (data ?? []) as Array<{ id: string; [k: string]: unknown }>;
      if (first) count = c ?? null;
      list = list.concat(page);
      first = false;
      if (page.length < PAGE) break;
      from += PAGE;
    }
    // all-mode skips tag enrichment + trims to id/phone/name only — callers
    // only need those for building selection sets, and trimming keeps the
    // response well under the function response-size limit at 10k rows.
    const slim = list.map((c) => ({
      id: c.id,
      phone: (c as { phone?: string | null }).phone ?? null,
      name: (c as { name?: string | null }).name ?? null,
    }));
    return NextResponse.json({
      contacts: slim,
      total: count ?? slim.length,
      capped: slim.length >= ALL_CAP,
    });
  }

  // Single-page (regular pagination) path.
  const { data: pageData, error, count: pageCount } = await buildQuery(true).range(offset, offset + limit - 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  list = (pageData ?? []) as Array<{ id: string; [k: string]: unknown }>;
  count = pageCount ?? null;
  const contactIds = list.map((c: { id: string }) => c.id);
  const tagsByContactId: Record<string, Array<{ id: string; name: string }>> = {};
  if (contactIds.length > 0) {
    const { data: links } = await supabase
      .from("whatsapp_contact_tags")
      .select("contact_id, tag_id")
      .in("contact_id", contactIds);
    const tagIds = [...new Set((links ?? []).map((r: { tag_id: string }) => r.tag_id))];
    const tagIdToName: Record<string, string> = {};
    if (tagIds.length > 0) {
      const { data: defs } = await supabase
        .from("whatsapp_tag_definitions")
        .select("id, name")
        .in("id", tagIds);
      for (const d of defs ?? []) {
        tagIdToName[d.id] = d.name;
      }
    }
    for (const row of links ?? []) {
      const cid = (row as { contact_id: string }).contact_id;
      const tid = (row as { tag_id: string }).tag_id;
      if (!tagsByContactId[cid]) tagsByContactId[cid] = [];
      if (tagIdToName[tid]) tagsByContactId[cid].push({ id: tid, name: tagIdToName[tid] });
    }
  }

  const contactsWithTags = list.map((c: { id: string; [k: string]: unknown }) => ({
    ...c,
    tags: tagsByContactId[c.id] ?? [],
  }));

  return NextResponse.json({
    contacts: contactsWithTags,
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
  const rawPhone = body?.phone?.trim();
  const name = body?.name?.trim() ?? null;
  const email = body?.email?.trim() ?? null;
  const custom_fields = body?.custom_fields && typeof body.custom_fields === "object" ? body.custom_fields : {};
  const tag_ids = Array.isArray(body?.tag_ids) ? body.tag_ids.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean) : [];
  const source = body?.source?.trim() ?? "manual";

  if (!rawPhone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const { normalizePhone, validatePhone } = await import("@/lib/whatsapp/phone");
  const phone = normalizePhone(rawPhone);
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) {
    return NextResponse.json({ error: phoneCheck.reason }, { status: 400 });
  }

  const { data: contact, error } = await supabase
    .from("whatsapp_contacts")
    .insert({
      project_id: projectId,
      phone,
      name,
      email,
      custom_fields,
      tags: [],
      source,
    })
    .select("id, project_id, phone, name, email, custom_fields, source, last_inbound_at, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A contact with this phone number already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (tag_ids.length > 0) {
    const { data: tagDefs } = await supabase
      .from("whatsapp_tag_definitions")
      .select("id")
      .eq("project_id", projectId)
      .in("id", tag_ids);
    const validIds = (tagDefs ?? []).map((t: { id: string }) => t.id);
    if (validIds.length > 0) {
      await supabase.from("whatsapp_contact_tags").insert(
        validIds.map((tag_id: string) => ({ contact_id: contact.id, tag_id }))
      );
    }
  }

  const tags = tag_ids.length > 0
    ? await (async () => {
        const { data: defs } = await supabase
          .from("whatsapp_tag_definitions")
          .select("id, name")
          .eq("project_id", projectId)
          .in("id", tag_ids);
        return (defs ?? []).map((d: { id: string; name: string }) => ({ id: d.id, name: d.name }));
      })()
    : [];

  return NextResponse.json({ contact: { ...contact, tags } }, { status: 201 });
}
