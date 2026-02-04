import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function GET(
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

  const { count: contactsCount } = await supabase
    .from("whatsapp_contacts")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data: campaigns } = await supabase
    .from("whatsapp_campaigns")
    .select("id, status")
    .eq("project_id", projectId);

  const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);
  let totalSent = 0;
  let totalDelivered = 0;
  let totalFailed = 0;

  if (campaignIds.length > 0) {
    const { data: recStats } = await supabase
      .from("whatsapp_campaign_recipients")
      .select("status")
      .in("campaign_id", campaignIds);
    for (const r of recStats ?? []) {
      if (r.status === "sent" || r.status === "delivered" || r.status === "read") totalSent++;
      if (r.status === "delivered" || r.status === "read") totalDelivered++;
      if (r.status === "failed") totalFailed++;
    }
  }

  const completed = (campaigns ?? []).filter((c: { status: string }) => c.status === "completed").length;

  return NextResponse.json({
    overview: {
      total_contacts: contactsCount ?? 0,
      total_campaigns: campaigns?.length ?? 0,
      campaigns_completed: completed,
      messages_sent: totalSent,
      messages_delivered: totalDelivered,
      messages_failed: totalFailed,
      delivery_rate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
    },
  });
}
