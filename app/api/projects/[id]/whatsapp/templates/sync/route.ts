import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  getWhatsAppAccountToken,
  fetchMessageTemplatesFromMeta,
  metaTemplateToRow,
} from "@/lib/whatsapp/api";

/**
 * POST: Fetch message templates from Meta (Facebook) for the connected WhatsApp Business Account
 * and upsert them into whatsapp_templates. Existing templates are matched by meta_template_id
 * or (name + language) and updated; new ones are inserted.
 */
export async function POST(
  _request: Request,
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

  const account = await getWhatsAppAccountToken(supabase, projectId);
  if (!account) {
    return NextResponse.json(
      { error: "WhatsApp account not connected. Connect in Settings → WhatsApp." },
      { status: 400 }
    );
  }

  const result = await fetchMessageTemplatesFromMeta(account.access_token, account.waba_id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const { templates: metaTemplates } = result;

  const { data: existingRows } = await supabase
    .from("whatsapp_templates")
    .select("id, meta_template_id, name, language")
    .eq("project_id", projectId);

  type ExistingRow = { id: string; meta_template_id: string | null; name: string | null; language: string | null };
  const rows: ExistingRow[] = existingRows ?? [];
  const byMetaId = new Map<string, ExistingRow>();
  const byNameLang = new Map<string, ExistingRow>();
  for (const row of rows) {
    if (row.meta_template_id) byMetaId.set(row.meta_template_id, row);
    byNameLang.set(`${(row.name ?? "").toLowerCase()}|${(row.language ?? "").toLowerCase()}`, row);
  }

  let inserted = 0;
  let updated = 0;

  for (const meta of metaTemplates) {
    const row = metaTemplateToRow(meta);
    const existingByMeta = row.meta_template_id ? byMetaId.get(row.meta_template_id) : null;
    const existingByKey = existingByMeta ?? byNameLang.get(`${row.name.toLowerCase()}|${row.language.toLowerCase()}`);

    const payload = {
      name: row.name,
      category: row.category,
      language: row.language,
      status: row.status,
      body: row.body,
      header: row.header,
      header_format: row.header_format,
      footer: row.footer,
      buttons: row.buttons,
      variables: row.variables,
      meta_template_id: row.meta_template_id,
      updated_at: new Date().toISOString(),
    };

    if (existingByKey) {
      const { error } = await supabase
        .from("whatsapp_templates")
        .update(payload)
        .eq("id", existingByKey.id);
      if (!error) updated++;
    } else {
      const { error } = await supabase.from("whatsapp_templates").insert({
        project_id: projectId,
        ...payload,
      });
      if (!error) inserted++;
    }
  }

  return NextResponse.json({
    ok: true,
    fetched: metaTemplates.length,
    inserted,
    updated,
    message: `Fetched ${metaTemplates.length} templates from Meta. ${inserted} new, ${updated} updated.`,
  });
}
