import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-only operations (e.g. webhooks) where there is no user session.
 * Bypasses RLS. Use only in trusted server code; never expose to the client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey);
}
