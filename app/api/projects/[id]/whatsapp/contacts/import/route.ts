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
  let columnMap: { phone: number; name?: number; email?: number; [key: string]: number | undefined } = { phone: 0 };

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

  if (phoneIdx < 0 || !rows[0][phoneIdx]) {
    return NextResponse.json({ error: "A phone column is required" }, { status: 400 });
  }

  const inserted: { phone: string; name?: string; email?: string }[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const maxRows = 2000;

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

    const { error } = await supabase.from("whatsapp_contacts").upsert(
      {
        project_id: projectId,
        phone, // already normalized
        name: name || null,
        email: email || null,
        source: "import",
        tags: [],
        custom_fields: {},
      },
      { onConflict: "project_id,phone", ignoreDuplicates: false }
    );

    if (error) {
      skipped.push({ row: i + 1, reason: error.message });
    } else {
      inserted.push({ phone, name, email });
    }
  }

  return NextResponse.json({
    imported: inserted.length,
    skipped: skipped.length,
    total: rows.length - 1,
    skipped_details: skipped.slice(0, 50),
  });
}
