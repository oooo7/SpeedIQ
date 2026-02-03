import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { revokeInvite } from "@/lib/team";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, inviteId } = await params;
  if (!projectId || !inviteId) {
    return NextResponse.json({ error: "Project ID and invite ID are required" }, { status: 400 });
  }

  const { error } = await revokeInvite(supabase, inviteId, projectId, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: error === "Forbidden" ? 403 : 500 });
  }

  return NextResponse.json({ success: true });
}
