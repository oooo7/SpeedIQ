import { createAdminClient } from "@/lib/supabase/admin";

import { razorpayProvider } from "./razorpay-provider";
import { stripeProvider } from "./stripe-provider";

import type { BillingCurrency } from "@/lib/billing/config";
import type { PaymentProvider, ProviderId } from "./types";

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  stripe: stripeProvider,
  razorpay: razorpayProvider,
};

/**
 * Default currency → provider routing. Read live from platform_settings on
 * each lookup; cached briefly to avoid hitting DB for every checkout call.
 * platform_settings is admin-editable so this can be retuned without a deploy.
 */
const ROUTING_CACHE_TTL_MS = 60_000;
let routingCache: { value: Record<BillingCurrency, ProviderId>; ts: number } | null = null;

async function getCurrencyRouting(): Promise<Record<BillingCurrency, ProviderId>> {
  const now = Date.now();
  if (routingCache && now - routingCache.ts < ROUTING_CACHE_TTL_MS) {
    return routingCache.value;
  }

  const fallback: Record<BillingCurrency, ProviderId> = {
    inr: "razorpay",
    usd: "stripe",
  };

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["preferred_provider_inr", "preferred_provider_usd"]);
    const inrRow = data?.find((d) => d.key === "preferred_provider_inr");
    const usdRow = data?.find((d) => d.key === "preferred_provider_usd");
    const value: Record<BillingCurrency, ProviderId> = {
      inr: isProviderId(inrRow?.value) ? inrRow.value : fallback.inr,
      usd: isProviderId(usdRow?.value) ? usdRow.value : fallback.usd,
    };
    routingCache = { value, ts: now };
    return value;
  } catch (err) {
    console.error("[provider-router] failed to load settings; using defaults", err);
    return fallback;
  }
}

function isProviderId(v: unknown): v is ProviderId {
  return v === "stripe" || v === "razorpay";
}

/**
 * Resolve which provider to use for a given currency and project, in priority:
 *   1. Project's preferred_provider (if not 'auto')
 *   2. platform_settings.preferred_provider_<currency>
 *   3. Hardcoded fallback (INR → Razorpay, USD → Stripe)
 */
export async function getProviderFor(
  currency: BillingCurrency,
  projectId?: string,
): Promise<PaymentProvider> {
  if (projectId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("project_subscriptions")
      .select("preferred_provider")
      .eq("project_id", projectId)
      .maybeSingle();
    const pref = data?.preferred_provider;
    if (pref && pref !== "auto" && isProviderId(pref)) {
      return PROVIDERS[pref];
    }
  }

  const routing = await getCurrencyRouting();
  return PROVIDERS[routing[currency]];
}

export function getProviderById(id: ProviderId): PaymentProvider {
  return PROVIDERS[id];
}

/** Invalidate the routing cache (call this after admin updates settings). */
export function invalidateRoutingCache(): void {
  routingCache = null;
}
