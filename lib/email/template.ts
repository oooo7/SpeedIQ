import DOMPurify from "isomorphic-dompurify";

/**
 * Replace {{variable}} placeholders in email body with values.
 * Used for both preview and actual send.
 */
export function renderEmailBody(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "gi");
    result = result.replace(placeholder, value ?? "");
  }
  return result;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build variables for a subscriber: first_name, last_name, name, email, unsubscribe_url (if provided).
 */
export function buildSubscriberVariables(
  name: string | null,
  email: string,
  unsubscribeUrl?: string
): Record<string, string> {
  const parts = (name ?? "").trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ") ?? "";
  const full = (name ?? "").trim() || email;
  const vars: Record<string, string> = {
    first_name: first,
    last_name: last,
    name: full,
    email,
  };
  if (unsubscribeUrl) {
    vars.unsubscribe_url = unsubscribeUrl;
  }
  return vars;
}

/**
 * Sanitize user-provided HTML for safe inclusion in outbound emails.
 * Strips <script>, on* handlers, javascript: URLs, and other XSS vectors.
 * Email clients ignore most of these anyway, but we strip them server-side
 * to prevent reflection back to admins viewing campaign previews.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    // Block protocols that have no place in email
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid|data:image\/(?:png|jpe?g|gif|webp|svg\+xml));|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Allow style attribute (email templates rely heavily on inline styles)
    ADD_ATTR: ["target", "style"],
    // Forbid form elements (no point in email; potential phishing aid)
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "select"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

interface CanSpamFooterOptions {
  unsubscribeUrl: string;
  physicalAddress?: string | null;
  platformName?: string | null;
  supportEmail?: string | null;
}

/**
 * Append a CAN-SPAM compliant footer to a campaign email body.
 * Includes an unsubscribe link and (if configured) sender's postal address.
 * If body already contains an unsubscribe link, only the address block is added.
 */
export function appendCanSpamFooter(html: string, opts: CanSpamFooterOptions): string {
  const { unsubscribeUrl, physicalAddress, platformName, supportEmail } = opts;
  const hasUnsubscribeLink = unsubscribeUrl && html.toLowerCase().includes(unsubscribeUrl.toLowerCase());

  const parts: string[] = [];
  if (unsubscribeUrl && !hasUnsubscribeLink) {
    parts.push(
      `<a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>`
    );
  }
  if (supportEmail) {
    parts.push(
      `<a href="mailto:${escapeHtml(supportEmail)}" style="color:#6b7280;text-decoration:underline">Contact support</a>`
    );
  }

  const linksHtml = parts.length ? `<div>${parts.join(" &middot; ")}</div>` : "";
  const addressHtml = physicalAddress
    ? `<div style="margin-top:8px">${escapeHtml(physicalAddress)}</div>`
    : "";
  const senderHtml = platformName
    ? `<div style="margin-top:8px">Sent by ${escapeHtml(platformName)}</div>`
    : "";

  if (!linksHtml && !addressHtml && !senderHtml) return html;

  const footer = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#6b7280;line-height:1.5">${linksHtml}${addressHtml}${senderHtml}</div>`;

  if (html.toLowerCase().includes("</body>")) {
    return html.replace(/<\/body>/i, `${footer}</body>`);
  }
  return `${html}${footer}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
