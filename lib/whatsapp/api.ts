/**
 * WhatsApp Cloud API helpers. Uses project's whatsapp_accounts access_token.
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { CANNED_MESSAGE_BUCKET } from "@/lib/supabase/canned-messages-storage";

const META_GRAPH_BASE = "https://graph.facebook.com";

/**
 * Header media descriptor passed to {@link sendTemplateMessage}. When a template was
 * approved with an IMAGE/VIDEO/DOCUMENT header, Meta requires a matching header
 * parameter on every send — otherwise it returns error 132012
 * "Parameter format does not match format in the created template".
 */
export type TemplateHeaderMedia = {
  type: "image" | "video" | "document";
  link: string;
  filename?: string;
};

/**
 * Convert a stored header reference (Supabase storage path OR a full URL) into a
 * signed/public URL suitable for Meta to download at send time. Returns null when
 * the template doesn't use a media header or no media is stored.
 *
 * Signed URLs are valid for one hour, which is plenty for an immediate send. For
 * cron batches that may take longer, call once per batch.
 */
export async function resolveHeaderMediaForSend(
  admin: SupabaseClient,
  headerFormat: string | null | undefined,
  headerMediaRef: string | null | undefined
): Promise<TemplateHeaderMedia | null> {
  const fmt = (headerFormat ?? "").toLowerCase();
  if (fmt !== "image" && fmt !== "video" && fmt !== "document") return null;
  const ref = headerMediaRef?.trim();
  if (!ref) return null;

  if (/^https?:\/\//i.test(ref)) {
    return { type: fmt, link: ref, filename: ref.split("/").pop()?.split("?")[0] };
  }

  const { data } = await admin.storage
    .from(CANNED_MESSAGE_BUCKET)
    .createSignedUrl(ref, 60 * 60);
  if (!data?.signedUrl) return null;
  return {
    type: fmt,
    link: data.signedUrl,
    filename: ref.split("/").pop(),
  };
}

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

/**
 * Upload media to Meta's Resumable Upload API to get a `header_handle` for template creation.
 * Required for templates with IMAGE / VIDEO / DOCUMENT headers — Meta won't accept a plain URL.
 *
 * Two-step process:
 *   1. POST /{app_id}/uploads — create session (returns "upload:<session_id>")
 *   2. POST /{session_id} with file bytes (Authorization: OAuth <token>) — returns { h: "<handle>" }
 *
 * See https://developers.facebook.com/docs/graph-api/guides/upload/
 * Handle is valid for ~1 week so generate fresh at submit time.
 */
