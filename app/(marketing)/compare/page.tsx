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
  title: "Why SpeedIQ — SpeedIQ",
  description:
    "What makes SpeedIQ different: every channel in one bill, predictable credit pricing, team-first workflows, and no per-seat charges.",
  alternates: { canonical: "/compare" },
};

const PILLARS = [
  {
    n: "01",
    title: "Three channels, one subscription",
    body: "Most messaging tools focus on a single channel. SpeedIQ ships WhatsApp, Email and SMS in every plan. You manage one contact list and pay one invoice.",
    points: [
      "WhatsApp Cloud API via Meta",
      "Email via Resend, with your own domain",
      "SMS via Twilio, DLT-ready for India",
    ],
  },
  {
    n: "02",
    title: "Credit pricing you can predict",
    body: "Each plan includes a monthly credit allowance. Heavy messages cost more credits, lighter ones less. You see the cost before you send, and you can top up any time.",
    points: [
      "Email = 1 credit",
      "WhatsApp marketing template = 5 credits",
      "Domestic SMS = 5 credits · International = 15",
    ],
  },
  {
    n: "03",
    title: "Built for teams, not solo senders",
    body: "Every workspace supports multiple seats, role-based access and a shared inbox with assignment. The credit ledger logs every charge for audit-friendly billing.",
    points: [
      "Four roles: owner, admin, editor, viewer",
      "Shared inbox with assignment and tags",
      "Immutable credit ledger",
    ],
  },
];

const CONTRAST = [
  {
    title: "Pay per channel, not per seat",
    body: "Adding a teammate doesn't change your bill. Starter includes 3 seats, Pro includes 10, Business is unlimited.",
  },
  {
    title: "Compliance where it matters",
    body: "WhatsApp templates submit through Meta's official flow. SMS surfaces DLT principal entity, content template and sender ID configuration for India sends. Email supports one-click unsubscribe with token-verified links.",
  },
  {
    title: "Your data, your channels",
    body: "Your WhatsApp Business account, your sending domain and your Twilio account stay yours. SpeedIQ is the workspace on top — not a shared sender.",
  },
  {
    title: "Stripe billing, INR or USD",
    body: "Subscriptions and top-ups run on Stripe with multi-currency pricing. Yearly plans save about 20%.",
  },
];

export default function ComparePage() {
  return (
    <>
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="WHY SPEEDIQ"
            title="What makes SpeedIQ *different.*"
            lede="We focus on three things: every channel in one bill, predictable credit pricing, and team-first workflows that don't tax you per seat."
            align="center"
          />
        </Container>
      </section>

      {/* THREE PILLARS */}
      <section style={{ paddingTop: 48, paddingBottom: "var(--section-y)" }}>
        <Container>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 24,
            }}
          >
            {PILLARS.map((p) => (
              <div
                key={p.n}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "28px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: ".08em",
                    color: "var(--accent)",
                    fontWeight: 600,
                  }}
                >
                  {p.n}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {p.title}
                </h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-3)", margin: 0 }}>{p.body}</p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "8px 0 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {p.points.map((pt) => (
                    <li key={pt} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--fg-2)" }}>
                      <span style={{ marginTop: 4, flex: "0 0 auto" }}>
                        <CheckIcon color="var(--accent)" />
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* MORE CONTRAST */}
      <section
        style={{
          paddingTop: "var(--section-y)",
          paddingBottom: "var(--section-y)",
          background: "var(--bg-sunken)",
        }}
      >
        <Container>
          <Eyebrow style={{ marginBottom: 18 }}>HOW WE&apos;RE BUILT</Eyebrow>
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
            Decisions baked into the product — not just on the pricing page.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {CONTRAST.map((c) => (
              <div
                key={c.title}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "26px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                    margin: 0,
                  }}
                >
                  {c.title}
                </h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-3)" }}>{c.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* WHAT WE DON'T DO */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
        <Container>
          <Eyebrow style={{ marginBottom: 18 }}>WHAT WE DON&apos;T DO</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.4vw, 40px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              fontWeight: 500,
              margin: "0 0 32px",
              maxWidth: 720,
              textWrap: "balance",
            }}
          >
            We&apos;re upfront about the limits.
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              maxWidth: 720,
            }}
          >
            {[
              "We do not provide shared WhatsApp numbers — you bring your own Meta Business account and phone number.",
              "We are not a calls platform yet. Calls are on the roadmap; today the channels are WhatsApp, Email and SMS.",
              "We do not host email inboxes. Email replies go to the address you configure; the unified inbox covers WhatsApp and SMS replies.",
              "We are not a CRM. SpeedIQ stores contacts, tags, custom fields and conversation history, but it isn't a deal pipeline or service desk.",
            ].map((item) => (
              <li
                key={item}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  padding: "16px 20px",
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: "var(--fg-2)",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: "var(--fg-4)",
                    flex: "0 0 auto",
                    marginTop: 8,
                  }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* CTA */}
      <section style={{ paddingBottom: "var(--section-y)" }}>
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
