import { bootstrapPlatformAdminIfNeeded } from "@/lib/billing/platform-admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth callback (e.g. Google). Exchanging the code for a session must happen
 * in a Route Handler so the session cookies are set on the redirect response.
 * Using a page + redirect() can lose cookies and send the user back to login.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/projects";

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/login?error=no_code", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_error", request.url),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User fetch after exchange:", userError);
    return NextResponse.redirect(
      new URL("/auth/login?error=session_missing", request.url),
    );
  }

  // Auto-promote to platform_admin if the user's email is in the bootstrap list.
  await bootstrapPlatformAdminIfNeeded(supabase, user);

  // Only allow relative paths to avoid open redirects
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/projects";
  const url = new URL(safeNext, request.url);
  return NextResponse.redirect(url);
}