export async function uploadMediaToMetaResumable(
  accessToken: string,
  fileBytes: Buffer,
  fileName: string,
  fileType: string
): Promise<{ handle: string } | { error: { message: string; code?: number } }> {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return { error: { message: "FACEBOOK_APP_ID is not configured on the server." } };
  }

  // Step 1: create upload session
  const sessionUrl = new URL(`${META_GRAPH_BASE}/v22.0/${appId}/uploads`);
  sessionUrl.searchParams.set("file_name", fileName);
  sessionUrl.searchParams.set("file_length", String(fileBytes.length));
  sessionUrl.searchParams.set("file_type", fileType);
  sessionUrl.searchParams.set("access_token", accessToken);

  const sessionRes = await fetch(sessionUrl.toString(), { method: "POST" });
  const sessionData = await sessionRes.json();
  if (!sessionRes.ok) {
    return {
      error: {
        message:
          sessionData?.error?.message ??
          "Failed to start media upload session with Meta.",
        code: sessionData?.error?.code,
      },
    };
  }
  const sessionId: string | undefined = sessionData?.id;
  if (!sessionId) {
    return { error: { message: "Meta did not return an upload session id." } };
  }

  // Step 2: upload bytes (fetch wants Uint8Array, not Buffer, in some TS configs)
  const uploadUrl = `${META_GRAPH_BASE}/v22.0/${sessionId}`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${accessToken}`,
      file_offset: "0",
      "Content-Type": fileType || "application/octet-stream",
    },
    body: new Uint8Array(fileBytes),
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    return {
      error: {
        message:
          uploadData?.error?.message ??
          "Failed to upload media bytes to Meta.",
        code: uploadData?.error?.code,
      },
    };
  }
  const handle: string | undefined = uploadData?.h;
  if (!handle) {
    return { error: { message: "Meta did not return a file handle." } };
  }
  return { handle };
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
      example?: { body_text?: string[][]; header_text?: string[]; header_handle?: string[] };
      buttons?: Array<{ type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"; text: string; url?: string; phone_number?: string }>;
    }>;
  }
): Promise<{ id: string } | { error: { message: string; code?: number } }> {
  // Use supported language code as-is (e.g. "en"); Meta sample uses "en" not "en_US" for create
  const rawLang = (payload.language || "en").trim();
  const languageCode = rawLang === "en" ? "en" : toMetaLanguageCode(payload.language);
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
    allow_category_change: true,
    components: payload.components,
  };
  // Template Management doc uses v23.0: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/template-management
  const url = `${META_GRAPH_BASE}/v23.0/${wabaId}/message_templates`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = data.error ?? {};
    const msg = err.message ?? "Meta API error";
    const code = err.code;
    const subcode = err.error_subcode;
    const fbtrace = err.fbtrace_id;
    const isObjectNotFound =
      msg.includes("does not exist") ||
      msg.includes("missing permissions") ||
      msg.includes("cannot be loaded") ||
      msg.includes("Unsupported post request");
    let hint = isObjectNotFound
      ? " Use the correct WhatsApp Business Account ID (WABA): in Meta go to Business Manager → Business Settings → Accounts → WhatsApp Business Accounts and copy the ID. Update it in Settings → WhatsApp account. Ensure the app has whatsapp_business_management permission."
      : "";
    if (code === 100 && !hint) {
      hint =
        " Check template name (only a-z, 0-9, underscores), language code (e.g. en), and that body/header/footer text and variable examples are valid.";
    }
    const detail = [msg, subcode ? `Subcode: ${subcode}` : "", fbtrace ? `Trace: ${fbtrace}` : ""]
      .filter(Boolean)
      .join(". ");
    return { error: { message: detail + hint, code } };
  }
  return { id: data.id ?? data.name ?? "" };
}

const META_API_VERSION = "v21.0";

/**
 * Map Meta/WhatsApp API error codes to detailed, user-friendly messages (no codes or technical terms).
 */
export function getFriendlyErrorMessage(message: string, code?: number): string {
  if (code === 133010 || (message && String(message).includes("133010"))) {
    return "Your WhatsApp number isn't set up for sending yet. Complete the one-time setup in WhatsApp settings to start messaging.";
  }
  if (code === 131042 || (message && String(message).includes("131042"))) {
    return "Your WhatsApp account has a payment issue. Add or fix the payment method in your Meta Business account to resume message delivery.";
  }
  if (code === 132001 || (message && (String(message).includes("132001") || String(message).toLowerCase().includes("template name does not exist in the translation")))) {
    return "This template isn't available on your connected WhatsApp number for the selected language. In WhatsApp Manager, make sure the template is approved for this same number and language, or choose another approved template.";
  }
  if (code === 131026 || (message && String(message).includes("131026"))) {
    // Note: this is sent for TEMPLATE messages, so the old "they need to message you first"
    // copy was wrong — templates don't require the 24h window. Real causes (in order):
    //   1. Phone number isn't on WhatsApp (most common with imported lists)
    //   2. Daily messaging limit reached for your WABA tier
    //   3. Account quality dropped (Red/Yellow) — Meta throttling marketing sends
    //   4. Recipient blocked your business
    return "This number can't receive WhatsApp messages right now. The most common reasons: the number isn't on WhatsApp, your account's daily sending limit was hit, your account quality dropped, or the recipient has blocked your business.";
  }
  if (code === 131047 || (message && String(message).includes("131047"))) {
    return "This template isn't approved or doesn't exist for your account. Check WhatsApp Manager and use an approved template, or try \"hello_world\" for testing.";
  }
  if (code === 132000 || (message && String(message).includes("132000"))) {
    return "The number of variables sent doesn't match what the template expects. Re-sync your templates in Settings → Templates, then try again.";
  }
  if (message && (message.includes("does not exist") || message.includes("missing permissions") || message.toLowerCase().includes("cannot be loaded"))) {
    return "We couldn't complete this. Check that your WhatsApp account is connected and that you're using the correct number and templates in Settings.";
  }
  if (message && message.toLowerCase().includes("rate limit")) {
    return "You're sending too many messages too quickly. Please wait a few minutes and try again.";
  }
  // Strip Meta's "(#XXXXX) " prefix if present so we show just the human-readable part
  if (message && message.length > 0) {
    return message.replace(/^\(#\d+\)\s*/, "").trim() || "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

/** Use friendly messages for send errors (template, text, media). */
function formatSendError(message: string, code?: number): string {
  return getFriendlyErrorMessage(message, code);
}

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
    const res: Response = await fetch(nextUrl);
    const data = (await res.json()) as { data?: MetaMessageTemplate[]; paging?: { next?: string }; error?: { message?: string } };
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

async function getTemplateLanguages(
  accessToken: string,
  wabaId: string,
  templateName: string
): Promise<string[]> {
  const normalized = templateName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (!normalized) return [];
  const filteredUrl = `${META_GRAPH_BASE}/${META_API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(normalized)}&fields=id,name,language,status&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(filteredUrl);
  const data = (await res.json()) as {
    data?: Array<{ name?: string; language?: string; status?: string }>;
  };
  if (!res.ok || !Array.isArray(data.data)) return [];
  const fromFiltered = data.data
    .filter((t) => (t.name ?? "").trim().toLowerCase() === normalized)
    .filter((t) => {
      const s = (t.status ?? "").toLowerCase();
      return s === "approved" || s === "active";
    })
    .map((t) => (t.language ?? "").trim())
    .filter((l) => l.length > 0);
  if (fromFiltered.length > 0) return [...new Set(fromFiltered)];

  // Fallback: Meta can occasionally return empty results with the name filter.
  const fullUrl = `${META_GRAPH_BASE}/${META_API_VERSION}/${wabaId}/message_templates?fields=id,name,language,status&access_token=${encodeURIComponent(accessToken)}`;
  const fullRes = await fetch(fullUrl);
  const fullData = (await fullRes.json()) as {
    data?: Array<{ name?: string; language?: string; status?: string }>;
  };
  if (!fullRes.ok || !Array.isArray(fullData.data)) return [];
  return [
    ...new Set(
      fullData.data
        .filter((t) => (t.name ?? "").trim().toLowerCase() === normalized)
        .filter((t) => {
          const s = (t.status ?? "").toLowerCase();
          return s === "approved" || s === "active";
        })
        .map((t) => (t.language ?? "").trim())
        .filter((l) => l.length > 0)
    ),
  ];
}

