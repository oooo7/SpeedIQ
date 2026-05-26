import type { Metadata } from "next";

import {
  LegalPageLayout,
  LegalSection,
} from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Refund Policy — SpeedIQ",
  description:
    "How refunds work at SpeedIQ — subscription fees, credit packs, trial conversions, and special circumstances.",
  alternates: { canonical: "/legal/refund" },
  robots: { index: true, follow: true },
};

export default function RefundPage() {
  return (
    <LegalPageLayout
      title="Refund Policy"
      lastUpdated="May 12, 2026"
      intro="We want you to be happy with SpeedIQ. This policy explains how refunds work so there are no surprises. By subscribing or purchasing credits, you agree to the terms below."
    >
      <LegalSection title="1. Free trial">
        <p>
          New accounts get a 7-day free trial with 200 credits. You can cancel
          at any time before the trial ends without being charged. If you do not
          cancel before day 8, your subscription automatically converts to the
          plan you selected and your payment method will be charged.
        </p>
      </LegalSection>

      <LegalSection title="2. Subscription fees">
        <p>
          Subscription fees (monthly or yearly) are billed in advance and are
          non-refundable, except as required by applicable law or as expressly
          stated in this policy.
        </p>
        <p>
          <strong>Cancellation.</strong> You can cancel any time from your
          billing dashboard. Cancellation stops the next renewal — you retain
          access to the Services until the end of the current billing period.
          We do not pro-rate refunds for unused time in the current period.
        </p>
        <p>
          <strong>Annual plans.</strong> Annual subscriptions are not refunded
          on cancellation. You retain access for the full prepaid term.
        </p>
      </LegalSection>

      <LegalSection title="3. Credit top-ups">
        <p>
          One-time credit packs purchased on top of a subscription are
          non-refundable once credited to your wallet. Unused top-up credits
          remain available as long as your subscription is active.
        </p>
      </LegalSection>

      <LegalSection title="4. Plan upgrades & downgrades">
        <p>
          <strong>Upgrades</strong> take effect immediately and we charge a
          pro-rated amount for the remainder of the current billing period.
          Additional credits granted by the new plan are added to your wallet
          immediately.
        </p>
        <p>
          <strong>Downgrades</strong> take effect at the end of the current
          billing period. You retain features and credits of the current plan
          until the change applies.
        </p>
      </LegalSection>

      <LegalSection title="5. Exceptional refunds">
        <p>
          We may, at our sole discretion, issue refunds in the following
          situations:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Duplicate charges.</strong> If you were charged twice for the same subscription period, contact us and we will refund the duplicate.</li>
          <li><strong>Documented service outage.</strong> If a confirmed SpeedIQ-side outage prevents you from using core sending features for more than 24 consecutive hours during a paid period, you may request a pro-rated credit for the affected period.</li>
          <li><strong>Unauthorized account access.</strong> If your account was charged due to unauthorized access and you reported it within 7 days of the charge, we will investigate and refund where warranted.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. No refund situations">
        <p>We will not issue refunds for:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Change of mind after the trial period ends.</li>
          <li>Credits consumed by outbound messages (even if those messages failed at the carrier, since carrier costs are passed through).</li>
          <li>Suspension or termination due to a violation of our Terms of Service or Acceptable Use Policy.</li>
          <li>Failures caused by third-party providers (Meta, Twilio, Resend, Stripe) outside our control.</li>
          <li>Subscription fees for periods during which you did not actively use the Services but the subscription remained active.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. How to request a refund">
        <p>
          Email{" "}
          <a
            href="mailto:billing@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            billing@speediq.app
          </a>{" "}
          with the email address on your account, the invoice number (or charge
          date), and the reason for your request. We respond within 5 business
          days and process approved refunds within 7–10 business days via the
          original payment method.
        </p>
      </LegalSection>

      <LegalSection title="8. Taxes">
        <p>
          Refunds, where issued, are net of any non-recoverable taxes (such as
          US state sales tax, Canadian GST/HST/PST, or VAT) that we are
          required to remit to the applicable tax authority. We refund the
          original amount you paid minus any non-recoverable tax components.
        </p>
      </LegalSection>

      <LegalSection title="9. Statutory rights">
        <p>
          Nothing in this policy affects your non-waivable statutory rights as
          a consumer under applicable law in your jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Billing questions:{" "}
          <a
            href="mailto:billing@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            billing@speediq.app
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
