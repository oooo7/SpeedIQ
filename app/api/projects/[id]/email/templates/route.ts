import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function GET(
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

  const { data: templates, error } = await supabase
    .from("email_templates")
    .select("id, project_id, name, subject, body_html, body_text, variables, created_at, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: templates ?? [] });
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

  const body = await request.json().catch(() => ({}));
  const name = body?.name?.trim();
  const subject = body?.subject?.trim() ?? "";
  const body_html = body?.body_html?.trim() ?? null;
  const body_text = body?.body_text?.trim() ?? null;
  const variables = Array.isArray(body?.variables) ? body.variables : [];

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: template, error } = await supabase
    .from("email_templates")
    .insert({
      project_id: projectId,
      name,
      subject,
      body_html,
      body_text,
      variables,
    })
    .select("id, project_id, name, subject, body_html, body_text, variables, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
