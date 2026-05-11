export function normalizeSmsPhone(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  const sanitized = trimmed.replace(/[^\d+]/g, "");
  if (sanitized.startsWith("+")) {
    return `+${sanitized.slice(1).replace(/\D/g, "")}`;
  }
  const digits = sanitized.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export function isValidSmsPhone(input: string): boolean {
  const normalized = normalizeSmsPhone(input);
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}
