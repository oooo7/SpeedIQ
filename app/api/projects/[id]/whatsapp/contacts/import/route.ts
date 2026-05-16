import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

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

function parseTagCell(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
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
  let columnMap: { phone: number; name?: number; email?: number; tags?: number; [key: string]: number | undefined } = { phone: 0 };

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
  const tagsIdx = columnMap.tags ?? header.findIndex((h) => /^(tags?|labels?)$/i.test(h));

  if (phoneIdx < 0 || !rows[0][phoneIdx]) {
    return NextResponse.json({ error: "A phone column is required" }, { status: 400 });
  }

  const maxRows = 2000;
  const dataRows = rows.slice(1, 1 + maxRows);

  // Collect all unique tag names referenced by this import.
  const allTagNames = new Set<string>();
  if (tagsIdx != null && tagsIdx >= 0) {
    for (const row of dataRows) {
      const names = parseTagCell(row[tagsIdx]);
      for (const n of names) allTagNames.add(n);
    }
  }

  // Build name -> id map for tag definitions, auto-creating any missing ones.
  const tagNameToId = new Map<string, string>();
  if (allTagNames.size > 0) {
    const names = Array.from(allTagNames);
    const { data: existing } = await supabase
      .from("whatsapp_tag_definitions")
      .select("id, name")
      .eq("project_id", projectId)
      .in("name", names);
    for (const t of (existing ?? []) as Array<{ id: string; name: string }>) {
      tagNameToId.set(t.name, t.id);
    }
    const missing = names.filter((n) => !tagNameToId.has(n));
    if (missing.length > 0) {
      const { data: inserted } = await supabase
        .from("whatsapp_tag_definitions")
        .insert(missing.map((name) => ({ project_id: projectId, name })))
        .select("id, name");
      for (const t of (inserted ?? []) as Array<{ id: string; name: string }>) {
        tagNameToId.set(t.name, t.id);
      }
    }
  }

  const inserted: { phone: string; name?: string; email?: string; tags?: string[] }[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const contactTagLinks: { contact_id: string; tag_id: string }[] = [];

  const { normalizePhone, validatePhone } = await import("@/lib/whatsapp/phone");

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // header is row 1
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
    const name = nameIdx != null && nameIdx >= 0 ? row[nameIdx]?.trim() : undefined;
    const email = emailIdx != null && emailIdx >= 0 ? row[emailIdx]?.trim() : undefined;
    const rowTagNames = tagsIdx != null && tagsIdx >= 0 ? parseTagCell(row[tagsIdx]) : [];

    const { data: upserted, error } = await supabase
      .from("whatsapp_contacts")
      .upsert(
        {
          project_id: projectId,
          phone,
          name: name || null,
          email: email || null,
          source: "import",
          tags: [],
          custom_fields: {},
        },
        { onConflict: "project_id,phone", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (error || !upserted) {
      skipped.push({ row: rowNumber, reason: error?.message ?? "upsert failed" });
      continue;
    }

    if (rowTagNames.length > 0) {
      for (const tagName of rowTagNames) {
        const tagId = tagNameToId.get(tagName);
        if (tagId) contactTagLinks.push({ contact_id: upserted.id, tag_id: tagId });
      }
    }

    inserted.push({ phone, name, email, tags: rowTagNames });
  }

  if (contactTagLinks.length > 0) {
    // Dedupe within the batch in case the same contact/tag pair appears twice.
    const seen = new Set<string>();
    const unique = contactTagLinks.filter((l) => {
      const key = `${l.contact_id}:${l.tag_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    await supabase.from("whatsapp_contact_tags").upsert(unique, { onConflict: "contact_id,tag_id", ignoreDuplicates: true });
  }

  return NextResponse.json({
    imported: inserted.length,
    skipped: skipped.length,
    total: rows.length - 1,
    skipped_details: skipped.slice(0, 50),
  });
}
