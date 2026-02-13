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
