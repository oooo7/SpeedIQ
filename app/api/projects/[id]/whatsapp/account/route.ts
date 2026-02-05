import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { fetchProjectById } from "@/lib/projects";

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

  const { data: account, error } = await supabase
    .from("whatsapp_accounts")
    .select("id, project_id, phone_number_id, waba_id, phone_number, display_name, quality_rating, tier, connection_type, token_expires_at, created_at, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    account: account
      ? {
          ...account,
          connected: true,
        }
      : { connected: false, project_id: projectId },
  });
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
  if (!role || (role !== "owner" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: project } = await fetchProjectById(supabase, projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const phone_number_id = body?.phone_number_id?.trim();
  const waba_id = body?.waba_id?.trim();
  const access_token = body?.access_token?.trim();
  const phone_number = body?.phone_number?.trim() ?? null;
  const display_name = body?.display_name?.trim() ?? null;
  const quality_rating = body?.quality_rating?.trim() ?? null;
  const tier = body?.tier?.trim() ?? null;

  if (!phone_number_id || !waba_id) {
    return NextResponse.json(
      { error: "phone_number_id and waba_id are required" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("whatsapp_accounts")
    .select("id, access_token")
    .eq("project_id", projectId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    project_id: projectId,
    phone_number_id,
    waba_id,
    phone_number: phone_number ?? undefined,
    display_name: display_name ?? undefined,
    quality_rating: quality_rating ?? undefined,
    tier: tier ?? undefined,
    connection_type: "manual",
    updated_at: new Date().toISOString(),
  };
  if (access_token) {
    payload.access_token = access_token;
  } else if (existing?.access_token) {
    payload.access_token = existing.access_token;
  } else {
    return NextResponse.json(
      { error: "access_token is required when connecting for the first time" },
      { status: 400 }
    );
  }

  const { data: account, error } = await supabase
    .from("whatsapp_accounts")
    .upsert(
      payload as Record<string, string>,
      { onConflict: "project_id", ignoreDuplicates: false }
    )
    .select("id, project_id, phone_number_id, waba_id, phone_number, display_name, quality_rating, tier, connection_type, token_expires_at, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    account: { ...account, connected: true },
  });
}
