import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

// Per-request hard cap. Bigger imports must be split into chunks client-side
// (the contacts page does this automatically with a progress bar). Each
// chunk does at most 3 round trips: tag defs, contact upsert, junction
// upsert — so even at the cap a chunk finishes well under the Vercel
// function timeout.
const MAX_ROWS_PER_REQUEST = 5000;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === "," || c === "\t") {
        current.push(cell);
        cell = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        current.push(cell);
        if (current.some((v) => v.trim())) rows.push(current);
        current = [];
        cell = "";
      } else {
        cell += c;
      }
    }
  }
  if (cell || current.length) {
    current.push(cell);
    if (current.some((v) => v.trim())) rows.push(current);
  }
  return rows;
}

function parseTagsCell(cell: string | undefined): string[] {
  if (!cell) return [];
  return cell
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 64);
}

interface ColumnMap {
  phone: number;
  name?: number;
  email?: number;
  tags?: number;
}

interface ValidRow {
  phone: string;
  name: string | null;
  email: string | null;
  tagNames: string[];
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

  const contentType = request.headers.get("content-type") ?? "";
  let rows: string[][];
  let columnMap: ColumnMap = { phone: 0 };

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    const csv = body?.csv ?? body?.data ?? "";
    const map = body?.columnMap ?? {};
    if (typeof csv !== "string") {
      return NextResponse.json({ error: "csv string is required" }, { status: 400 });
    }
    rows = parseCsv(csv.trim());
    columnMap = {
      phone: map.phone ?? 0,
      name: map.name,
      email: map.email,
      tags: map.tags,
    };
  } else {
    const text = await request.text();
    rows = parseCsv(text.trim());
  }

  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const phoneIdx = columnMap.phone ?? header.findIndex((h) => /phone|number|mobile|tel/i.test(h)) ?? 0;
  const nameIdx = columnMap.name ?? header.findIndex((h) => /name|full.?name/i.test(h));
  const emailIdx = columnMap.email ?? header.findIndex((h) => /email/i.test(h));
  const tagsIdx = columnMap.tags ?? header.findIndex((h) => /^tags?$|labels?/i.test(h));

  if (phoneIdx < 0 || !rows[0][phoneIdx]) {
    return NextResponse.json({ error: "A phone column is required" }, { status: 400 });
  }

  if (rows.length - 1 > MAX_ROWS_PER_REQUEST) {
    return NextResponse.json(
      {
        error: `Too many rows (${rows.length - 1}). Maximum ${MAX_ROWS_PER_REQUEST} per request — split into chunks.`,
      },
      { status: 413 }
    );
  }

  const { normalizePhone, validatePhone } = await import("@/lib/whatsapp/phone");

  // --------------------------------------------------------------------------
  // Phase 1 — Parse + validate + dedupe entirely in JS (no DB calls).
  // We end up with `validRows` (ready to bulk-insert) and `skipped` (per-row
  // reasons to surface back to the user).
  // --------------------------------------------------------------------------
  const validRows: ValidRow[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const seenPhones = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1; // header was row 1

    const rawPhone = row[phoneIdx]?.trim().replace(/\s+/g, "");
    if (!rawPhone) {
      skipped.push({ row: rowNumber, reason: "empty phone" });
      continue;
    }
    const phone = normalizePhone(rawPhone);
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      skipped.push({ row: rowNumber, reason: `invalid phone "${rawPhone}": ${phoneCheck.reason}` });
      continue;
    }
    if (seenPhones.has(phone)) {
      skipped.push({ row: rowNumber, reason: `duplicate phone in this chunk: ${phone}` });
      continue;
    }
    seenPhones.add(phone);

    const name = nameIdx != null && nameIdx >= 0 ? row[nameIdx]?.trim() || null : null;
    const email = emailIdx != null && emailIdx >= 0 ? row[emailIdx]?.trim() || null : null;
    const tagNames =
      tagsIdx != null && tagsIdx >= 0 ? parseTagsCell(row[tagsIdx]) : [];

    validRows.push({ phone, name, email, tagNames });
  }

  if (validRows.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: skipped.length,
      total: rows.length - 1,
      skipped_details: skipped.slice(0, 100),
    });
  }

  // --------------------------------------------------------------------------
  // Phase 2 — Bulk upsert / lookup tag definitions in one round trip.
  // --------------------------------------------------------------------------
  const allTagNames = new Set<string>();
  for (const r of validRows) for (const t of r.tagNames) allTagNames.add(t);

  const tagIdByName = new Map<string, string>();
  if (allTagNames.size > 0) {
    const tagPayload = [...allTagNames].map((name) => ({ project_id: projectId, name }));
    await supabase
      .from("whatsapp_tag_definitions")
      .upsert(tagPayload, { onConflict: "project_id,name", ignoreDuplicates: true });

    const { data: tagDefs } = await supabase
      .from("whatsapp_tag_definitions")
      .select("id, name")
      .eq("project_id", projectId)
      .in("name", [...allTagNames]);
    for (const t of tagDefs ?? []) {
      if (typeof t.name === "string" && typeof t.id === "string") tagIdByName.set(t.name, t.id);
    }
  }

  // --------------------------------------------------------------------------
  // Phase 3 — Bulk upsert every contact in ONE call, then map phone → id.
  // This replaces N sequential round trips with exactly 1.
  // --------------------------------------------------------------------------
  const contactPayload = validRows.map((r) => ({
    project_id: projectId,
    phone: r.phone,
    name: r.name,
    email: r.email,
    source: "import",
  }));

  const { data: upserted, error: upsertErr } = await supabase
    .from("whatsapp_contacts")
    .upsert(contactPayload, { onConflict: "project_id,phone", ignoreDuplicates: false })
    .select("id, phone");

  if (upsertErr) {
    return NextResponse.json(
      { error: `Bulk contact upsert failed: ${upsertErr.message}` },
      { status: 500 }
    );
  }

  const phoneToId = new Map<string, string>();
  for (const c of upserted ?? []) {
    if (typeof c.id === "string" && typeof c.phone === "string") {
      phoneToId.set(c.phone, c.id);
    }
  }

  // --------------------------------------------------------------------------
  // Phase 4 — Bulk insert junction rows in ONE call.
  // --------------------------------------------------------------------------
  const junctionRows: Array<{ contact_id: string; tag_id: string }> = [];
  for (const r of validRows) {
    if (r.tagNames.length === 0) continue;
    const contactId = phoneToId.get(r.phone);
    if (!contactId) continue;
    for (const tagName of r.tagNames) {
      const tagId = tagIdByName.get(tagName);
      if (tagId) junctionRows.push({ contact_id: contactId, tag_id: tagId });
    }
  }

  // Dedupe within batch so a single failed row doesn't cascade.
  const seenLinks = new Set<string>();
  const uniqueLinks = junctionRows.filter((l) => {
    const key = `${l.contact_id}:${l.tag_id}`;
    if (seenLinks.has(key)) return false;
    seenLinks.add(key);
    return true;
  });

  if (uniqueLinks.length > 0) {
    const { error: linkErr } = await supabase
      .from("whatsapp_contact_tags")
      .upsert(uniqueLinks, { onConflict: "contact_id,tag_id", ignoreDuplicates: true });
    if (linkErr) {
      // Contacts are already saved; report the tag-link failure but don't
      // unwind the import.
      return NextResponse.json({
        imported: phoneToId.size,
        skipped: skipped.length,
        total: rows.length - 1,
        tag_link_error: linkErr.message,
        skipped_details: skipped.slice(0, 100),
      });
    }
  }

  return NextResponse.json({
    imported: phoneToId.size,
    skipped: skipped.length,
    total: rows.length - 1,
    skipped_details: skipped.slice(0, 100),
  });
}
