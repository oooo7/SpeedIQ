import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { ACTIVE_PROJECT_COOKIE, ACTIVE_PROJECT_COOKIE_MAX_AGE } from "@/lib/projects/constants";
import { acceptInviteRpc, getInviteByToken } from "@/lib/team";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient();
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const { data, error } = await getInviteByToken(supabase, token);

  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "Invite not found or expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    project_name: data.project_name,
    inviter_name: data.inviter_name,
    email: data.email,
    role: data.role,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const { data, error } = await acceptInviteRpc(supabase, token);

  if (error || !data) {
    return NextResponse.json(
      { error: error ?? "Failed to accept invite" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    success: true,
    project_id: data.project_id,
  });

  response.cookies.set(ACTIVE_PROJECT_COOKIE, data.project_id, {
    path: "/",
    sameSite: "lax",
    maxAge: ACTIVE_PROJECT_COOKIE_MAX_AGE,
  });

  return response;
}
