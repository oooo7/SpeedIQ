import type { Metadata } from "next";

import {
  LegalPageLayout,
  LegalSection,
} from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Data Processing Addendum — SpeedIQ",
  description:
    "SpeedIQ's Data Processing Addendum (DPA) covering processor obligations, sub-processors, security measures, and international transfers.",
  alternates: { canonical: "/legal/dpa" },
  robots: { index: true, follow: true },
};

export default function DpaPage() {
  return (
    <LegalPageLayout
      title="Data Processing Addendum"
      lastUpdated="May 12, 2026"
      intro="This Data Processing Addendum (“DPA”) forms part of the agreement between SpeedIQ (“Processor”) and the customer using the Services (“Controller”). It applies whenever SpeedIQ processes personal data on behalf of the Controller, including under the EU/UK GDPR and India's DPDP Act."
    >
      <LegalSection title="1. Definitions">
        <p>
          Terms used in this DPA, such as “personal data”, “processing”,
          “controller”, “processor”, and “data subject”, have the meaning given
          in applicable data protection laws (including the GDPR, UK GDPR, and
          India&apos;s DPDP Act, as applicable).
        </p>
      </LegalSection>

      <LegalSection title="2. Roles">
        <p>
          The Controller is the entity that determines the purposes and means
          of processing personal data. SpeedIQ acts as a Processor on behalf of
          the Controller for personal data uploaded into the Services
          (contacts, subscribers, message recipients, conversation history).
        </p>
        <p>
          SpeedIQ acts as a Controller for personal data about the
          Controller&apos;s account administrators and team members (their
          names, emails, login credentials), as described in our{" "}
          <a
            href="/legal/privacy"
            className="text-zinc-900 underline dark:text-white"
          >
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Scope of processing">
        <p>
          <strong>Subject matter:</strong> Provision of the SpeedIQ messaging
          platform.
        </p>
        <p>
          <strong>Duration:</strong> For the term of the Controller&apos;s
          subscription, plus any retention period required by law.
        </p>
        <p>
          <strong>Nature & purpose:</strong> Hosting, transmission, analytics,
          authentication, fraud prevention, and customer support — all to
          enable the Controller to send messages and manage conversations with
          its end-users.
        </p>
        <p>
          <strong>Categories of personal data:</strong>
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Contact identifiers (name, phone number, email).</li>
          <li>Message content (templates, campaign bodies, conversation messages, media attachments).</li>
          <li>Engagement metadata (delivery status, opens, clicks, opt-out events).</li>
          <li>Custom fields the Controller chooses to upload.</li>
        </ul>
        <p>
          <strong>Categories of data subjects:</strong> The Controller&apos;s
          end-users (customers, subscribers, leads) and the Controller&apos;s
          team members.
        </p>
      </LegalSection>

      <LegalSection title="4. Processor obligations">
        <p>SpeedIQ undertakes to:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Process personal data only on the Controller&apos;s documented instructions, including with regard to transfers, unless required by law to do otherwise.</li>
          <li>Ensure that personnel authorized to process personal data are bound by confidentiality obligations.</li>
          <li>Implement appropriate technical and organizational security measures (see Section 6).</li>
          <li>Assist the Controller in responding to data subject rights requests.</li>
          <li>Notify the Controller without undue delay of any personal data breach (and in any case within 72 hours of becoming aware).</li>
          <li>On termination of the Services, delete or return personal data as instructed by the Controller, subject to any retention obligations.</li>
          <li>Make available all information necessary to demonstrate compliance with this DPA, and allow for and contribute to audits as required.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Sub-processors">
        <p>
          The Controller authorizes SpeedIQ to engage the following
          sub-processors. We commit to a written agreement with each
          sub-processor imposing equivalent data protection obligations.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 pr-4 font-medium text-zinc-700 dark:text-zinc-300">Sub-processor</th>
                <th className="py-3 pr-4 font-medium text-zinc-700 dark:text-zinc-300">Purpose</th>
                <th className="py-3 pr-4 font-medium text-zinc-700 dark:text-zinc-300">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <SubProcessorRow name="Supabase" purpose="Database, authentication, storage" region="US / EU" />
              <SubProcessorRow name="Vercel" purpose="Application hosting, edge compute" region="Global" />
              <SubProcessorRow name="Stripe" purpose="Payment processing, billing" region="US / EU / IN" />
              <SubProcessorRow name="Meta (WhatsApp Cloud API)" purpose="WhatsApp message delivery" region="Global" />
              <SubProcessorRow name="Twilio" purpose="SMS message delivery" region="US / Global" />
              <SubProcessorRow name="Resend" purpose="Transactional & marketing email delivery" region="US / EU" />
              <SubProcessorRow name="Google (OAuth)" purpose="Authentication via Google sign-in" region="Global" />
            </tbody>
          </table>
        </div>
        <p>
          We will notify the Controller of any intended changes to the list of
          sub-processors at least 30 days in advance, giving the Controller the
          opportunity to object on reasonable grounds.
        </p>
      </LegalSection>

      <LegalSection title="6. Security measures">
        <p>We implement and maintain measures including:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>Encryption.</strong> TLS 1.2+ for data in transit; encrypted at rest on Supabase storage.</li>
          <li><strong>Access controls.</strong> Role-based access with principle of least privilege; multi-factor authentication for staff accounts.</li>
          <li><strong>Row-level security.</strong> All customer-scoped database tables enforce RLS so users cannot read or write data outside their project.</li>
          <li><strong>Webhook integrity.</strong> HMAC signature verification on all inbound webhooks (Stripe, Resend, Twilio, Meta).</li>
          <li><strong>Auditability.</strong> Application and infrastructure logs retained for a minimum of 90 days.</li>
          <li><strong>Vulnerability management.</strong> Regular dependency scanning, security patching, and penetration testing.</li>
          <li><strong>Backups.</strong> Daily automated backups with point-in-time recovery for the primary database.</li>
          <li><strong>Incident response.</strong> Documented incident response plan with named on-call responders.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. International transfers">
        <p>
          Where personal data is transferred from the EU/UK/Switzerland to a
          country not deemed adequate, the parties rely on the European
          Commission&apos;s Standard Contractual Clauses (Module Two: Controller
          to Processor) and equivalent UK and Swiss mechanisms. These are
          deemed incorporated into this DPA by reference.
        </p>
        <p>
          For transfers under India&apos;s DPDP Act, transfers are made only to
          jurisdictions permitted by the Government of India and subject to
          appropriate safeguards.
        </p>
      </LegalSection>

      <LegalSection title="8. Data subject rights">
        <p>
          The Controller is responsible for responding to data subject requests
          (access, rectification, erasure, etc.) regarding the personal data it
          uploads to SpeedIQ. We provide functionality in the dashboard
          (contact deletion, export) and will assist the Controller with
          requests where reasonably required.
        </p>
      </LegalSection>

      <LegalSection title="9. Audit">
        <p>
          The Controller may request a copy of relevant third-party audit
          reports (such as SOC 2, ISO 27001, where available) once per year, on
          reasonable notice and subject to confidentiality. On-site audits are
          available for enterprise Controllers on the Business plan, subject to
          reasonable notice and at the Controller&apos;s expense.
        </p>
      </LegalSection>

      <LegalSection title="10. Return & deletion">
        <p>
          On termination of the Services, the Controller may export its data
          via the dashboard. After the export window (30 days post-termination),
          we delete personal data from the production systems. Backups age out
          on a rolling 30-day basis.
        </p>
      </LegalSection>

      <LegalSection title="11. Liability">
        <p>
          The liability provisions in the main Terms of Service apply to this
          DPA. Nothing in this DPA limits or excludes liability that cannot be
          limited or excluded under applicable law.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact">
        <p>
          Data protection:{" "}
          <a
            href="mailto:dpo@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            dpo@speediq.app
          </a>
          <br />
          Security:{" "}
          <a
            href="mailto:security@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            security@speediq.app
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}

function SubProcessorRow({
  name,
  purpose,
  region,
}: {
  name: string;
  purpose: string;
  region: string;
}) {
  return (
    <tr>
      <td className="py-3 pr-4 font-medium text-zinc-900 dark:text-white">{name}</td>
      <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">{purpose}</td>
      <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-300">{region}</td>
    </tr>
  );
}
