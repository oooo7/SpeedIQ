import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ensureWhatsAppMediaBucket,
  extensionForMime,
  WHATSAPP_MEDIA_BUCKET,
} from "@/lib/supabase/whatsapp-media-storage";
import { getProjectRole } from "@/lib/team";
import {
  getWhatsAppAccountToken,
  isWithin24hWindow,
  sendMediaMessage,
  type MediaMessageType,
} from "@/lib/whatsapp/api";

// Meta lets a media `link` URL stay reachable; an hour is ample for its fetch.
const SIGNED_URL_EXPIRY = 3600;
const MAX_BYTES = 100 * 1024 * 1024; // 100MB — WhatsApp's hard cap for documents/video

function mediaTypeForMime(mime: string): MediaMessageType {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  return "document";
}

/**
 * Send a media message (image / video / audio / document) from the live chat.
 * Accepts multipart/form-data with `file` and optional `caption`. The file is
 * stored in the private whatsapp-media bucket, signed for Meta to fetch, sent
 * via the Cloud API, then recorded in whatsapp_messages so it renders in-thread
 * exactly like inbound media (through the authenticated media proxy).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, contactId } = await params;
  if (!projectId || !contactId) {
    return NextResponse.json({ error: "Project ID and contact ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role || (role !== "owner" && role !== "admin" && role !== "editor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
  }
  const captionRaw = form.get("caption");
  const caption = typeof captionRaw === "string" ? captionRaw.trim() || null : null;

  const { data: contact } = await supabase
    .from("whatsapp_contacts")
    .select("id, phone, last_inbound_at")
    .eq("project_id", projectId)
    .eq("id", contactId)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Free-form media (like text) is only allowed inside the 24h service window.
  if (!isWithin24hWindow(contact.last_inbound_at)) {
    return NextResponse.json(
      { error: "Outside 24h window. Send a template message only.", within_24h: false },
      { status: 400 }
    );
  }

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json({ error: "WhatsApp account not connected" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const metaType = mediaTypeForMime(mime);
  const filename = file.name || `file.${extensionForMime(mime)}`;

  // Upload to the private bucket, then sign so Meta can fetch it once.
  const admin = createAdminClient();
  try {
    await ensureWhatsAppMediaBucket(admin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Storage unavailable" },
      { status: 500 }
    );
  }
  const path = `${projectId}/${contactId}/out-${crypto.randomUUID()}.${extensionForMime(mime)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(WHATSAPP_MEDIA_BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const { data: signed } = await admin.storage
    .from(WHATSAPP_MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (!signed?.signedUrl) {
    await admin.storage.from(WHATSAPP_MEDIA_BUCKET).remove([path]);
    return NextResponse.json({ error: "Could not prepare media for sending" }, { status: 500 });
  }

  const result = await sendMediaMessage(
    creds.access_token,
    creds.phone_number_id,
    contact.phone,
    metaType,
    signed.signedUrl,
    {
      caption: caption ?? undefined,
      filename: metaType === "document" ? filename : undefined,
    }
  );

  if ("error" in result) {
    const code = result.error.code;
    const windowExpired = code === 131047 || String(code).includes("131047");
    // The upload is now orphaned — best-effort cleanup.
    await admin.storage.from(WHATSAPP_MEDIA_BUCKET).remove([path]);
    return NextResponse.json(
      { error: result.error.message, ...(windowExpired ? { within_24h: false } : {}) },
      { status: 400 }
    );
  }

  const { data: msg, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      project_id: projectId,
      contact_id: contactId,
      direction: "out",
      type: metaType,
      body: caption,
      media_path: path,
      mime_type: mime,
      media_filename: metaType === "document" ? filename : null,
      meta_message_id: result.message_id,
      status: "sent",
    })
    .select("id, direction, type, body, mime_type, media_filename, status, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabase
    .from("whatsapp_conversations")
    .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("contact_id", contactId);

  return NextResponse.json({
    message: {
      ...msg,
      media_url: `/api/projects/${projectId}/whatsapp/media/${msg.id}`,
    },
  });
}
