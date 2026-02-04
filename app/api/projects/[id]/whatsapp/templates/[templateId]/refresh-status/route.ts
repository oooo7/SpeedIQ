import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { getTemplateStatusViaWaba, getWhatsAppAccountToken } from "@/lib/whatsapp/api";

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

  const result = await getTemplateStatusViaWaba(
    creds.access_token,
    creds.waba_id,
    template.name ?? "",
    template.language ?? "en"
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("whatsapp_templates")
    .update({
      status: result.status,
      rejection_reason: result.status === "approved" ? null : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("id", templateId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: result.status });
}
