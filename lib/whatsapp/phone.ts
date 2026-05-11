/**
 * WhatsApp phone number utilities.
 * E.164 standard: digits only, 7–15 chars, no leading +.
 * WhatsApp requires the full international number (country code + number).
 */

/** Strip everything except digits. */
export function digitsOnly(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

/**
 * Normalize a phone number for storage and sending.
 * - Strips all non-digit characters
 * - Removes a single leading zero (local format artifact, e.g. "09876..." → "9876...")
 *   only when the resulting number would still be ≥ 10 digits (avoids over-stripping).
 */
export function normalizePhone(raw: string): string {
  let digits = digitsOnly(raw);
  // Strip leading zero only if it keeps length ≥ 10 (prevents removing valid prefix)
  if (digits.startsWith("0") && digits.length > 10) {
    digits = digits.slice(1);
  }
  return digits;
}

export type PhoneValidation =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Validate a normalized (digits-only) phone number.
 * Returns { valid: true } or { valid: false, reason }.
 */
export function validatePhone(phone: string): PhoneValidation {
  const digits = digitsOnly(phone);
  if (digits.length === 0) return { valid: false, reason: "Phone number is required" };
  if (digits.length < 7)   return { valid: false, reason: "Phone number is too short — include the country code" };
  if (digits.length > 15)  return { valid: false, reason: "Phone number is too long (max 15 digits)" };
  if (digits.length < 10)  return { valid: false, reason: "Phone number looks too short — make sure to include the country code (e.g. 91 for India)" };
  return { valid: true };
}

/** Quick boolean check — true if number passes validation. */
export function isValidPhone(phone: string): boolean {
  return validatePhone(phone).valid;
}

/**
 * Format a normalized phone number for display.
 * e.g. "919876543210" → "+91 98765 43210"
 */
export function formatPhoneDisplay(phone: string): string {
  const d = digitsOnly(phone);
  if (!d) return phone;
  return `+${d}`;
}
