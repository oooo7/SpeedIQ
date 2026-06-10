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
  const { error } = await supabase.storage.createBucket(WHATSAPP_MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: 104857600, // 100MB — WhatsApp's max for documents/video
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
