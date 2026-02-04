/**
 * WhatsApp Cloud API helpers. Uses project's whatsapp_accounts access_token.
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const META_GRAPH_BASE = "https://graph.facebook.com";

export async function getWhatsAppAccountToken(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ access_token: string; phone_number_id: string; waba_id: string } | null> {
  const { data } = await supabase
    .from("whatsapp_accounts")
    .select("access_token, phone_number_id, waba_id")
    .eq("project_id", projectId)
    .maybeSingle();
  return data ?? null;
}

export async function submitTemplateToMeta(
  accessToken: string,
  wabaId: string,
  payload: {
    name: string;
    language: string;
    category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
    components: Array<{
      type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
      format?: string;
      text?: string;
      buttons?: Array<{ type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string }>;
    }>;
  }
): Promise<{ id: string } | { error: { message: string; code?: number } }> {
  const url = `${META_GRAPH_BASE}/v21.0/${wabaId}/message_templates?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: { message: data.error?.message ?? "Meta API error", code: data.error?.code } };
  }
  return { id: data.id ?? data.name ?? "" };
}

export async function getPhoneNumberInfo(
  accessToken: string,
  phoneNumberId: string
): Promise<{ display_phone_number?: string; quality_rating?: string; platform_type?: string } | { error: { message: string } }> {
  const url = `${META_GRAPH_BASE}/v21.0/${phoneNumberId}?fields=display_phone_number,quality_rating,platform_type&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    return { error: { message: data.error?.message ?? "Meta API error" } };
  }
  return data;
}

/**
 * Send a template message using Meta's format (v22.0).
 * Use language "en_US" for hello_world when testing from Meta dashboard.
 */
export async function sendTemplateMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  templateName: string,
  language: string,
  components?: Array<{ type: "button" | "body" | "header"; parameters: Array<{ type: "text"; text: string }> }>
): Promise<{ message_id: string } | { error: { message: string; code?: number } }> {
  const languageCode = language === "en" && templateName === "hello_world" ? "en_US" : language;
  const url = `${META_GRAPH_BASE}/v22.0/${phoneNumberId}/messages`;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };
  if (components && components.length > 0) {
    (body.template as Record<string, unknown>).components = components;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: { message: data.error?.message ?? "Meta API error", code: data.error?.code } };
  }
  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    return { error: { message: "No message id in response" } };
  }
  return { message_id: messageId };
}

export function isWithin24hWindow(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  const last = new Date(lastInboundAt).getTime();
  const now = Date.now();
  return now - last < 24 * 60 * 60 * 1000;
}
