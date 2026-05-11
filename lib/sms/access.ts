import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

type AccessSuccess = {
  ok: true;
  error: null;
  status: null;
  supabase: SupabaseClient;
  user: User;
  role: string;
};

type AccessFailure = {
  ok: false;
  error: string;
  status: 401 | 403;
  supabase: null;
  user: null;
  role: null;
};

export type ProjectAccessResult = AccessSuccess | AccessFailure;

export async function requireProjectAccess(
  projectId: string,
  options: { requireSmsEnabled?: boolean } = {}
): Promise<ProjectAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Unauthorized", status: 401, supabase: null, user: null, role: null };
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return { ok: false, error: "Forbidden", status: 403, supabase: null, user: null, role: null };
  }

  const requireSmsEnabled = options.requireSmsEnabled ?? true;
  if (requireSmsEnabled) {
    const { data: project } = await supabase
      .from("projects")
      .select("sms_channel_enabled")
      .eq("id", projectId)
      .maybeSingle();
    if (!project?.sms_channel_enabled) {
      return {
        ok: false,
        error: "SMS channel is not enabled for this project yet. Complete SMS setup in Settings first.",
        status: 403,
        supabase: null,
        user: null,
        role: null,
      };
    }
  }

  return { ok: true, supabase, user, role, error: null, status: null };
}
