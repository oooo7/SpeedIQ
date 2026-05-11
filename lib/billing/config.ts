/**
 * Plan + credit-weight configuration.
 *
 * Plans seeded in DB (subscription_plans table). This file mirrors them for
 * Stripe price-ID lookup, credit weights, and TS-level access.
 */

export type PlanId = "starter" | "pro" | "business";
export type BillingCycle = "monthly" | "yearly";
export type BillingCurrency = "inr" | "usd";

export interface PlanPricing {
  monthly_inr: number;
  yearly_inr: number;
  monthly_usd: number;
  yearly_usd: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  pricing: PlanPricing;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    pricing: { monthly_inr: 999, yearly_inr: 9590, monthly_usd: 12, yearly_usd: 115 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    pricing: { monthly_inr: 2499, yearly_inr: 23990, monthly_usd: 29, yearly_usd: 278 },
  },
  business: {
    id: "business",
    name: "Business",
    pricing: { monthly_inr: 6999, yearly_inr: 67190, monthly_usd: 79, yearly_usd: 759 },
  },
};

export const TRIAL_DAYS = 7;
export const TRIAL_CREDITS = 200;

/**
 * Stripe price ID lookup, sourced from env at runtime so prices can be rotated
 * without code changes.
 */
export function getStripePriceId(
  plan: PlanId,
  cycle: BillingCycle,
  currency: BillingCurrency,
): string | undefined {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}_${currency.toUpperCase()}`;
  return process.env[key];
}

// ---------------------------------------------------------------------------
// Credit weights (per send)
// ---------------------------------------------------------------------------

export type Channel = "email" | "whatsapp" | "sms" | "ai";

export type EmailMessageType = "campaign" | "transactional";
export type WhatsAppMessageType =
  | "session"
  | "template_utility"
  | "template_authentication"
  | "template_marketing"
  | "template_service";
export type SmsMessageType = "domestic" | "international" | "mms";

export const CREDIT_WEIGHTS = {
  email: {
    campaign: 1,
    transactional: 1,
  } satisfies Record<EmailMessageType, number>,
  whatsapp: {
    session: 2,
    template_utility: 3,
    template_authentication: 3,
    template_service: 3,
    template_marketing: 5,
  } satisfies Record<WhatsAppMessageType, number>,
  sms: {
    domestic: 5,
    international: 15,
    mms: 8,
  } satisfies Record<SmsMessageType, number>,
  ai: 10,
} as const;

export function emailCreditCost(_type: EmailMessageType = "campaign"): number {
  return CREDIT_WEIGHTS.email[_type];
}

export function whatsappCreditCost(type: WhatsAppMessageType): number {
  return CREDIT_WEIGHTS.whatsapp[type];
}

export function smsCreditCost(type: SmsMessageType): number {
  return CREDIT_WEIGHTS.sms[type];
}

// ---------------------------------------------------------------------------
// Credit top-up packs
// ---------------------------------------------------------------------------

export interface CreditPack {
  id: string;
  credits: number;
  price_inr: number;
  price_usd: number;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "credits_5k", credits: 5000, price_inr: 499, price_usd: 6 },
  { id: "credits_25k", credits: 25000, price_inr: 1999, price_usd: 24 },
  { id: "credits_100k", credits: 100000, price_inr: 6999, price_usd: 84 },
  { id: "credits_500k", credits: 500000, price_inr: 29999, price_usd: 359 },
];

export function getCreditPackPriceId(
  packId: string,
  currency: BillingCurrency,
): string | undefined {
  // packId 'credits_5k' -> env 'STRIPE_PRICE_CREDITS_5K_INR' (or _USD)
  const upper = packId.toUpperCase();
  const cur = currency.toUpperCase();
  return process.env[`STRIPE_PRICE_${upper}_${cur}`];
}

export function getCreditPackByPriceId(priceId: string): CreditPack | null {
  for (const pack of CREDIT_PACKS) {
    if (
      getCreditPackPriceId(pack.id, "inr") === priceId ||
      getCreditPackPriceId(pack.id, "usd") === priceId
    ) {
      return pack;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plan lookup from Stripe price ID (used by webhook)
// ---------------------------------------------------------------------------

export interface PlanMatch {
  plan: PlanId;
  cycle: BillingCycle;
  currency: BillingCurrency;
}

export function matchPlanByPriceId(priceId: string): PlanMatch | null {
  const plans: PlanId[] = ["starter", "pro", "business"];
  const cycles: BillingCycle[] = ["monthly", "yearly"];
  const currencies: BillingCurrency[] = ["inr", "usd"];
  for (const p of plans) {
    for (const c of cycles) {
      for (const cur of currencies) {
        if (getStripePriceId(p, c, cur) === priceId) {
          return { plan: p, cycle: c, currency: cur };
        }
      }
    }
  }
  return null;
}
