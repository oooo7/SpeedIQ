import { normalizeSmsPhone } from "@/lib/sms/phone";
import { getTwilioAccountSid, twilioApiRequest } from "@/lib/sms/twilio-oauth";

type NumberCapabilities = {
  sms: boolean;
  mms: boolean;
  voice: boolean;
};

function mapCapabilities(raw: unknown): NumberCapabilities {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    sms: Boolean(obj.SMS ?? obj.sms ?? true),
    mms: Boolean(obj.MMS ?? obj.mms ?? false),
    voice: Boolean(obj.voice ?? obj.Voice ?? false),
  };
}

export async function searchTwilioAvailableNumbers(countryCode: string, areaCode?: string) {
  const accountSid = getTwilioAccountSid();
  const response = await twilioApiRequest({
    url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${countryCode.toUpperCase()}/Local.json`,
    method: "GET",
    query: {
      SmsEnabled: true,
      PageSize: 20,
      ...(areaCode ? { AreaCode: areaCode } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(String(response.data.message ?? "Failed to search Twilio numbers"));
  }
  const list = Array.isArray(response.data.available_phone_numbers)
    ? response.data.available_phone_numbers
    : [];
  return list.map((n) => {
    const row = n as Record<string, unknown>;
    return {
      phoneNumber: String(row.phone_number ?? ""),
      friendlyName: String(row.friendly_name ?? row.phone_number ?? ""),
      locality: String(row.locality ?? ""),
      region: String(row.region ?? ""),
      country: String(row.iso_country ?? ""),
      capabilities: mapCapabilities(row.capabilities),
    };
  });
}

export async function buyTwilioNumber(params: {
  phoneNumber: string;
  messagingServiceSid?: string;
  smsUrl?: string;
  statusCallback?: string;
}) {
  const accountSid = getTwilioAccountSid();
  const payload: {
    PhoneNumber: string;
    SmsUrl?: string;
    StatusCallback?: string;
  } = {
    PhoneNumber: normalizeSmsPhone(params.phoneNumber),
  };
  if (params.smsUrl) payload.SmsUrl = params.smsUrl;
  if (params.statusCallback) payload.StatusCallback = params.statusCallback;
  const createResponse = await twilioApiRequest({
    url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    method: "POST",
    form: payload,
  });
  if (!createResponse.ok) {
    throw new Error(String(createResponse.data.message ?? "Failed to buy Twilio number"));
  }

  if (params.messagingServiceSid) {
    const attachResponse = await twilioApiRequest({
      url: `https://messaging.twilio.com/v1/Services/${params.messagingServiceSid}/PhoneNumbers`,
      method: "POST",
      form: { PhoneNumberSid: String(createResponse.data.sid ?? "") },
    });
    if (!attachResponse.ok) {
      throw new Error(String(attachResponse.data.message ?? "Failed to attach number to messaging service"));
    }
  }

  return {
    sid: String(createResponse.data.sid ?? ""),
    phoneNumber: String(createResponse.data.phone_number ?? ""),
    friendlyName: String(createResponse.data.friendly_name ?? ""),
    capabilities: mapCapabilities(createResponse.data.capabilities),
  };
}

export async function attachTwilioNumberToMessagingService(phoneNumberSid: string, messagingServiceSid: string) {
  const response = await twilioApiRequest({
    url: `https://messaging.twilio.com/v1/Services/${messagingServiceSid}/PhoneNumbers`,
    method: "POST",
    form: { PhoneNumberSid: phoneNumberSid },
  });
  if (!response.ok) {
    throw new Error(String(response.data.message ?? "Failed to attach number to messaging service"));
  }
  return {
    sid: String(response.data.sid ?? ""),
    phoneNumberSid: String(response.data.phone_number_sid ?? phoneNumberSid),
    messagingServiceSid: String(response.data.messaging_service_sid ?? messagingServiceSid),
  };
}

export async function fetchIncomingNumber(phoneNumberSid: string) {
  const accountSid = getTwilioAccountSid();
  const response = await twilioApiRequest({
    url: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    method: "GET",
  });
  if (!response.ok) {
    throw new Error(String(response.data.message ?? "Failed to fetch Twilio number"));
  }
  return {
    sid: String(response.data.sid ?? ""),
    phoneNumber: String(response.data.phone_number ?? ""),
    friendlyName: String(response.data.friendly_name ?? ""),
    capabilities: mapCapabilities(response.data.capabilities),
  };
}
