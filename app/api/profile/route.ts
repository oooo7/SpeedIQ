import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { fetchProfile, updateProfile } from "@/lib/profiles";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await fetchProfile(supabase, user.id);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(data ?? {});
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const payload = {
    full_name: typeof body.full_name === "string" ? body.full_name : body.full_name === null ? null : undefined,
    phone: typeof body.phone === "string" ? body.phone : body.phone === null ? null : undefined,
    avatar_url: typeof body.avatar_url === "string" ? body.avatar_url : body.avatar_url === null ? null : undefined,
    company: typeof body.company === "string" ? body.company : body.company === null ? null : undefined,
  };

  const filtered = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  ) as { full_name?: string | null; phone?: string | null; avatar_url?: string | null; company?: string | null };

  const { data, error } = await updateProfile(supabase, user.id, filtered);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(data);
}
