export type Currency = "inr" | "usd";

export interface CurrencyContext {
  currency: Currency;
  country: string | null;
  symbol: string;
  locale: string;
}

export function formatPrice(value: number, ctx: CurrencyContext): string {
  if (ctx.currency === "inr") {
    return `${ctx.symbol}${value.toLocaleString("en-IN")}`;
  }
  return `${ctx.symbol}${value.toLocaleString("en-US")}`;
}

export interface PlanPricing {
  id: "starter" | "pro" | "business";
  name: string;
  monthly: { inr: number; usd: number };
  yearly: { inr: number; usd: number };
  monthlyEquivalentYearly: { inr: number; usd: number };
  credits: number;
  contacts: number;
  seats: number | null;
  blurb: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS: PlanPricing[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: { inr: 999, usd: 12 },
    yearly: { inr: 9590, usd: 115 },
    monthlyEquivalentYearly: { inr: 799, usd: 10 },
    credits: 5000,
    contacts: 5000,
    seats: 3,
    blurb: "Everything a small team needs to start sending.",
    features: [
      "WhatsApp + Email channels",
      "5,000 message credits / month",
      "5,000 contacts · 3 team seats",
      "Live inbox with quick replies",
      "Custom email domain",
      "Basic automations",
      "30-day analytics retention",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: { inr: 2499, usd: 29 },
    yearly: { inr: 23990, usd: 278 },
    monthlyEquivalentYearly: { inr: 1999, usd: 23 },
    credits: 15000,
    contacts: 25000,
    seats: 10,
    blurb: "For growing teams that need every channel and automation.",
    highlight: true,
    features: [
      "WhatsApp + Email + SMS",
      "15,000 message credits / month",
      "25,000 contacts · 10 team seats",
      "Full automations + branching",
      "API access + webhooks",
      "Custom branding",
      "90-day analytics retention",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthly: { inr: 6999, usd: 79 },
    yearly: { inr: 67190, usd: 759 },
    monthlyEquivalentYearly: { inr: 5599, usd: 63 },
    credits: 50000,
    contacts: 100000,
    seats: null,
    blurb: "High-volume senders that need control, audit and AI.",
    features: [
      "Everything in Pro",
      "50,000 message credits / month",
      "100,000 contacts · Unlimited seats",
      "AI assist for replies & copy",
      "Branching automations",
      "Audit log + custom roles",
      "Priority support + 99.9% SLA",
      "1-year analytics retention",
    ],
  },
];

export interface CreditPack {
  id: string;
  credits: number;
  inr: number;
  usd: number;
  discount?: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "5k", credits: 5000, inr: 499, usd: 6 },
  { id: "25k", credits: 25000, inr: 1999, usd: 23, discount: "20% off" },
  { id: "100k", credits: 100000, inr: 6999, usd: 79, discount: "30% off" },
  { id: "500k", credits: 500000, inr: 29999, usd: 339, discount: "40% off" },
];

export interface CreditWeight {
  channel: string;
  credits: number;
  note?: string;
}

export const CREDIT_WEIGHTS: CreditWeight[] = [
  { channel: "Email", credits: 1, note: "per sent email" },
  { channel: "WhatsApp session message", credits: 2, note: "within 24h reply window" },
  { channel: "WhatsApp utility / auth template", credits: 3 },
  { channel: "WhatsApp marketing template", credits: 5 },
  { channel: "SMS domestic (US/Canada)", credits: 5 },
  { channel: "SMS MMS", credits: 8 },
  { channel: "SMS international", credits: 15 },
  { channel: "AI assist", credits: 10, note: "per generation" },
];
