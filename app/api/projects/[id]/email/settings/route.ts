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

  const { data: row, error } = await supabase
    .from("project_email_settings")
    .select("from_email, domain_verified, resend_domain_id, fallback_local_part, use_custom_from")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const verification_status =
    !row?.from_email || !row?.resend_domain_id
      ? "none"
      : row.domain_verified
        ? "verified"
        : "pending";

  const fallback_domain =
    process.env.EMAIL_FALLBACK_DOMAIN ?? "send.habiv.com";

  return NextResponse.json({
    fallback_domain,
    settings: row
      ? {
          from_email: row.from_email ?? "",
          domain_verified: !!row.domain_verified,
          verification_status,
          resend_domain_id: row.resend_domain_id ?? null,
          fallback_local_part: row.fallback_local_part ?? "",
          use_custom_from: !!row.use_custom_from,
        }
      : {
          from_email: "",
          domain_verified: false,
          verification_status: "none" as const,
          resend_domain_id: null,
          fallback_local_part: "",
          use_custom_from: false,
        },
  });
}

export async function PUT(
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
  const from_email = typeof body.from_email === "string" ? body.from_email.trim() || null : null;
  const use_custom_from = body.use_custom_from === true || body.use_custom_from === "true";

  // Reject obviously malformed addresses. We can't block free providers from
  // server-side regex alone, but we can catch typos before talking to Resend.
  if (from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from_email)) {
    return NextResponse.json(
      { error: "From email is not a valid address" },
      { status: 400 }
    );
  }

  let fallback_local_part: string | null = null;
  if (typeof body.fallback_local_part === "string") {
    const raw = body.fallback_local_part.trim().toLowerCase();
    if (raw.length > 0) {
      if (!/^[a-z0-9._-]+$/.test(raw) || raw.length > 64) {
        return NextResponse.json(
          { error: "Fallback address can only use letters, numbers, dots, hyphens, and underscores (max 64 characters)" },
          { status: 400 }
        );
      }
      fallback_local_part = raw;
    }
  }

  const payload: Record<string, unknown> = {
    project_id: projectId,
    from_email,
    fallback_local_part,
    use_custom_from,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("project_email_settings")
    .select("id, from_email")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing) {
    if (from_email !== (existing.from_email ?? null)) {
      payload.domain_verified = false;
      payload.resend_domain_id = null;
    }
    const { error: updateError } = await supabase
      .from("project_email_settings")
      .update(payload)
      .eq("project_id", projectId);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    payload.domain_verified = false;
    payload.resend_domain_id = null;
    const { error: insertError } = await supabase.from("project_email_settings").insert(payload);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
