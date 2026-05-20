import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface PasswordBody {
  current_password?: string;
  new_password?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PasswordBody | null;
  const current = body?.current_password ?? "";
  const next = body?.new_password ?? "";

  if (next.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  // Verify the current password by attempting a sign-in. This is the supported
  // Supabase pattern — there's no API to validate against the stored hash directly.
  if (!user.email) {
    return NextResponse.json({ error: "Account has no email" }, { status: 400 });
  }
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signInError) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
