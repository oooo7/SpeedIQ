import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import {
  getTemplateById,
  getTemplateStatusViaWaba,
  getWhatsAppAccountToken,
  metaTemplateToRow,
} from "@/lib/whatsapp/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, templateId } = await params;
  if (!projectId || !templateId) {
    return NextResponse.json({ error: "Project ID and template ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: template, error: templateError } = await supabase
    .from("whatsapp_templates")
    .select("id, meta_template_id, name, language, status")
    .eq("project_id", projectId)
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (!template.meta_template_id?.trim()) {
    return NextResponse.json(
      { error: "Template has not been submitted to Meta yet. Submit for approval first." },
      { status: 400 }
    );
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
  }

  // Prefer ID-based lookup: directly fetches the template from Meta by its ID.
  // This is reliable; the previous name+language list filter was case-sensitive and
  // returned 0 matches for templates synced from Meta with mixed-case language codes.
  const byId = await getTemplateById(creds.access_token, template.meta_template_id);

  let nextStatus: string;
  let fullUpdate: Record<string, unknown> | null = null;

  if ("template" in byId) {
    const row = metaTemplateToRow(byId.template);
    nextStatus = row.status;
    // Also refresh the rest of the template fields — Meta may have changed body/category
    // during review. Keeps the local copy in sync without forcing a full "Fetch from Meta".
    fullUpdate = {
      status: row.status,
      category: row.category,
      language: row.language,
      body: row.body,
      header: row.header,
      footer: row.footer,
      buttons: row.buttons,
      variables: row.variables,
      rejection_reason: row.status === "approved" ? null : undefined,
      updated_at: new Date().toISOString(),
    };
  } else {
    // Fallback for legacy templates without meta_template_id or if ID lookup failed
    // for transient reasons. Keep the older name+language path as a last resort.
    const fallback = await getTemplateStatusViaWaba(
      creds.access_token,
      creds.waba_id,
      template.name ?? "",
      template.language ?? "en"
    );
    if ("error" in fallback) {
      return NextResponse.json({ error: byId.error.message }, { status: 400 });
    }
    nextStatus = fallback.status;
    fullUpdate = {
      status: fallback.status,
      rejection_reason: fallback.status === "approved" ? null : undefined,
      updated_at: new Date().toISOString(),
    };
  }

  const { error: updateError } = await supabase
    .from("whatsapp_templates")
    .update(fullUpdate)
    .eq("project_id", projectId)
    .eq("id", templateId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: nextStatus });
}
