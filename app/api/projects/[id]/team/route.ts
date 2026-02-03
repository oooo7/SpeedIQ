import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectInvites, getProjectMembers, getProjectRole } from "@/lib/team";

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

  const [membersResult, invitesResult] = await Promise.all([
    getProjectMembers(supabase, projectId),
    getProjectInvites(supabase, projectId),
  ]);

  if (membersResult.error) {
    return NextResponse.json({ error: membersResult.error }, { status: 500 });
  }
  if (invitesResult.error) {
    return NextResponse.json({ error: invitesResult.error }, { status: 500 });
  }

  return NextResponse.json({
    members: membersResult.data ?? [],
    invites: invitesResult.data ?? [],
    role,
  });
}
