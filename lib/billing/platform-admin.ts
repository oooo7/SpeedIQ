import { createAdminClient } from "@/lib/supabase/admin";

import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Comma-separated list of email addresses (case-insensitive) that should be
 * auto-promoted to platform_admin on first sign-in.
 *
 * Set PLATFORM_ADMIN_EMAILS in env; e.g. "neeraj@example.com,co@example.com".
 */
function getPlatformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Promote the given user to platform_admin if their email is in the bootstrap
 * env list. Idempotent and cheap: returns early on any short-circuit.
 *
 * Designed to be called from middleware / auth callback. Uses the user's
 * session client to check current state, and falls back to an admin client
 * for the actual UPDATE (the profiles row may have RLS restrictions even on
 * own row before the platform_admin flag is set).
 */
export async function bootstrapPlatformAdminIfNeeded(
  client: SupabaseClient,
  user: Pick<User, "id" | "email">,
): Promise<boolean> {
  const allowed = getPlatformAdminEmails();
  if (allowed.length === 0) return false;
  if (!user.email) return false;
  if (!allowed.includes(user.email.toLowerCase())) return false;

  const { data: profile } = await client
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_platform_admin) return false;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .upsert(
      { id: user.id, is_platform_admin: true },
      { onConflict: "id" },
    );

  if (error) {
    console.error("[platform-admin] failed to promote user", { userId: user.id, error });
    return false;
  }
  return true;
}
