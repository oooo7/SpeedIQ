import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Private bucket holding media (images, voice notes, video, documents, stickers)
 * downloaded from inbound WhatsApp messages. Never public — served to the UI
 * through the authenticated media proxy route, mirroring the canned-message
 * attachments pattern.
 */
export const WHATSAPP_MEDIA_BUCKET = "whatsapp-media";

/**
 * Ensures the whatsapp-media bucket exists. Call before upload/download.
 * Creates the bucket if it doesn't exist (e.g. "Bucket not found").
 */
export async function ensureWhatsAppMediaBucket(supabase: SupabaseClient): Promise<void> {
  // NOTE: a bucket's file_size_limit cannot exceed the project's GLOBAL upload
  // limit (50MB by default). Requesting 100MB here made createBucket fail every
  // time — the bucket was never created and inbound media silently vanished.
  // 50MB matches the known-good canned-message-attachments bucket and covers all
  // WhatsApp media (images ≤5MB, audio/video/docs ≤16MB). To allow larger files,
  // raise the project's global limit in Supabase → Settings → Storage first, then
  // bump this value to match.
  const { error } = await supabase.storage.createBucket(WHATSAPP_MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: 52428800, // 50MB — must stay within the project's global limit
  });
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("already exists") || msg.includes("duplicate") || msg.includes("bucket already")) {
      return;
    }
    throw error;
  }
}

/**
 * Best-effort file extension for a WhatsApp media mime type, used only to make
 * stored object keys readable (the mime type is the source of truth).
 */
export function extensionForMime(mime: string | null | undefined): string {
  const m = (mime ?? "").split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
  };
  return map[m] ?? "bin";
}

/**
 * Storage object key for a WhatsApp media file, namespaced by project + contact.
 */
export function buildWhatsAppMediaPath(
  projectId: string,
  contactId: string,
  mediaId: string,
  mime: string | null | undefined
): string {
  return `${projectId}/${contactId}/${mediaId}.${extensionForMime(mime)}`;
}
