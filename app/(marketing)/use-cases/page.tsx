import type { Metadata } from "next";

import {
  ArrowIcon,
  Btn,
  CheckIcon,
  Container,
  Eyebrow,
  SectionHead,
} from "@/components/marketing/atoms";
import {
  FinalCTA,
  UseCasesGrid,
} from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "Use cases — SpeedIQ",
  description:
    "How e-commerce, real estate, education, fintech, healthcare and SAAS teams use SpeedIQ for WhatsApp, Email and SMS messaging.",
  alternates: { canonical: "/use-cases" },
};

const PLAYBOOKS = [
  {
    industry: "E-commerce",
    accent: "#25D366",
    body: "Order confirmations on WhatsApp, abandoned-cart SMS, monthly newsletters by email — every customer touchpoint in one workspace.",
    items: [
      "Order confirmation WhatsApp utility template",
      "Abandoned cart SMS with discount code",
      "New collection email broadcast",
      "Replies routed to the unified inbox",
    ],
  },
  {
    industry: "Real estate",
    accent: "#f59e0b",
    body: "Capture inbound enquiries on WhatsApp, segment by property type, pass hot conversations to the right agent via assignment.",
    items: [
      "Lead capture WhatsApp template",
      "Drip campaign by property type",
      "SMS appointment reminders",
      "Agent-assigned inbox for live chat",
    ],
  },
  {
    industry: "Education",
    accent: "#3b82f6",
    body: "Admission confirmations, fee reminders, exam alerts on WhatsApp. Parent broadcasts via email. Student replies in the inbox.",
    items: [
      "Admission confirmation WhatsApp message",
      "Fee due SMS reminders",
      "Class schedule email broadcast",
      "Parent–teacher chat in the inbox",
    ],
  },
  {
    industry: "Fintech",
    accent: "#a855f7",
    body: "Transactional OTPs and balance alerts via WhatsApp Auth templates or DLT-compliant SMS. Product launch email campaigns.",
    items: [
      "OTP via WhatsApp Auth template",
      "Balance alert SMS (DLT)",
      "Product update email campaign",
      "Audit log + custom roles",
    ],
  },
  {
    industry: "Healthcare",
    accent: "#06b6d4",
    body: "Appointment confirmations on WhatsApp, 24h SMS reminders, follow-up surveys via email. Cancellations route into one inbox.",
    items: [
      "Appointment WhatsApp utility template",
      "24h SMS reminder with reschedule",
      "Post-visit email survey",
      "Patient replies in the inbox",
    ],
  },
  {
    industry: "Agencies & services",
    accent: "#ec4899",
    body: "Run inbound enquiries, project updates, and renewals from one place. Team assignment routes each client to their AM.",
    items: [
      "Client onboarding WhatsApp flow",
      "Project update email broadcasts",
      "Renewal SMS reminders",
      "Account-manager assignment in inbox",
    ],
  },
];

export default function UseCasesPage() {
  return (
    <>
      {/* HERO */}
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="USE CASES"
            title="Built for teams that *actually talk to customers.*"
            lede="SpeedIQ powers messaging for businesses across e-commerce, real estate, education, fintech, healthcare and services — anywhere a team needs to broadcast, follow up, and reply at scale."
            align="center"
          />
        </Container>
      </section>

      {/* QUICK STATS GRID — reused from landing */}
      <UseCasesGrid />

      {/* PLAYBOOKS */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
        <Container>
          <SectionHead eyebrow="PLAYBOOKS" title="What teams *actually send.*" />
          <div
            style={{
              marginTop: 56,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {PLAYBOOKS.map((pb) => (
              <div
                key={pb.industry}
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--fg-3)",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: pb.accent }} />
                  {pb.industry}
                </span>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.5, color: "var(--fg-2)" }}>{pb.body}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
                  {pb.items.map((it) => (
                    <li key={it} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--fg-2)" }}>
                      <span style={{ marginTop: 4, flex: "0 0 auto" }}>
                        <CheckIcon color={pb.accent} />
                      </span>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA strip */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
        <Container>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 16,
            }}
          >
            <Eyebrow>NOT LISTED?</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 3.6vw, 44px)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                fontWeight: 500,
                margin: 0,
                maxWidth: 720,
                textWrap: "balance",
              }}
            >
              If your team sends customer messages, SpeedIQ probably fits.
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: "var(--fg-3)", maxWidth: 560 }}>
              Start a trial and you'll know in 10 minutes whether it's a fit.
            </p>
            <div style={{ marginTop: 12 }}>
              <Btn href="/auth/sign-up" variant="primary" size="lg" icon={<ArrowIcon />}>
                Start free trial
              </Btn>
            </div>
          </div>
        </Container>
      </section>

      <FinalCTA />
    </>
  );
}
