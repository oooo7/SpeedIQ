import { NextResponse } from "next/server";

import { extractTemplateVariables } from "@/lib/sms/template";
import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id: projectId, templateId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { data, error } = await access.supabase
    .from("sms_templates")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", templateId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id: projectId, templateId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body?.name === "string") patch.name = body.name.trim();
  if (typeof body?.body === "string") {
    patch.body = body.body.trim();
    patch.variables = extractTemplateVariables(body.body);
  }

  const { data, error } = await access.supabase
    .from("sms_templates")
    .update(patch)
    .eq("project_id", projectId)
    .eq("id", templateId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const { id: projectId, templateId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { error } = await access.supabase
    .from("sms_templates")
    .delete()
    .eq("project_id", projectId)
    .eq("id", templateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
