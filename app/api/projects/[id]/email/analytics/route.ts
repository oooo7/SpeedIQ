import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";

export async function GET(
  _request: Request,
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

  const { count: subscribersCount } = await supabase
    .from("email_subscribers")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "subscribed");

  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("id, status")
    .eq("project_id", projectId);

  const campaignIds = (campaigns ?? []).map((c: { id: string }) => c.id);
  let emailsSent = 0;
  let emailsFailed = 0;

  if (campaignIds.length > 0) {
    const { data: recStats } = await supabase
      .from("email_campaign_recipients")
      .select("status")
      .in("campaign_id", campaignIds);
    for (const r of recStats ?? []) {
      if (r.status === "sent" || r.status === "bounced") emailsSent++;
      if (r.status === "failed") emailsFailed++;
    }
  }

  const campaignsCompleted = (campaigns ?? []).filter((c: { status: string }) => c.status === "completed").length;
  const totalSent = emailsSent + emailsFailed;
  const deliveryRate = totalSent > 0 ? Math.round((emailsSent / totalSent) * 100) : 0;

  return NextResponse.json({
    overview: {
      total_subscribers: subscribersCount ?? 0,
      total_campaigns: campaigns?.length ?? 0,
      campaigns_completed: campaignsCompleted,
      emails_sent: emailsSent,
      emails_delivered: emailsSent,
      emails_failed: emailsFailed,
      delivery_rate: deliveryRate,
    },
  });
}