/**
 * Resolve the exact approved language for a template on this WABA. Exported so
 * the campaign cron can call this ONCE per batch instead of per-send (which
 * was previously doubling Meta API traffic — 300 sends became 600-900 API
 * calls and could trip Meta's quality protection).
 */
export async function resolveTemplateLanguageForSend(
  accessToken: string,
  wabaId: string,
  templateName: string,
  preferredLanguage: string
): Promise<string> {
  const available = await getTemplateLanguages(accessToken, wabaId, templateName);
  if (available.length === 0) return templateName === "hello_world" ? "en" : toMetaLanguageCode(preferredLanguage);

  const preferred = [preferredLanguage, toMetaLanguageCode(preferredLanguage), "en", "en_US"]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  for (const cand of preferred) {
    const exact = available.find((l) => l === cand);
    if (exact) return exact;
  }

  if (templateName === "hello_world") {
    const helloPreferred = available.find((l) => l === "en" || l === "en_US");
    if (helloPreferred) return helloPreferred;
  }
  return available[0];
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
  header_format: "text" | "image" | "video" | "document" | "location";
  footer: string | null;
  buttons: unknown[];
  variables: string[];
  meta_template_id: string;
} {
  const components = meta.components ?? [];
  const bodyComp = components.find((c) => c.type === "BODY");
  // Any HEADER, regardless of format — so we capture image/video/document too.
  const anyHeaderComp = components.find((c) => c.type === "HEADER");
  const textHeaderComp = anyHeaderComp && (anyHeaderComp.format === "TEXT" || !anyHeaderComp.format)
    ? anyHeaderComp
    : null;
  const footerComp = components.find((c) => c.type === "FOOTER");
  const buttonsComp = components.find((c) => c.type === "BUTTONS");

  const body = bodyComp?.text?.trim() ?? null;
  const header = textHeaderComp?.text?.trim() ?? null;
  const rawHeaderFormat = (anyHeaderComp?.format ?? "TEXT").toLowerCase();
  const header_format: "text" | "image" | "video" | "document" | "location" =
    rawHeaderFormat === "image" || rawHeaderFormat === "video" ||
    rawHeaderFormat === "document" || rawHeaderFormat === "location"
      ? rawHeaderFormat
      : "text";
  const footer = footerComp?.text?.trim() ?? null;

  const indices = getBodyVariableIndicesFromText(body ?? undefined);
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
    header_format,
    footer,
    buttons,
    variables,
    meta_template_id: String(meta.id ?? ""),
  };
}

/**
 * Fetch a single template directly from Meta by its template ID.
 * This avoids the name/language case-sensitivity issues in getTemplateStatusViaWaba
 * (Meta stores names like "hello_world" and languages like "en_US", but the name+language
 * filter on the list endpoint is case-sensitive and brittle).
 *
 * Returns full template data so callers can also refresh body/header/footer/buttons/category.
 */
