import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { WHATSAPP_MEDIA_BUCKET } from "@/lib/supabase/whatsapp-media-storage";
import { getProjectRole } from "@/lib/team";

/**
 * Authenticated media proxy for WhatsApp chat. The message's media lives in a
 * private storage bucket; the UI points <img>/<audio>/<video>/<a> at this
 * stable per-message URL. We check project membership, then stream the stored
 * bytes back with the right Content-Type. The URL is stable across chat polls
 * so the browser caches it and doesn't re-download on every refresh.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, messageId } = await params;
  if (!projectId || !messageId) {
    return NextResponse.json({ error: "Project ID and message ID are required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: message } = await supabase
    .from("whatsapp_messages")
    .select("id, media_path, mime_type, media_filename")
    .eq("project_id", projectId)
    .eq("id", messageId)
    .maybeSingle();

  if (!message?.media_path) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Service-role client can read the private bucket regardless of storage RLS.
  const admin = createAdminClient();
  const { data: blob, error } = await admin.storage
    .from(WHATSAPP_MEDIA_BUCKET)
    .download(message.media_path);

  if (error || !blob) {
    return NextResponse.json({ error: "Media unavailable" }, { status: 404 });
  }

  const mime = message.mime_type ?? blob.type ?? "application/octet-stream";
  const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
  const filename = message.media_filename ?? `${message.id}`;
  const disposition = wantsDownload
    ? `attachment; filename="${filename.replace(/"/g, "")}"`
    : "inline";

  return new NextResponse(blob.stream(), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      // Private + immutable: media for a given message id never changes.
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
