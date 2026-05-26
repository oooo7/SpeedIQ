import type { Metadata } from "next";

import {
  LegalPageLayout,
  LegalSection,
} from "@/components/marketing/legal-page-layout";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — SpeedIQ",
  description:
    "What you can and cannot do with SpeedIQ. Anti-spam, opt-in requirements, prohibited content, and consequences of violation.",
  alternates: { canonical: "/legal/acceptable-use" },
  robots: { index: true, follow: true },
};

export default function AupPage() {
  return (
    <LegalPageLayout
      title="Acceptable Use Policy"
      lastUpdated="May 12, 2026"
      intro="This Acceptable Use Policy (“AUP”) governs how you may use SpeedIQ. It's designed to protect recipients, protect the reputation of WhatsApp/email/SMS as channels, and protect SpeedIQ itself. Violations may result in suspension or termination of your account."
    >
      <LegalSection title="1. Consent & opt-in">
        <p>
          You may only send messages through SpeedIQ to recipients who have
          given prior consent. For each channel, you must:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li><strong>WhatsApp:</strong> Have explicit opt-in following Meta&apos;s Business Messaging Policy. Marketing messages require opt-in with a clear description of what the recipient will receive.</li>
          <li><strong>Email:</strong> Comply with CAN-SPAM (US), CASL (Canada), GDPR (EU/UK), and equivalent laws — only send to recipients who explicitly subscribed and from whom you can document consent.</li>
          <li><strong>SMS (US):</strong> Comply with 10DLC (A2P messaging) and TCPA requirements — register your brand and campaigns with The Campaign Registry and obtain documented consent before sending.</li>
          <li><strong>SMS (Canada):</strong> Comply with CRTC and CWTA Common Short Code Application Guidelines — keep records of consent, identify the sender, and honor unsubscribe requests promptly.</li>
          <li><strong>SMS (international):</strong> Comply with the local laws of the recipient&apos;s country (PECR in the UK, GDPR in the EU, etc.) and respect opt-out requests.</li>
        </ul>
        <p>
          You must keep evidence of consent and provide it to us within 7 days
          on request.
        </p>
      </LegalSection>

      <LegalSection title="2. Prohibited content">
        <p>You may not use SpeedIQ to send messages that:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Are unsolicited (spam), bulk-purchased lists, or scraped contacts.</li>
          <li>Are illegal under the laws of the sender&apos;s or recipient&apos;s jurisdiction.</li>
          <li>Promote violence, terrorism, hate speech, harassment, or discrimination based on race, religion, gender, sexual orientation, disability, or other protected characteristic.</li>
          <li>Sexually exploit or harm minors in any way.</li>
          <li>Contain child sexual abuse material (CSAM). We report CSAM to relevant authorities.</li>
          <li>Distribute malware, phishing links, or other malicious software.</li>
          <li>Promote fraud, pyramid schemes, multi-level marketing scams, or get-rich-quick offers.</li>
          <li>Promote regulated or prohibited products without appropriate licensing — including but not limited to firearms, controlled substances, illegal gambling, prescription drugs without authorization, tobacco where prohibited, and adult content where restricted.</li>
          <li>Infringe intellectual property rights (copyright, trademark, trade secrets).</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
          <li>Are politically targeted in jurisdictions where political messaging is restricted (e.g., during silent periods around elections).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Prohibited conduct">
        <p>You may not:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Probe, scan, or test the vulnerability of any SpeedIQ system or network, except as part of a coordinated disclosure or our bug bounty program (where offered).</li>
          <li>Breach or otherwise circumvent any security or authentication measures.</li>
          <li>Access, tamper with, or use non-public areas of the Services or other accounts.</li>
          <li>Interfere with or disrupt any user, host, or network, including via DDoS, mail-bomb, or crashing the service.</li>
          <li>Use automated means (bots, scrapers) to access the Services in a way that exceeds reasonable use.</li>
          <li>Resell, sub-license, or commercially exploit the Services without written permission.</li>
          <li>Use the Services to compete with SpeedIQ.</li>
          <li>Submit false abuse complaints, bounce reports, or unsubscribe events to harm sender reputation.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Quality & deliverability standards">
        <p>
          Even with consent, you must maintain reasonable engagement standards:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Honor opt-outs within 24 hours of receipt. STOP / UNSUBSCRIBE keywords are processed automatically — do not override them.</li>
          <li>Identify yourself as the sender in every message (organization name, contact method).</li>
          <li>Provide an easy unsubscribe mechanism in all marketing messages.</li>
          <li>Do not send messages between 9 PM and 8 AM in the recipient&apos;s local time zone (per TCPA quiet hours in the US, CRTC guidelines in Canada, and similar laws elsewhere) unless transactional or expressly consented.</li>
          <li>Keep WhatsApp quality rating above Yellow; persistently Red-rated numbers may be suspended to protect platform health.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Industry-specific restrictions">
        <p>
          Certain industries face additional restrictions imposed by carriers,
          regulators, or platform providers (Meta, Twilio). You must comply
          with these in addition to the AUP. Examples include — but are not
          limited to:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Financial services — must comply with disclosures and consumer protection rules.</li>
          <li>Healthcare — must comply with HIPAA (US), PIPEDA / PHIPA (Canada), and equivalent privacy frameworks.</li>
          <li>Cryptocurrency — restricted on WhatsApp marketing in many jurisdictions; check Meta&apos;s policies.</li>
          <li>Cannabis / CBD — heavily restricted; not permitted via SMS in the US per carrier rules.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Reporting abuse">
        <p>
          If you receive an unwanted message sent via SpeedIQ, please report it
          to{" "}
          <a
            href="mailto:abuse@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            abuse@speediq.app
          </a>{" "}
          with the message content, sender identifier, and the date/time
          received. We investigate every report.
        </p>
      </LegalSection>

      <LegalSection title="7. Enforcement">
        <p>
          We may take any of the following actions in response to AUP
          violations, in our sole discretion:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>Issue a warning.</li>
          <li>Throttle or rate-limit affected projects.</li>
          <li>Disable specific features (e.g., outbound sends, API access).</li>
          <li>Suspend the offending account, with or without notice.</li>
          <li>Terminate the account permanently.</li>
          <li>Withhold pending refunds or unused credits.</li>
          <li>Report the violation to law enforcement or platform providers (Meta, Twilio, Resend).</li>
        </ul>
        <p>
          For severe violations (CSAM, fraud, illegal activity), we will
          terminate immediately and may report to authorities without notice.
        </p>
      </LegalSection>

      <LegalSection title="8. Appeals">
        <p>
          If your account is suspended and you believe it was in error, email{" "}
          <a
            href="mailto:appeals@speediq.app"
            className="text-zinc-900 underline dark:text-white"
          >
            appeals@speediq.app
          </a>{" "}
          with your account email, project name, and the basis for your appeal.
          We respond within 5 business days.
        </p>
      </LegalSection>

      <LegalSection title="9. Updates">
        <p>
          We may update this AUP from time to time as platform policies, laws,
          and carrier rules evolve. Material changes will be notified via email
          or in-app notice. Continued use of the Services after updates take
          effect constitutes acceptance.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
