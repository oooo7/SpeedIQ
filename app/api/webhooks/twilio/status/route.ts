import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { recipientStatusFromMessageStatus, normalizeTwilioStatus } from "@/lib/sms/status";
import { isValidTwilioWebhookSignature } from "@/lib/sms/webhook-signature";

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

  const messageSid = form.MessageSid || form.SmsSid || null;
  if (!messageSid) return NextResponse.json({ ok: true });

  const status = normalizeTwilioStatus(form.MessageStatus || form.SmsStatus || "queued");
  const errorCode = form.ErrorCode || null;
  const errorMessage = form.ErrorMessage || null;
  console.info("[sms-webhook-status] update", {
    message_sid: messageSid,
    status,
    error_code: errorCode,
  });

  const supabase = createAdminClient();

  await supabase
    .from("sms_messages")
    .update({
      status,
      provider_payload: form,
      updated_at: new Date().toISOString(),
    })
    .eq("twilio_message_sid", messageSid);

  const recipientStatus = recipientStatusFromMessageStatus(status);
  await supabase
    .from("sms_campaign_recipients")
    .update({
      status: recipientStatus,
      error_code: recipientStatus === "failed" || recipientStatus === "undelivered" ? errorCode : null,
      error_message: recipientStatus === "failed" || recipientStatus === "undelivered" ? errorMessage : null,
    })
    .eq("twilio_message_sid", messageSid);

  return NextResponse.json({ ok: true });
}
