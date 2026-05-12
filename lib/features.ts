/**
 * Feature flags. Each is a kill switch — flip the env var to "false" to lock
 * the feature without removing any code or data.
 *
 * NEXT_PUBLIC_* so the same value reaches both server and client at build time.
 * Default: enabled. Only the literal string "false" disables.
 */

function isEnabled(value: string | undefined): boolean {
  return value !== "false";
}

export const BILLING_ENABLED = isEnabled(process.env.NEXT_PUBLIC_BILLING_ENABLED);
export const EMAIL_ENABLED = isEnabled(process.env.NEXT_PUBLIC_EMAIL_ENABLED);
export const SMS_ENABLED = isEnabled(process.env.NEXT_PUBLIC_SMS_ENABLED);

export const FEATURES = {
  billing: BILLING_ENABLED,
  email: EMAIL_ENABLED,
  sms: SMS_ENABLED,
} as const;

export type FeatureKey = keyof typeof FEATURES;
