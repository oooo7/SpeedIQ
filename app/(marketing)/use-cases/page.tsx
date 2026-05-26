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
    body: "Order confirmations on WhatsApp. Abandoned-cart SMS. Monthly newsletters by email. Every customer touchpoint in one place.",
    items: [
      "Order confirmation on WhatsApp",
      "Abandoned cart SMS with discount",
      "New collection email broadcast",
      "Replies go to the inbox",
    ],
  },
  {
    industry: "Real estate",
    accent: "#f59e0b",
    body: "Capture leads on WhatsApp. Group by property type. Pass hot chats to the right agent via assignment.",
    items: [
      "Lead capture WhatsApp template",
      "Drip campaign by property type",
      "SMS appointment reminders",
      "Agent-assigned inbox",
    ],
  },
  {
    industry: "Education",
    accent: "#3b82f6",
    body: "Admission confirmations, fee reminders and exam alerts on WhatsApp. Parent broadcasts by email. Student chats in the inbox.",
    items: [
      "Admission confirmation on WhatsApp",
      "Fee due SMS reminders",
      "Class schedule by email",
      "Parent–teacher chat in the inbox",
    ],
  },
  {
    industry: "Fintech",
    accent: "#a855f7",
    body: "OTPs and balance alerts via WhatsApp or 10DLC-compliant SMS. Product launch emails. Audit logs to keep regulators happy.",
    items: [
      "OTP via WhatsApp Auth template",
      "Balance alert SMS (10DLC)",
      "Product launch email",
      "Audit log + custom roles",
    ],
  },
  {
    industry: "Healthcare",
    accent: "#06b6d4",
    body: "Appointment confirmations on WhatsApp. 24-hour SMS reminders. Follow-up surveys by email. Cancellations land in one inbox.",
    items: [
      "Appointment WhatsApp template",
      "24h SMS reminder with reschedule",
      "Post-visit email survey",
      "Patient replies in the inbox",
    ],
  },
  {
    industry: "Agencies & services",
    accent: "#ec4899",
    body: "Run enquiries, project updates and renewals in one place. Team assignment routes each client to their account manager.",
    items: [
      "Client onboarding WhatsApp flow",
      "Project updates by email",
      "Renewal SMS reminders",
      "Account-manager assignment",
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
            title="Built for teams that *talk to customers.*"
            lede="We power messaging for businesses in e-commerce, real estate, education, fintech, healthcare and services. Anywhere you need to send messages and reply at scale."
            align="center"
          />
        </Container>
      </section>

      {/* QUICK STATS GRID — reused from landing */}
      <UseCasesGrid />

      {/* PLAYBOOKS */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
        <Container>
          <SectionHead eyebrow="PLAYBOOKS" title="What teams *actually send.*" lede="Real campaigns and flows that teams in each industry run on SpeedIQ." />
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
              If your team sends customer messages, SpeedIQ fits.
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: "var(--fg-3)", maxWidth: 560 }}>
              Start a trial. It only takes a few minutes to see if it fits.
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
