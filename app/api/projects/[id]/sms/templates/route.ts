import { NextResponse } from "next/server";

import { extractTemplateVariables } from "@/lib/sms/template";
import { requireProjectAccess } from "@/lib/sms/access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const { data, error } = await access.supabase
    .from("sms_templates")
    .select("id, project_id, name, body, variables, created_at, updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
  const body = await request.json().catch(() => ({}));

  const name = body?.name?.trim();
  const messageBody = body?.body?.trim();
  if (!name || !messageBody) {
    return NextResponse.json({ error: "name and body are required" }, { status: 400 });
  }

  const variables = extractTemplateVariables(messageBody);
  const { data, error } = await access.supabase
    .from("sms_templates")
    .insert({
      project_id: projectId,
      name,
      body: messageBody,
      variables,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
