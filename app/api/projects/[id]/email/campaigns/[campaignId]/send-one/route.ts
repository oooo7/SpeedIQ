import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProjectRole } from "@/lib/team";
import { sendEmailForProject } from "@/lib/email/client";
import { renderEmailBody, buildSubscriberVariables } from "@/lib/email/template";
import { getUnsubscribeUrl } from "@/lib/email/unsubscribe";

/**
 * Send the campaign email to a single recipient immediately.
 * POST body: { subscriber_id: string }
 * Returns { success: boolean, error?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, campaignId } = await params;
  if (!projectId || !campaignId) {
    return NextResponse.json({ error: "Project and campaign required" }, { status: 400 });
  }

  const role = await getProjectRole(supabase, projectId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const subscriber_id = typeof body.subscriber_id === "string" ? body.subscriber_id.trim() : null;
  if (!subscriber_id) {
    return NextResponse.json({ error: "subscriber_id is required" }, { status: 400 });
  }

  const { data: campaign, error: campError } = await supabase
    .from("email_campaigns")
    .select("id, project_id, template_id, status")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (!campaign.template_id) {
    return NextResponse.json({ success: false, error: "Campaign has no template" }, { status: 400 });
  }
  const sendableStatuses = ["draft", "sending", "completed", "failed"];
  if (!sendableStatuses.includes(campaign.status)) {
    return NextResponse.json({ success: false, error: "Campaign is not in a sendable state" }, { status: 400 });
  }

  const { data: recipient, error: recError } = await supabase
    .from("email_campaign_recipients")
    .select("id, subscriber_id, status")
    .eq("campaign_id", campaignId)
    .eq("subscriber_id", subscriber_id)
    .maybeSingle();

  if (recError || !recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  // Already sent → idempotent, don't send again
  if (recipient.status === "sent") {
    return NextResponse.json({ success: true });
  }

  const { data: template } = await supabase
    .from("email_templates")
    .select("subject, body_html, body_text")
    .eq("id", campaign.template_id)
    .single();

  if (!template?.subject) {
    return NextResponse.json({ success: false, error: "Template not found or has no subject" }, { status: 400 });
  }

  const { data: subscriber } = await supabase
    .from("email_subscribers")
    .select("email, name, status")
    .eq("id", subscriber_id)
    .single();

  if (!subscriber?.email) {
    await supabase
      .from("email_campaign_recipients")
      .update({ status: "failed", error_message: "no_email" })
      .eq("id", recipient.id);
    return NextResponse.json({ success: false, error: "Subscriber has no email" }, { status: 400 });
  }

  if (subscriber.status === "unsubscribed" || subscriber.status === "bounced") {
    await supabase
      .from("email_campaign_recipients")
      .update({ status: "failed", error_message: subscriber.status })
      .eq("id", recipient.id);
    await markCampaignDoneIfNoPending(supabase, campaignId);
    return NextResponse.json({ success: false, error: `Subscriber has ${subscriber.status}` }, { status: 400 });
  }

  const unsubscribeUrl = getUnsubscribeUrl(campaign.project_id, subscriber_id);
  const variables = buildSubscriberVariables(subscriber.name ?? null, subscriber.email, unsubscribeUrl);
  const html = renderEmailBody(template.body_html ?? "", variables);
  const subject = renderEmailBody(template.subject, variables);
  const text = template.body_text ? renderEmailBody(template.body_text, variables) : undefined;

  const result = await sendEmailForProject(campaign.project_id, {
    to: subscriber.email,
    subject,
    html,
    text,
  });

  const now = new Date().toISOString();
  if (result.success) {
    await supabase
      .from("email_campaign_recipients")
      .update({ status: "sent", sent_at: now, error_message: null })
      .eq("id", recipient.id);
    await markCampaignDoneIfNoPending(supabase, campaignId);
    return NextResponse.json({ success: true });
  }
  const errMsg = (result.error ?? "Send failed").slice(0, 500);
  await supabase
    .from("email_campaign_recipients")
    .update({ status: "failed", error_message: errMsg })
    .eq("id", recipient.id);
  await markCampaignDoneIfNoPending(supabase, campaignId);
  return NextResponse.json({ success: false, error: errMsg }, { status: 200 });
}

async function markCampaignDoneIfNoPending(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  campaignId: string
) {
  const { count: pendingCount } = await supabase
    .from("email_campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  if ((pendingCount ?? 0) > 0) return;
  const [{ count: sentCount }, { count: failedCount }] = await Promise.all([
    supabase.from("email_campaign_recipients").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId).eq("status", "sent"),
    supabase.from("email_campaign_recipients").select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId).eq("status", "failed"),
  ]);
  // "failed" only when every recipient failed — otherwise "completed" (some may have failed)
  const finalStatus = (sentCount ?? 0) === 0 && (failedCount ?? 0) > 0 ? "failed" : "completed";
  const now = new Date().toISOString();
  await supabase
    .from("email_campaigns")
    .update({ status: finalStatus, completed_at: now, updated_at: now })
    .eq("id", campaignId);
}
