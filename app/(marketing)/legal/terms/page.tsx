import type { Metadata } from "next";

import {
  LegalPageLayout,
  LegalSection,
} from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Terms of Service — SpeedIQ",
  description:
    "The agreement between you and SpeedIQ covering use of the platform, plans, billing, acceptable use, and liability.",
  alternates: { canonical: "/legal/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="May 12, 2026"
      intro="These Terms of Service (“Terms”) govern your access to and use of SpeedIQ. By creating an account or using the Services, you agree to these Terms. If you are using SpeedIQ on behalf of an organization, you confirm that you have authority to bind that organization."
    >
      <LegalSection title="1. The service">
        <p>
          SpeedIQ provides a multi-channel messaging platform for businesses to
          send WhatsApp, email, and SMS communications to their own customers,
          manage conversations, and analyze engagement. We provide the platform
          on a subscription basis with usage-based credits.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts">
        <p>
          You must provide accurate registration information and keep it
          up-to-date. You are responsible for safeguarding your password and for
          any activity under your account. Notify us immediately of any
          unauthorized access. You must be at least 18 years old (or the age of
          majority in your jurisdiction) to use SpeedIQ.
        </p>
      </LegalSection>

      <LegalSection title="3. Plans, credits, and billing">
        <p>
          SpeedIQ offers subscription plans (Starter, Pro, Business) on monthly
          or annual billing cycles. Each plan includes a monthly credit
          allowance for outbound messages. Different message types consume
          different credit amounts (see our pricing page).
        </p>
        <p>
          <strong>Trial.</strong> New accounts receive a 7-day free trial with
          200 trial credits. Unless you cancel before the trial ends, your
          subscription will automatically convert to a paid plan and your
          payment method will be charged.
        </p>
        <p>
          <strong>Renewals.</strong> Subscriptions automatically renew at the
          end of each billing cycle. You can cancel at any time from your
          billing dashboard. Cancellation takes effect at the end of the current
          billing cycle.
        </p>
        <p>
          <strong>Credit rollover.</strong> Unused monthly credits roll forward
          for 30 days while your subscription remains active. Top-up credits do
          not expire as long as your subscription is active.
        </p>
        <p>
          <strong>Failed payment.</strong> If a payment fails, we will retry and
          notify you. If payment remains unresolved, your account may be
          downgraded or suspended after 14 days.
        </p>
        <p>
          See our{" "}
          <a
            href="/legal/refund"
            className="text-zinc-900 underline dark:text-white"
          >
            Refund Policy
          </a>{" "}
          for refund terms.
        </p>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          You retain all rights to the content you upload to SpeedIQ —
          contacts, templates, campaigns, conversations, and so on (“Your
          Content”). You grant us a limited license to host, process, transmit,
          and display Your Content solely to provide the Services.
        </p>
        <p>
          You are responsible for Your Content and for ensuring it complies
          with applicable laws (including consent and data protection
          requirements for messaging recipients).
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>
          You must follow our{" "}
          <a
            href="/legal/acceptable-use"
            className="text-zinc-900 underline dark:text-white"
          >
            Acceptable Use Policy
          </a>
          , which prohibits — among other things — sending unsolicited
          messages, illegal content, harassment, malware, and fraud. We may
          suspend or terminate accounts that violate this policy without
          notice.
        </p>
      </LegalSection>

      <LegalSection title="6. Third-party channels">
        <p>
          SpeedIQ integrates with third-party providers including Meta
          (WhatsApp), Twilio (SMS), Resend (email), and Stripe (payments). Your
          use of those channels is subject to their respective terms of service
          and pricing. We are not responsible for the availability, content,
          accuracy, or policies of third-party services.
        </p>
        <p>
          You are responsible for maintaining your own accounts with these
          providers where required (e.g., your own Twilio account for SMS).
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          The Services, including all software, design, text, graphics, and
          underlying technology, are the intellectual property of SpeedIQ or our
          licensors. We grant you a limited, non-exclusive, non-transferable
          license to use the Services in accordance with these Terms.
        </p>
        <p>
          You may not copy, modify, reverse-engineer, or create derivative works
          based on the Services except as expressly permitted by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="8. Confidentiality">
        <p>
          Each party agrees to protect the other party&apos;s confidential
          information using the same degree of care it uses to protect its own,
          and at least reasonable care. Confidential information does not
          include information that is public, independently developed, or
          rightfully received from a third party without restriction.
        </p>
      </LegalSection>

      <LegalSection title="9. Suspension & termination">
        <p>
          We may suspend or terminate your access to the Services immediately
          if you breach these Terms, present a security risk, fail to pay, or
          if required by law. You may terminate at any time by closing your
          account.
        </p>
        <p>
          Upon termination, your right to use the Services ends. We will retain
          and delete your data as described in our{" "}
          <a
            href="/legal/privacy"
            className="text-zinc-900 underline dark:text-white"
          >
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Warranties & disclaimers">
        <p>
          The Services are provided on an &ldquo;AS IS&rdquo; and &ldquo;AS
          AVAILABLE&rdquo; basis. To the maximum extent permitted by law, we
          disclaim all warranties, express or implied, including merchantability,
          fitness for a particular purpose, non-infringement, and any
          warranties arising from course of dealing or usage of trade.
        </p>
        <p>
          We do not warrant that the Services will be uninterrupted, error-free,
          or that all defects will be corrected. Message delivery depends on
          third-party carriers and providers and is not guaranteed.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, SpeedIQ and its officers,
          directors, employees, and agents will not be liable for any indirect,
          incidental, special, consequential, or punitive damages, or any loss
          of profits or revenues, whether incurred directly or indirectly, or
          any loss of data, use, goodwill, or other intangible losses.
        </p>
        <p>
          Our aggregate liability for any claim arising from these Terms shall
          not exceed the amount you paid to SpeedIQ in the 12 months preceding
          the event giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection title="12. Indemnification">
        <p>
          You agree to indemnify and hold SpeedIQ harmless from any claims,
          damages, liabilities, and expenses (including reasonable
          attorneys&apos; fees) arising from your use of the Services, your
          breach of these Terms, your violation of any law, or your infringement
          of any third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law & disputes">
        <p>
          These Terms are governed by the laws of the jurisdiction in which
          SpeedIQ is registered, without regard to conflict-of-law principles.
          Any dispute arising from these Terms shall be subject to the
          exclusive jurisdiction of the competent courts of that jurisdiction.
        </p>
        <p>
          Replace this paragraph with your registered city and state before
          publishing this policy. For customers in other jurisdictions,
          mandatory local consumer-protection laws may still apply.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to these Terms">
        <p>
          We may modify these Terms from time to time. Material changes will be
          notified via email and/or in-app notice at least 30 days before
          taking effect. Continued use of the Services after changes take
          effect constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="15. Miscellaneous">
        <p>
          These Terms, together with our Privacy Policy, DPA, Refund Policy,
          Cookie Policy, and Acceptable Use Policy, constitute the entire
          agreement between you and SpeedIQ. If any provision is found
          unenforceable, the remainder shall remain in effect. Our failure to
          enforce any right is not a waiver.
        </p>
      </LegalSection>

      <LegalSection title="16. Contact">
        <p>
          For questions about these Terms, contact{" "}
          <a
            href="mailto:legal@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            legal@speediq.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
