import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_FALLBACK_DOMAIN =
  process.env.EMAIL_FALLBACK_DOMAIN ?? "send.habiv.com";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "notifications@resend.dev";

export interface ProjectEmailSettingsForSend {
  from_email: string | null;
  domain_verified: boolean;
  fallback_local_part: string | null;
  use_custom_from: boolean;
}

/**
 * Load project email settings for sending. Platform-owned only (no user credentials).
 * Uses admin client so it works without a user session.
 */
export async function getProjectEmailSettingsForSend(
  projectId: string,
  projectName?: string | null
): Promise<ProjectEmailSettingsForSend | null> {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("project_email_settings")
    .select("from_email, domain_verified, fallback_local_part, use_custom_from")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error || !row) return null;

  return {
    from_email: row.from_email ?? null,
    domain_verified: !!row.domain_verified,
    fallback_local_part: row.fallback_local_part?.trim() || null,
    use_custom_from: !!row.use_custom_from,
  };
}

/**
 * Get the effective from address for a project.
 * 1. Custom from_email if use_custom_from and domain verified.
 * 2. User-chosen fallback: {fallback_local_part}@{EMAIL_FALLBACK_DOMAIN}.
 * 3. Auto slug: {projectId}@{EMAIL_FALLBACK_DOMAIN}.
 */
export function getEffectiveFromAddress(
  settings: ProjectEmailSettingsForSend | null,
  projectId: string,
  projectName?: string | null
): string {
  if (settings?.use_custom_from && settings?.from_email?.trim() && settings.domain_verified) {
    return settings.from_email.trim();
  }
  if (settings?.fallback_local_part?.trim()) {
    return `${settings.fallback_local_part.trim()}@${EMAIL_FALLBACK_DOMAIN}`;
  }
  const slug = projectId.replace(/-/g, "").slice(0, 8).toLowerCase();
  return `${slug}@${EMAIL_FALLBACK_DOMAIN}`;
}
