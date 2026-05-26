import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface AdminContext {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Resolve the calling user and confirm they are a platform admin. Returns
 * either the context for downstream use or a NextResponse to return immediately.
 */
export async function requireAdmin(): Promise<
  { ok: true; ctx: AdminContext } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_platform_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, ctx: { user, supabase } };
}

/**
 * Check admin without forming a response — useful in Server Components.
 */
export async function isCallerPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();
  return Boolean(data?.is_platform_admin);
}

/**
 * Write to admin_audit_log via the security-definer RPC (which re-validates
 * the actor is still an admin).
 */
export async function writeAudit(args: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  notes?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_write_audit", {
    p_actor: args.actorId,
    p_action: args.action,
    p_target_type: args.targetType,
    p_target_id: args.targetId ?? null,
    p_before: args.before ?? null,
    p_after: args.after ?? null,
    p_notes: args.notes ?? null,
  });
  if (error) {
    console.error("[admin] writeAudit failed", { args, error });
  }
}
