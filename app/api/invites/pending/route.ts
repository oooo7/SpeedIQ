import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getMyPendingInvites } from "@/lib/team";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getMyPendingInvites(supabase);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ invites: data ?? [] });
}
