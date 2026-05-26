import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTeamInviteEmail } from "@/lib/email/send-team-invite";
import { createProjectInvite, getProjectRole } from "@/lib/team";

const ROLES = ["admin", "editor", "viewer"] as const;

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
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const roleName = body?.role;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!ROLES.includes(roleName)) {
    return NextResponse.json({ error: "Invalid role. Must be admin, editor, or viewer." }, { status: 400 });
  }

  const { data, error } = await createProjectInvite(
    supabase,
    projectId,
    email,
    roleName,
    user.id
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const origin = request.headers.get("origin") ?? request.headers.get("x-forwarded-host") ?? "http://localhost:3000";
  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;
  const inviteUrl = `${baseUrl}/invite/${data.token}`;

  // Lookup project name + inviter name for the email; admin client because we
  // need fields the caller may not have RLS access to on every row.
  const admin = createAdminClient();
  const [{ data: project }, { data: inviter }] = await Promise.all([
    admin.from("projects").select("name").eq("id", projectId).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  // Best-effort send. We still return the invite_url even on failure so the
  // inviter can copy/share it manually.
  const emailResult = await sendTeamInviteEmail({
    to: email,
    inviteUrl,
    projectName: project?.name ?? "your project",
    inviterName: inviter?.full_name ?? null,
    role: roleName,
  });

  return NextResponse.json({
    id: data.id,
    token: data.token,
    expires_at: data.expires_at,
    invite_url: inviteUrl,
    email_sent: emailResult.success,
    email_error: emailResult.success ? undefined : emailResult.error,
  });
}
