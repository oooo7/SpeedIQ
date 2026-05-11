import twilio from "twilio";

export function isValidTwilioWebhookSignature(params: {
  url: string;
  signature: string | null;
  form: Record<string, string>;
}): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
  if (!params.signature) return false;
  return twilio.validateRequest(authToken, params.signature, params.url, params.form);
}
