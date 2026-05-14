import type { Metadata } from "next";

import {
  LegalPageLayout,
  LegalSection,
} from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — SpeedIQ",
  description:
    "How SpeedIQ collects, uses, stores, and protects your personal data. Compliant with GDPR, CCPA, and PIPEDA.",
  alternates: { canonical: "/legal/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="May 12, 2026"
      intro="This Privacy Policy describes how SpeedIQ (“SpeedIQ”, “we”, “us”) collects, uses, discloses, and protects personal information when you use our website, applications, and services (collectively, the “Services”). We aim to be transparent about what we do with your data and what rights you have over it."
    >
      <LegalSection title="1. Who we are">
        <p>
          SpeedIQ is a multi-channel messaging platform that enables businesses
          to send WhatsApp, email, and SMS communications to their own
          customers. We operate as a data controller for the personal
          information of our own customers (the people who sign up for SpeedIQ
          accounts) and as a data processor for the personal information our
          customers upload about their end-users (such as contacts, subscribers,
          and recipients).
        </p>
        <p>
          If you are an end-user receiving a message sent through SpeedIQ, the
          sender — our customer — is the data controller for your information.
          We can only act on instructions from that sender.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>
          <strong>Account information.</strong> When you create an account we
          collect your name, email address, password (stored hashed), profile
          picture (optional), and authentication provider identifiers (e.g.,
          Google OAuth subject ID).
        </p>
        <p>
          <strong>Project & workspace data.</strong> Project names, team-member
          email addresses and roles, invitations, and project preferences
          (working hours, custom branding, etc.).
        </p>
        <p>
          <strong>Billing information.</strong> Stripe Customer ID, billing
          address, last four digits of payment method, subscription state, and
          invoice metadata. Card numbers are never stored on our servers —
          Stripe handles all card data.
        </p>
        <p>
          <strong>Messaging content.</strong> Templates you create, campaigns
          you build, contact lists you upload, and conversation history between
          you and your end-users. This includes phone numbers, email addresses,
          custom fields, message bodies, and delivery metadata.
        </p>
        <p>
          <strong>Usage data.</strong> Log files including IP address, browser
          type, device identifiers, pages visited, features used, timestamps,
          and error reports. We use this to operate and improve the Services.
        </p>
        <p>
          <strong>Cookies & similar technologies.</strong> See our{" "}
          <a
            href="/legal/cookies"
            className="text-zinc-900 underline dark:text-white"
          >
            Cookie Policy
          </a>{" "}
          for full details.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <ul className="ml-5 list-disc space-y-2">
          <li>To provide the Services, authenticate you, and personalize the experience.</li>
          <li>To process payments and send billing communications.</li>
          <li>To send transactional emails (account verification, password reset, billing receipts, security alerts) — you cannot opt out of these while you have an active account.</li>
          <li>To send product updates, occasional newsletters, and announcements (you can opt out at any time).</li>
          <li>To monitor service performance, detect abuse, and improve reliability.</li>
          <li>To comply with legal obligations and respond to lawful requests.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Legal bases (GDPR)">
        <p>
          For users in the European Economic Area, United Kingdom, or
          Switzerland, we process your personal data under one or more of the
          following legal bases:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Contract</strong> — to perform our agreement with you.</li>
          <li><strong>Legitimate interests</strong> — to operate, improve, and secure the Services.</li>
          <li><strong>Consent</strong> — for cookies and marketing communications, where required.</li>
          <li><strong>Legal obligation</strong> — to comply with applicable laws.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How we share information">
        <p>We share personal data only as described below:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <strong>Service providers (sub-processors).</strong> See our{" "}
            <a
              href="/legal/dpa"
              className="text-zinc-900 underline dark:text-white"
            >
              Data Processing Addendum
            </a>{" "}
            for the current list. We use Supabase (database & auth), Stripe
            (payments), Resend (email delivery), Twilio (SMS), Meta (WhatsApp
            Cloud API), Vercel (hosting), and similar providers.
          </li>
          <li><strong>With your direction.</strong> When you send a message via SpeedIQ, the message content and recipient details are routed to the relevant channel provider (Meta, Resend, Twilio) under your instructions.</li>
          <li><strong>Legal requirements.</strong> When required by law, court order, or to protect rights, property, or safety.</li>
          <li><strong>Business transfers.</strong> In connection with a merger, acquisition, or asset sale, where the acquirer agrees to honor this policy.</li>
        </ul>
        <p>We do not sell personal information. We do not share personal information for cross-context behavioural advertising.</p>
      </LegalSection>

      <LegalSection title="6. International transfers">
        <p>
          Our servers and our sub-processors operate globally. When personal
          data is transferred outside your home jurisdiction, we rely on
          appropriate safeguards — such as the Standard Contractual Clauses
          approved by the European Commission and equivalent mechanisms — to
          protect that data.
        </p>
      </LegalSection>

      <LegalSection title="7. Retention">
        <p>
          We retain personal data for as long as your account is active or as
          needed to provide the Services. Specifically:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Account & billing data:</strong> for the life of the account, plus up to 7 years to meet tax and accounting obligations.</li>
          <li><strong>Contact, campaign, and conversation data:</strong> for the life of the project, until you delete it.</li>
          <li><strong>Logs & analytics:</strong> typically 90 days, longer for security events.</li>
          <li><strong>Backups:</strong> rolling 30 days.</li>
        </ul>
        <p>If you close your account, we delete personal data within 30 days, except where retention is legally required.</p>
      </LegalSection>

      <LegalSection title="8. Your rights">
        <p>Depending on where you live, you have the following rights:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
          <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
          <li><strong>Erasure</strong> — request deletion (subject to legal exceptions).</li>
          <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
          <li><strong>Restriction & objection</strong> — limit or object to certain processing.</li>
          <li><strong>Withdraw consent</strong> — where processing is based on consent.</li>
          <li><strong>Complain</strong> — lodge a complaint with your local data protection authority.</li>
        </ul>
        <p>
          California residents under the CCPA/CPRA additionally have the right
          to opt out of the sale or sharing of personal information and to
          limit the use of sensitive personal information. Canadian residents
          under PIPEDA have parallel rights of access and correction through
          our designated privacy officer.
        </p>
        <p>
          To exercise any of these rights, email{" "}
          <a
            href="mailto:privacy@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            privacy@speediq.app
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We follow industry-standard practices to protect personal data:
          TLS-encrypted transit, encrypted-at-rest databases, principle of least
          privilege, audit logging on sensitive operations, and Row-Level
          Security on all customer-scoped tables. No system is perfectly secure,
          but we work to keep the bar high.
        </p>
      </LegalSection>

      <LegalSection title="10. Children">
        <p>
          The Services are not directed to children under 16. We do not
          knowingly collect personal data from children. If you believe a child
          has provided us personal data, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. Material changes will be
          notified via email and/or in-app notice. The “Last updated” date at
          the top of this page indicates when this policy was last revised.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact us">
        <p>
          Privacy questions:{" "}
          <a
            href="mailto:privacy@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            privacy@speediq.app
          </a>
          <br />
          Data protection enquiries:{" "}
          <a
            href="mailto:dpo@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            dpo@speediq.app
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
