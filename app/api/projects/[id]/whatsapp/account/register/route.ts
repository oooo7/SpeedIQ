import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { getWhatsAppAccountToken } from "@/lib/whatsapp/api";

const META_GRAPH_BASE = "https://graph.facebook.com";

/**
 * POST: Register the project's WhatsApp phone number for the Cloud API (fixes error 133010).
 * Body: { pin: string } — 6-digit PIN (0–9 only). Remember it for two-step verification.
 */
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

  const creds = await getWhatsAppAccountToken(supabase, projectId);
  if (!creds) {
    return NextResponse.json(
      { error: "WhatsApp isn't connected yet. Connect your number in WhatsApp settings first." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const pinRaw = typeof body?.pin === "string" ? body.pin.trim() : "";
  const pin = pinRaw.replace(/\D/g, "").slice(0, 6);
  if (pin.length !== 6) {
    return NextResponse.json(
      { error: "Please enter a 6-digit PIN (numbers only)." },
      { status: 400 }
    );
  }

  const url = `${META_GRAPH_BASE}/v22.0/${creds.phone_number_id}/register`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.access_token}`,
    },
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  const data = await res.json();

  if (!res.ok) {
    const code = data.error?.code;
    let msg = data.error?.message ?? "Something went wrong. Please try again.";
    if (code === 133005) msg = "That PIN doesn't match. Use the 6-digit PIN you set for this number, or try a new one if this is the first time.";
    if (code === 133015) msg = "Too many attempts. Please wait a few hours and try again.";
    const status = code === 133005 ? 400 : code === 133015 ? 429 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  await supabase.rpc("set_whatsapp_registration_completed", { p_project_id: projectId });

  return NextResponse.json({ success: true });
}
