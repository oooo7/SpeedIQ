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

const META_API_VERSION = "v21.0";

/** Meta template node from GET /message_templates */
export interface MetaMessageTemplate {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: Array<{
    type: string;
    text?: string;
    format?: string;
    buttons?: Array<{ type: string; text?: string; url?: string; phone_number?: string }>;
    example?: { body_text?: string[][]; header_text?: string[] };
  }>;
}

/**
 * Fetch all message templates from Meta for a WABA.
 * Handles paging and returns templates with id, name, language, status, category, components.
 */
export async function fetchMessageTemplatesFromMeta(
  accessToken: string,
  wabaId: string
): Promise<{ templates: MetaMessageTemplate[] } | { error: { message: string } }> {
  const all: MetaMessageTemplate[] = [];
  let nextUrl: string | null = `${META_GRAPH_BASE}/${META_API_VERSION}/${wabaId}/message_templates?fields=id,name,language,status,category,components&access_token=${encodeURIComponent(accessToken)}`;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error?.message ?? "Meta API error";
      const hint =
        msg.includes("does not exist") || msg.includes("missing permissions") || msg.includes("cannot be loaded")
          ? " Verify WABA ID in Settings → WhatsApp account and whatsapp_business_management permission."
          : "";
      return { error: { message: msg + hint } };
    }
    const list = (data.data as MetaMessageTemplate[]) ?? [];
    all.push(...list);
    nextUrl = data.paging?.next ?? null;
  }

  return { templates: all };
}

/** Parse variable indices from body text e.g. {{1}} {{2}} -> [1,2]. Meta uses {{1}} in API. */
function getBodyVariableIndicesFromText(text: string | undefined): number[] {
  if (!text?.trim()) return [];
  const matches = text.match(/\{\{(\d+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => parseInt(m.replace(/\{\{|\}\}/g, ""), 10)))].sort((a, b) => a - b);
}

/**
 * Map a Meta message template to our whatsapp_templates row shape (for upsert).
 */
export function metaTemplateToRow(meta: MetaMessageTemplate): {
  name: string;
  category: string;
  language: string;
  status: string;
  body: string | null;
  header: string | null;
  footer: string | null;
  buttons: unknown[];
  variables: string[];
  meta_template_id: string;
} {
  const components = meta.components ?? [];
  const bodyComp = components.find((c) => c.type === "BODY");
  const headerComp = components.find((c) => c.type === "HEADER" && (c.format === "TEXT" || !c.format));
  const footerComp = components.find((c) => c.type === "FOOTER");
  const buttonsComp = components.find((c) => c.type === "BUTTONS");

  const body = bodyComp?.text?.trim() ?? null;
  const header = headerComp?.text?.trim() ?? null;
  const footer = footerComp?.text?.trim() ?? null;

  const indices = getBodyVariableIndicesFromText(body);
  const exampleRow = bodyComp?.example?.body_text?.[0];
  const variables = indices.map((i) => (exampleRow?.[i - 1] ?? "").trim().slice(0, 100));

  const buttons: unknown[] = [];
  if (Array.isArray(buttonsComp?.buttons)) {
    for (const b of buttonsComp.buttons) {
      buttons.push({
        type: b.type ?? "QUICK_REPLY",
        text: b.text ?? "",
        url: b.url,
        phone_number: b.phone_number,
      });
    }
  }

  const category = (meta.category ?? "UTILITY").toLowerCase();
  const status = (meta.status ?? "PENDING").toLowerCase();

  return {
    name: meta.name ?? "",
    category: category === "marketing" || category === "authentication" ? category : "utility",
    language: meta.language ?? "en",
    status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
    body,
    header,
    footer,
    buttons,
    variables,
    meta_template_id: String(meta.id ?? ""),
  };
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
  const url = `${META_GRAPH_BASE}/${META_API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(metaName)}&language=${encodeURIComponent(langCode)}&fields=id,name,language,status&access_token=${encodeURIComponent(accessToken)}`;
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

/** Contact fields used for template variable resolution. */
export interface WhatsAppContactForVariables {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  custom_fields?: Record<string, unknown> | null;
}

/**
 * Resolve template variable values from a contact using variable_field_mapping.
 * mapping[i] is the field key for {{i+1}}. Allowed keys: first_name, last_name, name, email, phone, custom:<key>.
 * Falls back to fallbackExamples[i] when mapping is missing or contact has no value.
 */
export function getVariableValuesForContact(
  contact: WhatsAppContactForVariables,
  mapping: string[] | null | undefined,
  fallbackExamples: string[] | null | undefined
): string[] {
  const fallback = Array.isArray(fallbackExamples) ? fallbackExamples.map(String) : [];
  const keys = Array.isArray(mapping) ? mapping : [];
  const name = (contact?.name ?? "").trim();
  const parts = name ? name.split(/\s+/) : [];
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ") ?? "";
  const custom = contact?.custom_fields && typeof contact.custom_fields === "object" ? contact.custom_fields : {};

  function getValueFromContact(key: string): string {
    const k = String(key ?? "").trim();
    if (!k) return "";
    if (k === "first_name") return first;
    if (k === "last_name") return last;
    if (k === "name") return name;
    if (k === "email") return (contact?.email ?? "").trim();
    if (k === "phone") return (contact?.phone ?? "").trim();
    if (k.startsWith("custom:")) {
      const fieldKey = k.slice(7).trim();
      const v = fieldKey ? custom[fieldKey] : "";
      return typeof v === "string" ? v : String(v ?? "");
    }
    return "";
  }

  const len = Math.max(keys.length, fallback.length, 1);
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const key = keys[i];
    const fromContact = key ? getValueFromContact(key) : "";
    const val = fromContact || (fallback[i] ?? "");
    out.push(String(val).slice(0, 1000));
  }
  return out.length > 0 ? out : fallback;
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

/**
 * Mark an incoming message as read (and optionally show typing indicator).
 * Use the message_id from the messages webhook (incoming message id).
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/guides/mark-message-as-read
 */
export async function markMessageAsRead(
  accessToken: string,
  phoneNumberId: string,
  messageId: string,
  options?: { typing?: boolean }
): Promise<{ success: true } | { error: { message: string } }> {
  const url = `${META_GRAPH_BASE}/v22.0/${phoneNumberId}/messages`;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };
  if (options?.typing) {
    body.typing_indicator = { type: "text" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: { message: data.error?.message ?? "Meta API error" } };
  }
  return { success: true };
}

export function isWithin24hWindow(lastInboundAt: string | null): boolean {
  if (!lastInboundAt) return false;
  const last = new Date(lastInboundAt).getTime();
  const now = Date.now();
  return now - last < 24 * 60 * 60 * 1000;
}
