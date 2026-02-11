import type { SupabaseClient } from "@supabase/supabase-js";

export const CANNED_MESSAGE_BUCKET = "canned-message-attachments";

/**
 * Ensures the canned message attachments bucket exists. Call before upload or signed URL.
 * Creates the bucket if it doesn't exist (e.g. "Bucket not found").
 */
export async function ensureCannedMessageBucket(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.storage.createBucket(CANNED_MESSAGE_BUCKET, {
    public: false,
    fileSizeLimit: 52428800, // 50MB
  });
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("bucket already")) {
      return;
    }
    throw error;
  }
}
