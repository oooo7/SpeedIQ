/**
 * Standard variables available in email templates. Used for copy chips and hints.
 */
export const EMAIL_TEMPLATE_VARIABLES = [
  { key: "first_name", placeholder: "{{first_name}}", label: "First name" },
  { key: "last_name", placeholder: "{{last_name}}", label: "Last name" },
  { key: "name", placeholder: "{{name}}", label: "Full name" },
  { key: "email", placeholder: "{{email}}", label: "Email" },
  { key: "unsubscribe_url", placeholder: "{{unsubscribe_url}}", label: "Unsubscribe link" },
] as const;

/** Sample values for live preview (no real links). */
export const EMAIL_PREVIEW_VARIABLES: Record<string, string> = {
  first_name: "Alex",
  last_name: "Smith",
  name: "Alex Smith",
  email: "alex@example.com",
  unsubscribe_url: "#unsubscribe",
};
