import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCannedMessageBucket } from "@/lib/supabase/canned-messages-storage";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

const BUCKET = "canned-message-attachments";
const EXPIRY = 3600; // 1 hour

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const path = body?.path?.trim();
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  if (!path.startsWith(projectId + "/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    await ensureCannedMessageBucket(admin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to ensure storage bucket" },
      { status: 500 }
    );
  }
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, EXPIRY);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
