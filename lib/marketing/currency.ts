import { headers } from "next/headers";

import type { CurrencyContext, Currency } from "@/lib/marketing/plans";

export type { Currency, CurrencyContext } from "@/lib/marketing/plans";
export {
  CREDIT_PACKS,
  CREDIT_WEIGHTS,
  PLANS,
  formatPrice,
} from "@/lib/marketing/plans";

const INR_COUNTRIES = new Set(["IN"]);

export async function detectCurrency(): Promise<CurrencyContext> {
  const h = await headers();
  const country =
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    h.get("x-country-code") ??
    null;

  const upper = country?.toUpperCase() ?? null;
  const currency: Currency = upper && INR_COUNTRIES.has(upper) ? "inr" : "usd";

  return {
    currency,
    country: upper,
    symbol: currency === "inr" ? "₹" : "$",
    locale: currency === "inr" ? "en-IN" : "en-US",
  };
}