export async function getTemplateById(
  accessToken: string,
  metaTemplateId: string
): Promise<{ template: MetaMessageTemplate } | { error: { message: string } }> {
  const url = `${META_GRAPH_BASE}/${META_API_VERSION}/${encodeURIComponent(metaTemplateId)}?fields=id,name,language,status,category,components&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? "Meta API error";
    const isObjectNotFound =
      msg.includes("does not exist") ||
      msg.includes("Unsupported get request") ||
      msg.includes("cannot be loaded");
    if (isObjectNotFound) {
      return {
        error: {
          message:
            "This template no longer exists in Meta. It may have been deleted in WhatsApp Manager. Use 'Fetch from Meta' on the list page to resync.",
        },
      };
    }
    return { error: { message: msg } };
  }
  return { template: data as MetaMessageTemplate };
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
  health_status?: {
    can_send_message?: string;
    entities?: Array<{
      entity_type?: string;
      id?: string;
      can_send_message?: string;
      errors?: Array<{ error_code?: number; error_description?: string }>;
    }>;
  };
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
    "health_status",
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

  const len = Math.max(keys.length, fallback.length);
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
    components?: Array<{ type: "button" | "body" | "header"; parameters: Array<Record<string, unknown>> }>;
    variableValues?: string[];
    wabaId?: string;
    headerMedia?: TemplateHeaderMedia;
    /**
     * Skip the per-send Meta API call to resolve template language. Caller is
     * expected to have called resolveTemplateLanguageForSend once already
     * (e.g., per batch in the campaign cron) and pass the result here.
     */
    preResolvedLanguageCode?: string;
  }
): Promise<{ message_id: string } | { error: { message: string; code?: number } }> {
  const normalizedTemplateName = templateName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  let languageCode: string;
  if (options?.preResolvedLanguageCode) {
    languageCode = options.preResolvedLanguageCode;
  } else {
    languageCode = normalizedTemplateName === "hello_world" ? "en" : toMetaLanguageCode(language);
    if (options?.wabaId) {
      // Pick the exact approved language that exists on this WABA to avoid 132001.
      languageCode = await resolveTemplateLanguageForSend(
        accessToken,
        options.wabaId,
        normalizedTemplateName || templateName,
        languageCode
      );
    }
  }
  const url = `${META_GRAPH_BASE}/v22.0/${phoneNumberId}/messages`;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: normalizedTemplateName || templateName,
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
  // Prepend header component when the template uses a media header. Meta returns
  // 132012 if a media-header template is sent without this.
  if (options?.headerMedia) {
    const hm = options.headerMedia;
    const param: Record<string, unknown> =
      hm.type === "image" ? { type: "image", image: { link: hm.link } } :
      hm.type === "video" ? { type: "video", video: { link: hm.link } } :
      { type: "document", document: { link: hm.link, ...(hm.filename ? { filename: hm.filename } : {}) } };
    const headerComp = { type: "header" as const, parameters: [param] };
    components = components ? [headerComp, ...components] : [headerComp];
  }
  if (components && components.length > 0) {
    (body.template as Record<string, unknown>).components = components;
  }
  // Verbose payload logging — only when WHATSAPP_DEBUG=1, otherwise it floods
  // logs at scale (30k campaigns = 60k log entries).
  if (process.env.WHATSAPP_DEBUG === "1") {
    console.log("[sendTemplateMessage] →", JSON.stringify(body));
  }

  // Send with retry: 429 (rate limit) and 5xx (server error) are retried with
  // exponential backoff. 4xx errors other than 429 are non-retryable.
  const RETRY_DELAYS_MS = [500, 1500];
  let res: Response;
  let data: { error?: { message?: string; code?: number; error_data?: { details?: string } }; messages?: Array<{ id: string }> } = {};
  let attempt = 0;
  while (true) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    data = await res.json();
    if (process.env.WHATSAPP_DEBUG === "1") {
      console.log("[sendTemplateMessage] ←", res.status, JSON.stringify(data));
    }
    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt >= RETRY_DELAYS_MS.length) break;
    const delay = RETRY_DELAYS_MS[attempt];
    console.warn(`[sendTemplateMessage] ${res.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`);
    await new Promise((r) => setTimeout(r, delay));
    attempt++;
  }
  if (!res.ok && data?.error?.code === 132001 && options?.wabaId) {
    // Retry once with any other approved language available on this WABA.
    const available = await getTemplateLanguages(
      accessToken,
      options.wabaId,
      normalizedTemplateName || templateName
    );
    const alternate = available.find((l) => l !== languageCode);
    if (alternate) {
      (body.template as { language: { code: string } }).language.code = alternate;
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      data = await res.json();
    }
  }
  if (!res.ok) {
    const code = data.error?.code;
    const msg = data.error?.message ?? "Meta API error";
    // Meta puts the specific parameter mismatch detail in error_data.details for 132012.
    const details = data.error?.error_data?.details;
    const fullMsg = details ? `${msg} — ${details}` : msg;
    return { error: { message: formatSendError(fullMsg, code), code } };
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
    const code = data.error?.code;
    const msg = data.error?.message ?? "Meta API error";
    return { error: { message: formatSendError(msg, code), code } };
  }
  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    return { error: { message: "No message id in response" } };
  }
  return { message_id: messageId };
}

export type MediaMessageType = "image" | "video" | "audio" | "document";

/**
 * Send a media message (image, video, audio, document) via URL. Used for auto-replies and canned-style messages.
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
 */
export async function sendMediaMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  type: MediaMessageType,
  mediaUrl: string,
  options?: { caption?: string; filename?: string }
): Promise<{ message_id: string } | { error: { message: string; code?: number } }> {
  const url = `${META_GRAPH_BASE}/v22.0/${phoneNumberId}/messages`;
  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type,
    [type]: { link: mediaUrl },
  };
  if (options?.caption && (type === "image" || type === "video" || type === "document")) {
    (body[type] as Record<string, string>).caption = options.caption.slice(0, 1024);
  }
  if (type === "document" && options?.filename) {
    (body[type] as Record<string, string>).filename = options.filename.slice(0, 256);
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const code = data.error?.code;
    const msg = data.error?.message ?? "Meta API error";
    return { error: { message: formatSendError(msg, code), code } };
  }
  const messageId = data.messages?.[0]?.id;
  if (!messageId) {
    return { error: { message: "No message id in response" } };
  }
  return { message_id: messageId };
}

export type DownloadedMedia = {
  data: Uint8Array;
  mimeType: string;
  fileSize: number;
};

/**
 * Download inbound media by its Meta media id. Two-step per the Cloud API:
 *   1. GET /{media-id} → short-lived authenticated download URL + mime/size
 *   2. GET that URL with the Bearer token → the binary
 * Returns the bytes + mime so the caller can persist them to storage.
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media
 */
export async function downloadWhatsAppMedia(
  accessToken: string,
  mediaId: string
): Promise<DownloadedMedia | { error: { message: string; code?: number } }> {
  // Step 1 — resolve the media id to a (short-lived) download URL.
  const metaUrl = `${META_GRAPH_BASE}/${META_API_VERSION}/${encodeURIComponent(mediaId)}`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const metaJson = await metaRes.json().catch(() => ({}));
  if (!metaRes.ok || !metaJson?.url) {
    const code = metaJson?.error?.code;
    const msg = metaJson?.error?.message ?? `Failed to resolve media ${mediaId}`;
    return { error: { message: msg, code } };
  }
  const downloadUrl: string = metaJson.url;
  const mimeType: string = metaJson.mime_type ?? "application/octet-stream";
  const declaredSize: number = Number(metaJson.file_size ?? 0) || 0;

  // Step 2 — download the binary. The CDN URL still requires the Bearer token.
  const fileRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileRes.ok) {
    return { error: { message: `Failed to download media ${mediaId} (${fileRes.status})` } };
  }
  const buf = new Uint8Array(await fileRes.arrayBuffer());
  return { data: buf, mimeType, fileSize: declaredSize || buf.byteLength };
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

/**
 * Register a business phone number for the WhatsApp Cloud API (fixes error 133010).
 * Requires access token with whatsapp_business_management.
 * See https://developers.facebook.com/docs/whatsapp/cloud-api/reference/registration
 */
export async function registerPhoneNumberForCloudApi(
  accessToken: string,
  phoneNumberId: string,
  pin: string
): Promise<{ success: true } | { error: { message: string; code?: number } }> {
  const trimmedPin = pin.replace(/\D/g, "").slice(0, 6);
  if (trimmedPin.length !== 6) {
    return { error: { message: "PIN must be exactly 6 digits (0–9).", code: 400 } };
  }
  const url = `${META_GRAPH_BASE}/v22.0/${phoneNumberId}/register`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      pin: trimmedPin,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? "Registration failed";
    const code = data.error?.code;
    return { error: { message: msg, code } };
  }
  return { success: true };
}
