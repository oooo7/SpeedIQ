import type { Metadata } from "next";

import {
  ArrowIcon,
  Btn,
  CheckIcon,
  Container,
  Eyebrow,
  SectionHead,
} from "@/components/marketing/atoms";
import { FinalCTA } from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "Security & Data Protection — SpeedIQ",
  description:
    "Discover how SpeedIQ safeguards your business communication data, uses official APIs, maintains GDPR compliance, and protects privacy.",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "Security & Data Protection — SpeedIQ",
    description: "Discover how SpeedIQ safeguards your business communication data.",
    type: "website",
    url: "/security",
    siteName: "SpeedIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security & Data Protection — SpeedIQ",
    description: "Discover how SpeedIQ safeguards your business communication data.",
  },
};

const SECURITY_PILLARS = [
  {
    title: "Official Meta APIs",
    body: "We integrate directly with Meta's official WhatsApp Business Cloud API. Your messages are sent via Meta's secure server endpoints, avoiding third-party proxies and gray-market workarounds.",
  },
  {
    title: "Encryption at Rest & Transit",
    body: "All data sent through SpeedIQ is encrypted using TLS 1.3 in transit and AES-256 encryption at rest. Database connections are secured and credentials are encrypted.",
  },
  {
    title: "GDPR Compliance",
    body: "We support standard Data Processing Agreements (DPAs), enforce strict opt-out workflows automatically, and never store message contents longer than necessary to verify delivery status.",
  },
];

export default function SecurityPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Security & Data Protection - SpeedIQ",
    "description": "Learn about SpeedIQ's encryption standards, direct APIs, GDPR, and security rules.",
    "url": "https://speediq.app/security"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* HERO */}
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            as="h1"
            eyebrow="SECURITY"
            title="Enterprise-grade *data protection.*"
            lede="Your customer trust is your most valuable asset. We protect your communications, verify your infrastructure, and maintain strict data compliance."
            align="center"
          />
        </Container>
      </section>

      {/* DETAILED STANDARDS */}
      <section style={{ paddingTop: 48, paddingBottom: "var(--section-y)" }}>
        <Container narrow>
          <div
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: "48px 40px",
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              How SpeedIQ Protects Your Data
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <h4 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>1. Direct Infrastructure Integration</h4>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>
                  Unlike typical marketing platforms that act as intermediate brokers for your messages, SpeedIQ acts as a secure console running directly on top of your accounts. By connecting your own Meta Business developer credentials, your custom Resend SMTP domains, and your Twilio API accounts, your communication logs stay under your direct ownership.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>2. Strict Access Control & Roles</h4>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>
                  SpeedIQ provides strict Role-Based Access Control (RBAC) supporting Owner, Admin, Editor, and Viewer permissions. You can control who can view billing details, who can modify email templates, and who has permission to export subscriber contact lists. All account actions are recorded in an immutable ledger.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 8px" }}>3. Data Privacy and Right to Be Forgotten</h4>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>
                  Every outbound email contains a token-verified, secure unsubscribe link that immediately unsubscribes the contact on your project. If a contact opts out via WhatsApp or SMS (e.g. by sending 'STOP'), our webhooks process the request instantly to restrict future sends, keeping you compliant with local spam laws automatically.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SECURITY GRID */}
      <section
        style={{
          paddingTop: "var(--section-y)",
          paddingBottom: "var(--section-y)",
          background: "var(--bg-sunken)",
        }}
      >
        <Container>
          <Eyebrow style={{ marginBottom: 18 }}>SECURITY STANDARDS</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.4vw, 40px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              fontWeight: 500,
              margin: "0 0 56px",
              maxWidth: 720,
              textWrap: "balance",
            }}
          >
            Securing your channel endpoints from day one.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 24,
            }}
          >
            {SECURITY_PILLARS.map((pil) => (
              <div
                key={pil.title}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "28px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--bg-sunken)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckIcon color="var(--accent)" />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                    margin: 0,
                  }}
                >
                  {pil.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-3)" }}>
                  {pil.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
        <Container>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <Btn href="/auth/sign-up" variant="primary" size="lg" icon={<ArrowIcon />}>
              Start free trial
            </Btn>
            <Btn href="/pricing" variant="ghost" size="lg">
              See pricing
            </Btn>
          </div>
        </Container>
      </section>

      <FinalCTA />
    </>
  );
}
