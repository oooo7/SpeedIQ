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

/** Normalize language for Meta (e.g. en -> en_US). */
export function toMetaLanguageCode(lang: string): string {
  const trimmed = (lang || "en").trim().toLowerCase();
  if (trimmed.length <= 3) return trimmed === "en" ? "en_US" : trimmed;
  if (trimmed.includes("_")) return trimmed;
  return `${trimmed}_${trimmed.toUpperCase()}`;
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
      example?: { body_text?: string[][]; header_text?: string[] };
      buttons?: Array<{ type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string }>;
    }>;
  }
): Promise<{ id: string } | { error: { message: string; code?: number } }> {
  const languageCode = toMetaLanguageCode(payload.language);
  // Meta requires: lowercase letters, numbers, and underscores only (max 512 chars)
  const metaName = payload.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  if (!metaName) {
    return { error: { message: "Template name must contain at least one letter or number (use only a-z, 0-9, underscores).", code: 100 } };
  }
  const body = {
    name: metaName.slice(0, 512),
    language: languageCode,
    category: payload.category,
    components: payload.components,
  };
  const url = `${META_GRAPH_BASE}/v21.0/${wabaId}/message_templates?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? "Meta API error";
    const code = data.error?.code;
    const isObjectNotFound =
      msg.includes("does not exist") ||
      msg.includes("missing permissions") ||
      msg.includes("cannot be loaded") ||
      msg.includes("Unsupported post request");
    const hint = isObjectNotFound
      ? " Use the correct WhatsApp Business Account ID (WABA): in Meta go to Business Manager → Business Settings → Accounts → WhatsApp Business Accounts and copy the ID. Update it in Settings → WhatsApp account. Ensure the app has whatsapp_business_management permission."
      : "";
    return { error: { message: msg + hint, code } };
  }
  return { id: data.id ?? data.name ?? "" };
}

/** Fetch template status from Meta via WABA message_templates list (avoids direct template ID access). */
export async function getTemplateStatusViaWaba(
  accessToken: string,
  wabaId: string,
  templateName: string,
  language: string
): Promise<{ status: string } | { error: { message: string } }> {
  const metaName = templateName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || templateName;
  const langCode = toMetaLanguageCode(language);
  const url = `${META_GRAPH_BASE}/v21.0/${wabaId}/message_templates?name=${encodeURIComponent(metaName)}&language=${encodeURIComponent(langCode)}&fields=id,name,language,status&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? "Meta API error";
    const isObjectNotFound =
      msg.includes("does not exist") ||
      msg.includes("missing permissions") ||
      msg.includes("cannot be loaded");
    const hint = isObjectNotFound
      ? " Verify your WhatsApp account WABA ID in Settings → WhatsApp account matches the Business Account in Meta. Ensure the app has whatsapp_business_management permission."
      : "";
    return { error: { message: msg + hint } };
  }
  const list = (data.data as Array<{ id: string; name: string; language: string; status: string }>) ?? [];
  const match = list.find((t) => t.name === metaName && (t.language === langCode || t.language === language));
  if (!match) {
    return {
      error: {
        message:
          "Template not found in Meta. It may still be in review. Check WhatsApp Manager or try again later.",
      },
    };
  }
  const status = (match.status ?? "pending").toLowerCase();
  return { status: status || "pending" };
}

/** Meta Graph API phone number fields. See https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers */
export type PhoneNumberInfo = {
  display_phone_number?: string;
  quality_rating?: string;
  platform_type?: string;
  verified_name?: string;
  code_verification_status?: string;
  status?: string;
};

export async function getPhoneNumberInfo(
  accessToken: string,
  phoneNumberId: string
): Promise<PhoneNumberInfo | { error: { message: string } }> {
  const fields = [
    "display_phone_number",
    "quality_rating",
    "platform_type",
    "verified_name",
    "code_verification_status",
    "status",
  ].join(",");
  const url = `${META_GRAPH_BASE}/v21.0/${phoneNumberId}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    return { error: { message: data.error?.message ?? "Meta API error" } };
  }
  return data as PhoneNumberInfo;
}

/**
 * Send a template message using Meta's format (v22.0).
 * Use language "en_US" for hello_world when testing from Meta dashboard.
 * Pass variableValues (array of strings for {{1}}, {{2}}, ...) when the template has body variables.
 */
export async function sendTemplateMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  templateName: string,
  language: string,
  options?: {
    components?: Array<{ type: "button" | "body" | "header"; parameters: Array<{ type: "text"; text: string }> }>;
    variableValues?: string[];
  }
): Promise<{ message_id: string } | { error: { message: string; code?: number } }> {
  const languageCode =
    language === "en" && templateName === "hello_world" ? "en_US" : toMetaLanguageCode(language);
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
  let components = options?.components;
  if (!components && options?.variableValues && options.variableValues.length > 0) {
    components = [
      {
        type: "body" as const,
        parameters: options.variableValues.map((text) => ({ type: "text" as const, text: String(text).slice(0, 1000) })),
      },
    ];
  }
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

/**
 * Send a plain text message (for replying within the 24h customer-initiated window).
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#text-object
 */
export async function sendTextMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string
): Promise<{ message_id: string } | { error: { message: string; code?: number } }> {
  const url = `${META_GRAPH_BASE}/v22.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "text",
    text: { body: text.slice(0, 4096), preview_url: false },
  };
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
