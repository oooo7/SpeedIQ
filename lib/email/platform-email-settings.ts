import { createAdminClient } from "@/lib/supabase/admin";

export interface PlatformEmailSettings {
  platformName: string;
  physicalAddress: string | null;
  supportEmail: string | null;
}

/**
 * Read email-related fields from platform_settings (platform_name,
 * sender_physical_address, support_email) in one round trip.
 * Used by the CAN-SPAM footer + transactional email senders.
 */
export async function getPlatformEmailSettings(): Promise<PlatformEmailSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["platform_name", "sender_physical_address", "support_email"]);

  const map = new Map<string, unknown>();
  for (const row of data ?? []) map.set(row.key as string, row.value);

  const platformName = readString(map.get("platform_name")) ?? "SpeedIQ";
  const physicalAddress = readString(map.get("sender_physical_address"));
  const supportEmail = readString(map.get("support_email"));

  return { platformName, physicalAddress, supportEmail };
}

function readString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}
