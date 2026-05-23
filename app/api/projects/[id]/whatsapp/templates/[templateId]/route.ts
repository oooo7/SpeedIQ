import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { CANNED_MESSAGE_BUCKET } from "@/lib/supabase/canned-messages-storage";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

async function signMediaPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  // Already a full URL — return as-is (legacy templates may have stored full URLs).
  if (/^https?:\/\//i.test(path)) return path;
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(CANNED_MESSAGE_BUCKET)
      .createSignedUrl(path, 60 * 60); // 1 hour
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export async function GET(
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

  const { data: template, error } = await supabase
    .from("whatsapp_templates")
    .select("id, project_id, name, category, language, status, rejection_reason, body, header, header_format, header_media_url, footer, buttons, variables, variable_field_mapping, meta_template_id, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("id", templateId)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const header_media_signed_url = await signMediaPath(template.header_media_url);
  return NextResponse.json({ template: { ...template, header_media_signed_url } });
}

export async function PATCH(
  request: Request,
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

  const { data: existing } = await supabase
    .from("whatsapp_templates")
    .select("status")
    .eq("project_id", projectId)
    .eq("id", templateId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft templates can be edited" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name?.trim();
  if (body.category !== undefined) updates.category = body.category?.trim();
  if (body.language !== undefined) updates.language = body.language?.trim();
  if (body.body !== undefined) updates.body = body.body?.trim();
  if (body.header !== undefined) updates.header = body.header?.trim() ?? null;
  if (body.footer !== undefined) updates.footer = body.footer?.trim() ?? null;
  if (Array.isArray(body.buttons)) updates.buttons = body.buttons;
  if (Array.isArray(body.variables)) updates.variables = body.variables;
  if (Array.isArray(body.variable_field_mapping)) updates.variable_field_mapping = body.variable_field_mapping;
  if (body.header_format !== undefined) updates.header_format = body.header_format?.trim() ?? "text";
  if (body.header_media_url !== undefined) updates.header_media_url = body.header_media_url?.trim() ?? null;

  const { data: template, error } = await supabase
    .from("whatsapp_templates")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", templateId)
    .select("id, project_id, name, category, language, status, rejection_reason, body, header, header_format, header_media_url, footer, buttons, variables, variable_field_mapping, meta_template_id, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header_media_signed_url = await signMediaPath(template.header_media_url);
  return NextResponse.json({ template: { ...template, header_media_signed_url } });
}

export async function DELETE(
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

  const { error } = await supabase
    .from("whatsapp_templates")
    .delete()
    .eq("project_id", projectId)
    .eq("id", templateId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
