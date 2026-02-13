import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ensureCannedMessageBucket } from "@/lib/supabase/canned-messages-storage";
import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

const BUCKET = "canned-message-attachments";
const PREFIX = "whatsapp-settings";
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

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
  if (!role || (role !== "owner" && role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "multipart/form-data required" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const safeName = `${projectId}/${PREFIX}/${crypto.randomUUID()}${ext}`;

  const admin = createAdminClient();
  try {
    await ensureCannedMessageBucket(admin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to ensure storage bucket" },
      { status: 500 }
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());

  const { data, error } = await admin.storage
    .from(BUCKET)
    .upload(safeName, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    path: data.path,
    filename: file.name,
  });
}
