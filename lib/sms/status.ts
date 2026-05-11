export type SmsMessageStatus =
  | "queued"
  | "accepted"
  | "scheduled"
  | "sent"
  | "delivered"
  | "undelivered"
  | "failed"
  | "canceled"
  | "received";

export function normalizeTwilioStatus(status: string | null | undefined): SmsMessageStatus {
  const value = (status ?? "").toLowerCase();
  if (value === "accepted") return "accepted";
  if (value === "scheduled") return "scheduled";
  if (value === "sent") return "sent";
  if (value === "delivered") return "delivered";
  if (value === "undelivered") return "undelivered";
  if (value === "failed") return "failed";
  if (value === "canceled") return "canceled";
  if (value === "received" || value === "receiving") return "received";
  return "queued";
}

export function recipientStatusFromMessageStatus(status: SmsMessageStatus): "pending" | "queued" | "sent" | "delivered" | "undelivered" | "failed" {
  if (status === "accepted" || status === "scheduled" || status === "queued") return "queued";
  if (status === "sent") return "sent";
  if (status === "delivered") return "delivered";
  if (status === "undelivered") return "undelivered";
  if (status === "failed") return "failed";
  return "pending";
}
