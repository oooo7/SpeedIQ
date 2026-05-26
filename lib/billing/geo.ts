import type { BillingCurrency } from "./config";

/**
 * Country codes that should default to INR pricing. Today: India only.
 * Add SAARC neighbours here later if you decide they should see INR.
 */
const INR_COUNTRIES = new Set(["IN"]);

/**
 * Returns the country code carried by the edge headers, or null if none of
 * the headers we recognize are present. Vercel/Cloudflare/custom edge proxies
 * each set their own header — we accept all common ones.
 */
export function countryFromHeaders(headers: Headers): string | null {
  const raw =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country-code") ??
    null;
  return raw ? raw.toUpperCase() : null;
}

/**
 * Pick the right default currency for an incoming request. India → INR,
 * everything else (and unknown) → USD.
 */
export function currencyForCountry(country: string | null): BillingCurrency {
  if (country && INR_COUNTRIES.has(country)) return "inr";
  return "usd";
}

/**
 * Convenience: pull country from headers and resolve currency in one call.
 */
export function suggestedCurrencyFromHeaders(headers: Headers): {
  country: string | null;
  currency: BillingCurrency;
} {
  const country = countryFromHeaders(headers);
  return { country, currency: currencyForCountry(country) };
}
