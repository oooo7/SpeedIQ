import {
  emailCreditCost,
  smsCreditCost,
  whatsappCreditCost,
  type SmsMessageType,
  type WhatsAppMessageType,
} from "./config";

/**
 * Compute credit cost for an email send. Today: flat 1 credit.
 */
export function emailCost(): number {
  return emailCreditCost("campaign");
}

/**
 * Compute credit cost for a WhatsApp send.
 *
 * Categories map to types per Meta's billing tiers. If category is unknown
 * we conservatively charge the marketing rate.
 */
export function whatsappCost(opts: {
  category?: string | null;
  useHelloWorld?: boolean;
}): { credits: number; type: WhatsAppMessageType } {
  if (opts.useHelloWorld) {
    return { credits: whatsappCreditCost("template_utility"), type: "template_utility" };
  }
  const raw = (opts.category ?? "").toLowerCase();
  if (raw === "marketing") return { credits: whatsappCreditCost("template_marketing"), type: "template_marketing" };
  if (raw === "authentication") return { credits: whatsappCreditCost("template_authentication"), type: "template_authentication" };
  if (raw === "utility") return { credits: whatsappCreditCost("template_utility"), type: "template_utility" };
  if (raw === "service") return { credits: whatsappCreditCost("template_service"), type: "template_service" };
  // Unknown / missing → marketing tier (conservative).
  return { credits: whatsappCreditCost("template_marketing"), type: "template_marketing" };
}

/**
 * Compute credit cost for an SMS send based on destination phone.
 *
 * Indian numbers (+91) are domestic; anything else is international.
 * MMS handling can be added later when media SMS lands.
 */
export function smsCost(phone: string | null | undefined): {
  credits: number;
  type: SmsMessageType;
} {
  const p = (phone ?? "").trim();
  if (p.startsWith("+91")) {
    return { credits: smsCreditCost("domestic"), type: "domestic" };
  }
  return { credits: smsCreditCost("international"), type: "international" };
}
