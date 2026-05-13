/**
 * Payment provider abstraction. Each implementation (Stripe, Razorpay)
 * conforms to this interface so the rest of the app stays provider-agnostic.
 *
 * Two output shapes for checkout:
 *  - `redirect`: provider hosts the checkout page; we redirect the browser
 *    (Stripe Checkout Sessions, Razorpay hosted checkout).
 *  - `client_handler`: client opens the provider's JS SDK with a server-created
 *    session id/order id and a key (Razorpay Checkout.js).
 *
 * `redirect` is the path of least resistance and works for Stripe. Razorpay
 * supports a hosted checkout via short-url for subscriptions, so we use
 * `redirect` there too where possible to keep both providers symmetrical.
 */

import type { BillingCurrency, BillingCycle, PlanId } from "../config";

export type ProviderId = "stripe" | "razorpay";

export type CheckoutKind = "redirect" | "client_handler";

export interface RedirectCheckout {
  kind: "redirect";
  url: string;
  sessionId: string;
}

export interface ClientHandlerCheckout {
  kind: "client_handler";
  sessionId: string;
  publishableKey: string;
  clientPayload: Record<string, unknown>;
}

export type CheckoutResult = RedirectCheckout | ClientHandlerCheckout;

export interface SubscriptionCheckoutArgs {
  projectId: string;
  ownerEmail: string;
  projectName: string;
  plan: PlanId;
  cycle: BillingCycle;
  currency: BillingCurrency;
  successPath?: string;
  cancelPath?: string;
}

export interface TopUpCheckoutArgs {
  projectId: string;
  ownerEmail: string;
  projectName: string;
  packId: string;
  currency: BillingCurrency;
  successPath?: string;
  cancelPath?: string;
}

export interface PortalArgs {
  projectId: string;
  returnPath?: string;
}

export interface PaymentProvider {
  readonly id: ProviderId;

  /** Get-or-create the per-project customer record on the provider. */
  ensureCustomer(args: {
    projectId: string;
    ownerEmail: string;
    projectName: string;
  }): Promise<string>;

  /** Start a subscription checkout. Returns either a redirect URL or a client payload. */
  createSubscriptionCheckout(args: SubscriptionCheckoutArgs): Promise<CheckoutResult>;

  /** Start a one-time top-up purchase. */
  createTopUpCheckout(args: TopUpCheckoutArgs): Promise<CheckoutResult>;

  /**
   * Open a hosted self-serve portal for the project's customer. Stripe has one;
   * Razorpay does not — implementations that don't support this throw.
   */
  createBillingPortalSession(args: PortalArgs): Promise<{ url: string }>;

  /** Cancel an active subscription. */
  cancelSubscription(args: {
    subscriptionId: string;
    cancelAtCycleEnd?: boolean;
  }): Promise<void>;
}
