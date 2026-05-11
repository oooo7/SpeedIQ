import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendSmsForProject } from "@/lib/sms/client";
import { renderSmsTemplate } from "@/lib/sms/template";
import { requireProjectAccess } from "@/lib/sms/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const { id: projectId, campaignId } = await params;
  const access = await requireProjectAccess(projectId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

  const body = await request.json().catch(() => ({}));
  const contactId = String(body?.contact_id ?? "");
  if (!contactId) return NextResponse.json({ error: "contact_id is required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: campaign } = await supabase
    .from("sms_campaigns")
    .select("id, project_id, template_id")
    .eq("project_id", projectId)
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign?.template_id) return NextResponse.json({ error: "Campaign or template not found" }, { status: 404 });

  const [{ data: template }, { data: contact }] = await Promise.all([
    supabase.from("sms_templates").select("body").eq("id", campaign.template_id).maybeSingle(),
    supabase.from("sms_contacts").select("id,phone,name,email,opt_out,consent_status").eq("project_id", projectId).eq("id", contactId).maybeSingle(),
  ]);
  if (!template?.body || !contact) return NextResponse.json({ error: "Template or contact not found" }, { status: 404 });
  if (contact.opt_out) return NextResponse.json({ error: "Contact is opted out." }, { status: 400 });
  if (contact.consent_status !== "subscribed") {
    return NextResponse.json({ error: "Contact is not consented for SMS marketing." }, { status: 400 });
  }

  const message = renderSmsTemplate(template.body, {
    name: contact.name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
  });

  const result = await sendSmsForProject(supabase, projectId, {
    to: contact.phone,
    body: message,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 400 });
  }

  await Promise.all([
    supabase
      .from("sms_campaign_recipients")
      .upsert(
        {
          campaign_id: campaignId,
          contact_id: contactId,
          status: result.status === "delivered" ? "delivered" : "sent",
          sent_at: new Date().toISOString(),
          twilio_message_sid: result.sid,
          error_code: null,
          error_message: null,
        },
        { onConflict: "campaign_id,contact_id" }
      ),
    supabase.from("sms_messages").insert({
      project_id: projectId,
      contact_id: contactId,
      campaign_id: campaignId,
      direction: "out",
      from_number: null,
      to_number: contact.phone,
      body: message,
      twilio_message_sid: result.sid,
      status: result.status ?? "sent",
      provider_payload: {},
    }),
    supabase.from("sms_conversations").upsert(
      {
        project_id: projectId,
        contact_id: contactId,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,contact_id" }
    ),
  ]);

  return NextResponse.json({ success: true, sid: result.sid, status: result.status });
}
