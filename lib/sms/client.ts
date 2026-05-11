import type { SupabaseClient } from "@supabase/supabase-js";

import { getFriendlySmsErrorMessage } from "@/lib/sms/errors";
import { normalizeSmsPhone } from "@/lib/sms/phone";
import { normalizeTwilioStatus } from "@/lib/sms/status";
import { getTwilioAccountSid, twilioApiRequest } from "@/lib/sms/twilio-oauth";

export interface SendSmsInput {
  to: string;
  body: string;
  statusCallback?: string;
  from?: string;
}

export interface SendSmsResult {
  success: boolean;
  sid?: string;
  status?: string;
  error?: string;
  errorCode?: string;
}

export async function getSmsAccountConfig(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ messaging_service_sid: string | null; default_from: string | null } | null> {
  const { data, error } = await supabase
    .from("sms_accounts")
    .select("messaging_service_sid, default_from")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function sendSmsForProject(
  supabase: SupabaseClient,
  projectId: string,
  input: SendSmsInput
): Promise<SendSmsResult> {
  try {
    const accountSid = getTwilioAccountSid();
    const account = await getSmsAccountConfig(supabase, projectId);
    if (!account) {
      return { success: false, error: "SMS account is not connected for this project." };
    }
    const to = normalizeSmsPhone(input.to);
    if (!to) {
      return { success: false, error: "Recipient phone number is invalid." };
    }

    const body = input.body?.trim();
    if (!body) return { success: false, error: "Message body is required." };

    const statusCallback = input.statusCallback ?? process.env.TWILIO_STATUS_CALLBACK_URL;

    const payload: {
      To: string;
      Body: string;
      MessagingServiceSid?: string;
      From?: string;
      StatusCallback?: string;
    } = {
      To: to,
      Body: body.slice(0, 1600),
    };

    if (statusCallback) payload.StatusCallback = statusCallback;
    if (account.messaging_service_sid) {
      payload.MessagingServiceSid = account.messaging_service_sid;
      if (input.from) payload.From = normalizeSmsPhone(input.from);
    } else {
      const from = normalizeSmsPhone(input.from || account.default_from || "");
      if (!from) {
        return { success: false, error: "A sender number is required. Set a default SMS number in settings." };
      }
      payload.From = from;
    }

    const response = await twilioApiRequest({
      url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: "POST",
      form: payload,
    });

    if (!response.ok) {
      const errMessage = String(response.data.message ?? "Twilio send failed");
      const errCode = response.data.code ? String(response.data.code) : undefined;
      return {
        success: false,
        error: getFriendlySmsErrorMessage(errMessage, errCode),
        errorCode: errCode,
      };
    }

    return {
      success: true,
      sid: String(response.data.sid ?? ""),
      status: normalizeTwilioStatus(String(response.data.status ?? "queued")),
    };
  } catch (error) {
    const maybeTwilio = error as { message?: string; code?: number };
    return {
      success: false,
      error: getFriendlySmsErrorMessage(maybeTwilio.message ?? "Twilio send failed", maybeTwilio.code),
      errorCode: maybeTwilio.code ? String(maybeTwilio.code) : undefined,
    };
  }
}
