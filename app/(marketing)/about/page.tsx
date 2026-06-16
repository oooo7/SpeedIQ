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
  title: "About Us — SpeedIQ",
  description:
    "Learn about SpeedIQ's mission to simplify multi-channel communication for businesses through transparent pricing and team-first software.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us — SpeedIQ",
    description: "Learn about SpeedIQ's mission to simplify multi-channel communication for businesses.",
    type: "website",
    url: "/about",
    siteName: "SpeedIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us — SpeedIQ",
    description: "Learn about SpeedIQ's mission to simplify multi-channel communication.",
  },
};

const VALUES = [
  {
    title: "All channels, unified",
    body: "We believe businesses shouldn't need a separate subscription for WhatsApp, Email and SMS. By bringing them into a single platform with one ledger, we make communication seamless.",
  },
  {
    title: "Transparent pricing",
    body: "No hidden fees, no markup on WhatsApp utility costs, and no forced per-user licensing fees. We charge simple plan subscriptions and credits you can easily audit.",
  },
  {
    title: "Independent infrastructure",
    body: "Your Meta Business account, Twilio credentials, and verified email domains stay yours. You are never vendor-locked. SpeedIQ is the workspace layer on top.",
  },
];

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About SpeedIQ",
    "description": "Learn about SpeedIQ's mission to simplify multi-channel communication.",
    "mainEntity": {
      "@type": "Organization",
      "name": "SpeedIQ",
      "url": "https://speediq.app",
      "logo": "https://speediq.app/icon.png"
    }
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
            eyebrow="ABOUT US"
            title="Simplifying *multi-channel* communication."
            lede="We build software that unifies customer reach, provides transparent credit ledgers, and connects directly to your own infrastructure."
            align="center"
          />
        </Container>
      </section>

      {/* STORY & MISSION */}
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
              gap: 24,
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
              Our Mission
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>
              SpeedIQ was born out of frustration. For years, companies have had to manage separate SaaS tools for emailing newsletter subscribers, broadcasting WhatsApp promotions, and sending transactional verification SMS. Each provider charges a monthly fee, requires separate developer integrations, and locks customer profiles in different database silos.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>
              We designed SpeedIQ to be a single cockpit for your customer operations. We combine these three essential channels into a unified interface, giving your team a shared live chat inbox for active replies, templates synced directly from official Meta APIs, and a singular, predictable credit ledger.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--fg-2)", margin: 0 }}>
              Importantly, we do not stand between you and your accounts. We run directly on your own infrastructure—using your own sending domains and your own Meta and Twilio credentials. This ensures you maintain full compliance, higher deliverability, and absolute authority over your customer relationships.
            </p>
          </div>
        </Container>
      </section>

      {/* CORE VALUES */}
      <section
        style={{
          paddingTop: "var(--section-y)",
          paddingBottom: "var(--section-y)",
          background: "var(--bg-sunken)",
        }}
      >
        <Container>
          <Eyebrow style={{ marginBottom: 18 }}>HOW WE WORK</Eyebrow>
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
            Built on core principles of customer trust and data ownership.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 24,
            }}
          >
            {VALUES.map((val) => (
              <div
                key={val.title}
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
                  {val.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-3)" }}>
                  {val.body}
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
