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

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
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
  let columnMap: { email: number; name?: number; [key: string]: number | undefined } = { email: 0 };

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    const csv = body?.csv ?? body?.data ?? "";
    const map = body?.columnMap ?? {};
    if (typeof csv !== "string") {
      return NextResponse.json({ error: "csv string is required" }, { status: 400 });
    }
    rows = parseCsv(csv.trim());
    columnMap = {
      email: map.email ?? 0,
      name: map.name,
    };
  } else {
    const text = await request.text();
    rows = parseCsv(text.trim());
  }

  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const emailIdx = columnMap.email ?? header.findIndex((h) => /email/i.test(h)) ?? 0;
  const nameIdx = columnMap.name ?? header.findIndex((h) => /name|full.?name/i.test(h));

  if (emailIdx < 0 || !rows[0][emailIdx]) {
    return NextResponse.json({ error: "An email column is required" }, { status: 400 });
  }

  let imported = 0;
  let skipped = 0;
  const errors: { row: number; reason: string }[] = [];
  const maxRows = 2000;

  for (let i = 1; i < rows.length && imported + skipped < maxRows; i++) {
    const row = rows[i];
    const email = (row[emailIdx]?.trim() ?? "").toLowerCase();
    if (!email) {
      skipped++;
      if (errors.length < 50) errors.push({ row: i + 1, reason: "empty email" });
      continue;
    }
    if (!isValidEmail(email)) {
      skipped++;
      if (errors.length < 50) errors.push({ row: i + 1, reason: "invalid email" });
      continue;
    }
    const name = nameIdx != null && nameIdx >= 0 ? row[nameIdx]?.trim() : null;

    const { error } = await supabase.from("email_subscribers").upsert(
      {
        project_id: projectId,
        email,
        name: name || null,
        tags: [],
        source: "import",
        status: "subscribed",
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: "project_id,email", ignoreDuplicates: false }
    );

    if (error) {
      skipped++;
      if (errors.length < 50) errors.push({ row: i + 1, reason: error.message });
    } else {
      imported++;
    }
  }

  return NextResponse.json({
    imported,
    skipped,
    total: rows.length - 1,
    skipped_details: errors,
  });
}
