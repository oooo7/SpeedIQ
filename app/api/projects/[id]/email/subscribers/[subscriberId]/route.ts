import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; subscriberId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, subscriberId } = await params;
  if (!projectId || !subscriberId) {
    return NextResponse.json({ error: "Project ID and subscriber ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: subscriber, error } = await supabase
    .from("email_subscribers")
    .select("id, project_id, email, name, tags, source, status, subscribed_at, unsubscribed_at, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("id", subscriberId)
    .single();

  if (error || !subscriber) {
    return NextResponse.json({ error: "Subscriber not found" }, { status: 404 });
  }

  return NextResponse.json({ subscriber });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; subscriberId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, subscriberId } = await params;
  if (!projectId || !subscriberId) {
    return NextResponse.json({ error: "Project ID and subscriber ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.email !== undefined) {
    const email = (body.email as string).trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "email cannot be empty" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    updates.email = email;
  }
  if (body.name !== undefined) updates.name = body.name?.trim() ?? null;
  if (Array.isArray(body.tags)) updates.tags = body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean);
  if (body.source !== undefined) updates.source = body.source?.trim() ?? null;
  if (body.status !== undefined) {
    const status = body.status === "unsubscribed" ? "unsubscribed" : body.status === "bounced" ? "bounced" : "subscribed";
    updates.status = status;
    if (status === "unsubscribed") {
      updates.unsubscribed_at = new Date().toISOString();
    }
  }

  const { data: subscriber, error } = await supabase
    .from("email_subscribers")
    .update(updates)
    .eq("project_id", projectId)
    .eq("id", subscriberId)
    .select("id, project_id, email, name, tags, source, status, subscribed_at, unsubscribed_at, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A subscriber with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscriber });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; subscriberId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, subscriberId } = await params;
  if (!projectId || !subscriberId) {
    return NextResponse.json({ error: "Project ID and subscriber ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("email_subscribers")
    .delete()
    .eq("project_id", projectId)
    .eq("id", subscriberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
