import { NextResponse } from "next/server";
import twilio from "twilio";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTwilioWebhookSignature } from "@/lib/sms/webhook-signature";
import { normalizeSmsPhone } from "@/lib/sms/phone";

type WorkingHoursDay = { enabled: boolean; from?: string; to?: string };
type WorkingHoursMap = Record<string, WorkingHoursDay>;

function isWithinWorkingHours(timezone: string, workingHours: WorkingHoursMap): boolean {
  if (!timezone || typeof workingHours !== "object" || Object.keys(workingHours).length === 0) {
    return true;
  }
  try {
    const dayName = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" })
      .format(new Date())
      .toLowerCase();
    const day = workingHours[dayName];
    if (!day || !day.enabled || !day.from || !day.to) return false;
    const hhmm = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date())
      .replace(/\D/g, "")
      .slice(0, 4)
      .padStart(4, "0");
    const from = day.from.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    const to = day.to.replace(/\D/g, "").slice(0, 4).padStart(4, "0");
    return hhmm >= from && hhmm <= to;
  } catch {
    return true;
  }
}

function xmlResponse(message?: string) {
  const twiml = new twilio.twiml.MessagingResponse();
  if (message?.trim()) twiml.message(message.trim());
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const form: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    form[key] = String(value);
  }

  const signature = request.headers.get("x-twilio-signature");
  if (
    process.env.NODE_ENV === "production" &&
    !isValidTwilioWebhookSignature({
      url: request.url,
      signature,
      form,
    })
  ) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 403 });
  }

  const to = normalizeSmsPhone(form.To || "");
  const from = normalizeSmsPhone(form.From || "");
  const body = (form.Body || "").trim();
  const optOutType = (form.OptOutType || "").trim().toUpperCase();
  const messageSid = form.MessageSid || form.SmsMessageSid || form.SmsSid || null;
  const numSegments = Number.parseInt(form.NumSegments || "0", 10) || null;
  const numMedia = Number.parseInt(form.NumMedia || "0", 10) || 0;

  if (!to || !from) return xmlResponse();

  const supabase = createAdminClient();
  const { data: projectByNumber } = await supabase
    .from("sms_numbers")
    .select("project_id")
    .eq("phone_number_e164", to)
    .maybeSingle();
  if (!projectByNumber?.project_id) return xmlResponse();

  const projectId = projectByNumber.project_id;
  console.info("[sms-webhook-inbound] received", {
    project_id: projectId,
    to,
    from,
    message_sid: messageSid,
    opt_out_type: optOutType || null,
  });
  const [{ data: existingContact }, { data: settings }] = await Promise.all([
    supabase
      .from("sms_contacts")
      .select("id,name,opt_out")
      .eq("project_id", projectId)
      .eq("phone", from)
      .maybeSingle(),
    supabase
      .from("sms_account_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  let contactId = existingContact?.id;
  if (!contactId) {
    const { data: created } = await supabase
      .from("sms_contacts")
      .insert({
        project_id: projectId,
        phone: from,
        source: "inbound",
        consent_status: "unknown",
        consent_updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    contactId = created?.id;
  } else {
    await supabase
      .from("sms_contacts")
      .update({
        last_inbound_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId);
  }
  if (!contactId) return xmlResponse();

  await Promise.all([
    supabase.from("sms_messages").upsert(
      {
        project_id: projectId,
        contact_id: contactId,
        direction: "in",
        from_number: from,
        to_number: to,
        body,
        num_segments: numSegments,
        num_media: numMedia,
        twilio_message_sid: messageSid,
        status: "received",
        provider_payload: form,
      },
      { onConflict: "twilio_message_sid" }
    ),
    supabase.from("sms_conversations").upsert(
      {
        project_id: projectId,
        contact_id: contactId,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,contact_id", ignoreDuplicates: false }
    ),
  ]);

  const { data: conv } = await supabase
    .from("sms_conversations")
    .select("id, unread_count")
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .maybeSingle();
  if (conv?.id) {
    await supabase
      .from("sms_conversations")
      .update({ unread_count: (conv.unread_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", conv.id);
  }

  if (optOutType === "STOP") {
    await supabase
      .from("sms_contacts")
      .update({ opt_out: true, consent_status: "unsubscribed", consent_updated_at: new Date().toISOString() })
      .eq("id", contactId);
    return xmlResponse();
  }
  if (optOutType === "START") {
    await supabase
      .from("sms_contacts")
      .update({ opt_out: false, consent_status: "subscribed", consent_updated_at: new Date().toISOString() })
      .eq("id", contactId);
    return xmlResponse();
  }
  if (optOutType === "HELP") {
    return xmlResponse();
  }

  if (!settings) return xmlResponse();

  const normalizedBody = body.toLowerCase();
  const helpKeywords = Array.isArray(settings.help_keywords) ? settings.help_keywords.map((k: unknown) => String(k).toLowerCase()) : [];
  if (settings.help_response_enabled && helpKeywords.includes(normalizedBody) && settings.help_response_text) {
    return xmlResponse(settings.help_response_text);
  }

  const { count: inboundCount } = await supabase
    .from("sms_messages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("contact_id", contactId)
    .eq("direction", "in");
  const firstInbound = (inboundCount ?? 0) <= 1;
  if (firstInbound && settings.welcome_message_enabled && settings.welcome_message_text) {
    const withinHours = isWithinWorkingHours(settings.timezone ?? "UTC", (settings.working_hours ?? {}) as WorkingHoursMap);
    if (withinHours) {
      return xmlResponse(settings.welcome_message_text);
    }
    if (!withinHours && settings.off_hours_message_enabled && settings.off_hours_message_text) {
      return xmlResponse(settings.off_hours_message_text);
    }
  }

  return xmlResponse();
}
