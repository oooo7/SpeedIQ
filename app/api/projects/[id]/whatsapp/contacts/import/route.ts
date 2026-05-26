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

/**
 * Split a tags cell into individual tag names.
 * Accepts comma, semicolon, or pipe separators (since users export from
 * different tools). Tags are trimmed; blanks are dropped.
 */
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

  const maxRows = 2000;

  // Pre-pass: collect every unique tag name across the import so we can
  // upsert tag definitions in a single round trip instead of per-row.
  const allTagNames = new Set<string>();
  if (tagsIdx != null && tagsIdx >= 0) {
    for (let i = 1; i < rows.length && i - 1 < maxRows; i++) {
      for (const name of parseTagsCell(rows[i][tagsIdx])) allTagNames.add(name);
    }
  }

  const tagIdByName = new Map<string, string>();
  if (allTagNames.size > 0) {
    const tagPayload = [...allTagNames].map((name) => ({ project_id: projectId, name }));
    // ignoreDuplicates so existing tag definitions aren't churned (no updated_at to bump).
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

  const inserted: { phone: string; name?: string; email?: string; tags?: string[] }[] = [];
  const skipped: { row: number; reason: string }[] = [];

  const { normalizePhone, validatePhone } = await import("@/lib/whatsapp/phone");

  for (let i = 1; i < rows.length && inserted.length + skipped.length < maxRows; i++) {
    const row = rows[i];
    const rawPhone = row[phoneIdx]?.trim().replace(/\s+/g, "");
    if (!rawPhone) {
      skipped.push({ row: i + 1, reason: "empty phone" });
      continue;
    }
    const phone = normalizePhone(rawPhone);
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      skipped.push({ row: i + 1, reason: `invalid phone "${rawPhone}": ${phoneCheck.reason}` });
      continue;
    }
    const name = nameIdx != null && nameIdx >= 0 ? row[nameIdx]?.trim() : undefined;
    const email = emailIdx != null && emailIdx >= 0 ? row[emailIdx]?.trim() : undefined;
    const rowTagNames =
      tagsIdx != null && tagsIdx >= 0 ? parseTagsCell(row[tagsIdx]) : [];

    // Upsert the contact and capture its id so we can attach tags afterwards.
    // We deliberately don't write `tags` or `custom_fields` here so re-imports
    // don't wipe values set elsewhere — junction table is the source of truth.
    const { data: upserted, error } = await supabase
      .from("whatsapp_contacts")
      .upsert(
        {
          project_id: projectId,
          phone,
          name: name || null,
          email: email || null,
          source: "import",
        },
        { onConflict: "project_id,phone", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (error || !upserted) {
      skipped.push({ row: i + 1, reason: error?.message ?? "upsert failed" });
      continue;
    }

    if (rowTagNames.length > 0) {
      const junctionRows = rowTagNames
        .map((name) => {
          const tagId = tagIdByName.get(name);
          return tagId ? { contact_id: upserted.id, tag_id: tagId } : null;
        })
        .filter((r): r is { contact_id: string; tag_id: string } => r !== null);

      if (junctionRows.length > 0) {
        // ignoreDuplicates so re-importing the same contact+tag is idempotent.
        const { error: tagError } = await supabase
          .from("whatsapp_contact_tags")
          .upsert(junctionRows, {
            onConflict: "contact_id,tag_id",
            ignoreDuplicates: true,
          });
        if (tagError) {
          // Contact already saved; surface the tag failure but don't undo the contact.
          skipped.push({ row: i + 1, reason: `contact imported but tag link failed: ${tagError.message}` });
          continue;
        }
      }
    }

    inserted.push({ phone, name, email, tags: rowTagNames });
  }

  return NextResponse.json({
    imported: inserted.length,
    skipped: skipped.length,
    total: rows.length - 1,
    skipped_details: skipped.slice(0, 50),
  });
}
