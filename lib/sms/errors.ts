export function getFriendlySmsErrorMessage(message: string, code?: number | string): string {
  const text = String(message ?? "").toLowerCase();
  const normalizedCode = String(code ?? "");

  if (normalizedCode === "21610" || text.includes("21610")) {
    return "This contact has opted out and cannot receive campaign messages.";
  }
  if (normalizedCode === "30003" || text.includes("unreachable")) {
    return "The destination phone is unreachable right now.";
  }
  if (normalizedCode === "30007" || text.includes("filtered")) {
    return "The carrier filtered this message. Check content and compliance settings.";
  }
  if (normalizedCode === "30008" || text.includes("unknown error")) {
    return "The carrier reported a temporary delivery issue.";
  }
  if (normalizedCode === "21211" || text.includes("not a valid phone number")) {
    return "The phone number is not valid for SMS delivery.";
  }
  if (normalizedCode === "21614" || text.includes("not a valid mobile number")) {
    return "This number cannot receive SMS messages.";
  }
  if (text.includes("authenticate") || text.includes("authorization")) {
    return "SMS provider authentication failed. Check Twilio credentials.";
  }
  return message || "Failed to send SMS message.";
}

export function isRetryableSmsError(code?: number | string): boolean {
  const normalized = String(code ?? "");
  return ["30001", "30002", "30003", "30005", "30008"].includes(normalized);
}
