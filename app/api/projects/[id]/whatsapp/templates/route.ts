import { NextResponse } from "next/server";

import { withRouteErrorHandler } from "@/lib/api/route-error";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withRouteErrorHandler(() => handleGet(request, ctx));
}

async function handleGet(
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

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status")?.trim();
  const includeDrafts = searchParams.get("include_drafts") === "1" || searchParams.get("include_drafts") === "true";

  let query = supabase
    .from("whatsapp_templates")
    .select("id, project_id, name, category, language, status, rejection_reason, body, header, header_format, header_media_url, footer, buttons, variables, variable_field_mapping, meta_template_id, created_at, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  // When include_drafts=true, return all templates (no status filter). Otherwise filter by status or default to approved.
  if (!includeDrafts) {
    query = query.eq("status", statusFilter || "approved");
  }

  const { data: templates, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: templates ?? [] });
}

export function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return withRouteErrorHandler(() => handlePost(request, ctx));
}

async function handlePost(
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
  const category = body?.category?.trim() ?? "marketing";
  const language = body?.language?.trim() ?? "en";
  const templateBody = body?.body?.trim() ?? "";
  const header = body?.header?.trim() ?? null;
  const footer = body?.footer?.trim() ?? null;
  const buttons = Array.isArray(body?.buttons) ? body.buttons : [];
  const variables = Array.isArray(body?.variables) ? body.variables : [];
  const variableFieldMapping = Array.isArray(body?.variable_field_mapping) ? body.variable_field_mapping : [];
  const headerFormat = body?.header_format?.trim() ?? "text";
  const headerMediaUrl = body?.header_media_url?.trim() ?? null;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const validCategories = ["marketing", "utility", "authentication"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "category must be marketing, utility, or authentication" }, { status: 400 });
  }

  const { data: template, error: insertError } = await supabase
    .from("whatsapp_templates")
    .insert({
      project_id: projectId,
      name,
      category,
      language,
      body: templateBody,
      header,
      header_format: headerFormat,
      header_media_url: headerMediaUrl,
      footer,
      buttons,
      variables,
      variable_field_mapping: variableFieldMapping,
      status: "draft",
    })
    .select("id, project_id, name, category, language, status, rejection_reason, body, header, header_format, header_media_url, footer, buttons, variables, variable_field_mapping, meta_template_id, created_at, updated_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ template }, { status: 201 });
}
