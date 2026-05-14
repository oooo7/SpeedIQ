import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export const dynamic = "force-dynamic";

/**
 * Returns analytics + recent send log for a single template.
 *
 * - Counts of sent / delivered / read / failed across all time
 * - Last 50 sends with contact name/phone, status, error details, timestamp
 * - Flags whether the most recent failures match Meta's marketing per-user cap
 *   (error 131049) so the UI can show a targeted explainer.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; templateId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId, templateId } = await params;
  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Recent sends — last 50, newest first.
  const { data: messages, error: messagesError } = await supabase
    .from("whatsapp_messages")
    .select("id, contact_id, status, error_code, error_title, body, meta_message_id, created_at")
    .eq("project_id", projectId)
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const list = messages ?? [];
  const contactIds = [...new Set(list.map((m) => m.contact_id))];
  let contactsMap: Record<string, { phone: string | null; name: string | null }> = {};
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from("whatsapp_contacts")
      .select("id, phone, name")
      .in("id", contactIds);
    contactsMap = Object.fromEntries(
      (contacts ?? []).map((c) => [c.id, { phone: c.phone, name: c.name }])
    );
  }

  // All-time counts per status (cheap aggregate via head:true).
  const [sentRes, deliveredRes, readRes, failedRes] = await Promise.all([
    supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("template_id", templateId)
      .eq("status", "sent"),
    supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("template_id", templateId)
      .eq("status", "delivered"),
    supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("template_id", templateId)
      .eq("status", "read"),
    supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("template_id", templateId)
      .eq("status", "failed"),
  ]);

  const stats = {
    sent: sentRes.count ?? 0,
    delivered: deliveredRes.count ?? 0,
    read: readRes.count ?? 0,
    failed: failedRes.count ?? 0,
  };
  stats.sent += stats.delivered + stats.read; // "sent" rolls up later statuses too
  const total = (sentRes.count ?? 0) + stats.delivered + stats.read + stats.failed;

  // Detect Meta marketing per-user cap (error 131049) in recent failures.
  // If a healthy chunk of recent failures are this code, hint the user.
  const recentFailures = list.filter((m) => m.status === "failed");
  const marketingCapFailures = recentFailures.filter(
    (m) =>
      m.error_code === "131049" ||
      m.error_code === "131026" ||
      (m.error_title ?? "").toLowerCase().includes("healthy ecosystem")
  );
  const hasMarketingCap =
    recentFailures.length > 0 && marketingCapFailures.length / recentFailures.length >= 0.5;

  const logs = list.map((m) => ({
    id: m.id,
    contact_id: m.contact_id,
    contact_name: contactsMap[m.contact_id]?.name ?? null,
    phone: contactsMap[m.contact_id]?.phone ?? null,
    status: m.status,
    error_code: m.error_code ?? null,
    error_title: m.error_title ?? null,
    meta_message_id: m.meta_message_id ?? null,
    created_at: m.created_at,
  }));

  return NextResponse.json({
    stats: { ...stats, total },
    logs,
    flags: { hasMarketingCap },
  });
}
