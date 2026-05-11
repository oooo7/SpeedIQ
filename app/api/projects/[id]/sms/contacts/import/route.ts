import { NextResponse } from "next/server";

import { isValidSmsPhone, normalizeSmsPhone } from "@/lib/sms/phone";
import { requireProjectAccess } from "@/lib/sms/access";

function parseCsvRows(csv: string): Array<{ phone: string; name?: string; email?: string }> {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  return lines.slice(1).map((line) => {
    const parts = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return {
      phone: parts[0] ?? "",
      name: parts[1] || undefined,
      email: parts[2] || undefined,
    };
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body?.rows)
    ? body.rows
    : typeof body?.csv === "string"
      ? parseCsvRows(body.csv)
      : [];

  if (rows.length === 0) return NextResponse.json({ error: "No import rows provided" }, { status: 400 });

  const upserts = rows
    .map((row: { phone?: string; name?: string; email?: string }) => {
      const phone = normalizeSmsPhone(row.phone ?? "");
      if (!isValidSmsPhone(phone)) return null;
      return {
        project_id: projectId,
        phone,
        name: row.name?.trim() || null,
        email: row.email?.trim() || null,
        source: "import",
      };
    })
    .filter(Boolean);

  if (upserts.length === 0) return NextResponse.json({ error: "No valid phone numbers found" }, { status: 400 });

  const { data, error } = await access.supabase
    .from("sms_contacts")
    .upsert(upserts, { onConflict: "project_id,phone" })
    .select("id, phone");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data?.length ?? 0, contacts: data ?? [] });
}
