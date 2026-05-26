import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { declineInviteRpc } from "@/lib/team";

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

  const { data, error } = await declineInviteRpc(supabase, token);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({ success: true, removed: data ?? false });
}
