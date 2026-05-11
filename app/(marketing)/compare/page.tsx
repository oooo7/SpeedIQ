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
  title: "How SpeedIQ compares — SpeedIQ",
  description:
    "SpeedIQ vs Wati, AiSensy, Interakt and TeleCRM. Three channels in one bill, no per-seat upcharges, INR-first pricing.",
  alternates: { canonical: "/compare" },
};

interface CompareRow {
  label: string;
  speediq: string | boolean;
  wati: string | boolean;
  aisensy: string | boolean;
  interakt: string | boolean;
  telecrm: string | boolean;
}

const ROWS: CompareRow[] = [
  { label: "WhatsApp Business API", speediq: true, wati: true, aisensy: true, interakt: true, telecrm: false },
  { label: "Email broadcasts", speediq: true, wati: false, aisensy: false, interakt: false, telecrm: false },
  { label: "SMS (DLT compliant)", speediq: true, wati: false, aisensy: false, interakt: false, telecrm: true },
  { label: "Unified WhatsApp + SMS inbox", speediq: true, wati: false, aisensy: false, interakt: false, telecrm: "Partial" },
  { label: "Custom email domain", speediq: true, wati: false, aisensy: false, interakt: false, telecrm: false },
  { label: "Embedded Signup (Meta)", speediq: true, wati: true, aisensy: true, interakt: true, telecrm: false },
  { label: "Template approval sync", speediq: true, wati: true, aisensy: true, interakt: true, telecrm: false },
  { label: "Pause / resume / retry", speediq: true, wati: "Partial", aisensy: "Partial", interakt: false, telecrm: false },
  { label: "Branching automations", speediq: "Business plan", wati: "Add-on", aisensy: "Add-on", interakt: "Add-on", telecrm: true },
  { label: "Open API + webhooks", speediq: "Pro+", wati: "Enterprise", aisensy: "Pro+", interakt: "Pro+", telecrm: true },
  { label: "Audit log", speediq: "Business plan", wati: "Enterprise", aisensy: "Enterprise", interakt: "Enterprise", telecrm: true },
  { label: "INR-first pricing", speediq: true, wati: "USD-first", aisensy: true, interakt: true, telecrm: true },
  { label: "Per-seat upcharges", speediq: false, wati: true, aisensy: true, interakt: true, telecrm: true },
  { label: "Starting price / month", speediq: "₹999 / $12", wati: "$39+", aisensy: "₹999+", interakt: "₹1,799+", telecrm: "₹1,500/user" },
  { label: "Free trial", speediq: "7 days", wati: "7 days", aisensy: "14 days", interakt: "14 days", telecrm: "On request" },
];

function Cell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return (
      <span style={{ display: "inline-flex", justifyContent: "center" }}>
        <CheckIcon color="var(--accent)" />
      </span>
    );
  }
  if (value === false) {
    return <span style={{ color: "var(--fg-4)" }}>—</span>;
  }
  return (
    <span
      style={{
        fontSize: 12,
        fontFamily: "var(--font-mono)",
        color: highlight ? "var(--fg)" : "var(--fg-2)",
        fontWeight: highlight ? 600 : 400,
      }}
    >
      {value}
    </span>
  );
}

export default function ComparePage() {
  return (
    <>
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="COMPARISON"
            title="How SpeedIQ *compares.*"
            lede="We focus on three things competitors split across multiple SKUs: every channel in one bill, real team-first workflows, and pricing that doesn't charge you per seat."
            align="center"
          />
        </Container>
      </section>

      <section style={{ paddingTop: 48, paddingBottom: "var(--section-y)" }}>
        <Container>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              background: "var(--bg-elev)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontFamily: "var(--font-sans)" }}>
                <thead>
                  <tr style={{ background: "var(--bg-sunken)", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "14px 20px", textAlign: "left" }}></th>
                    <th
                      style={{
                        padding: "14px 20px",
                        textAlign: "center",
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        position: "relative",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent)" }} />
                        SpeedIQ
                      </span>
                    </th>
                    {["Wati", "AiSensy", "Interakt", "TeleCRM"].map((n) => (
                      <th
                        key={n}
                        style={{
                          padding: "14px 20px",
                          textAlign: "center",
                          fontFamily: "var(--font-display)",
                          fontSize: 14,
                          fontWeight: 500,
                          color: "var(--fg-3)",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr key={row.label} style={{ borderBottom: i < ROWS.length - 1 ? "1px solid var(--line)" : "none" }}>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: "var(--fg-2)" }}>{row.label}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", background: "rgba(37,211,102,.04)" }}>
                        <Cell value={row.speediq} highlight />
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <Cell value={row.wati} />
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <Cell value={row.aisensy} />
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <Cell value={row.interakt} />
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <Cell value={row.telecrm} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", letterSpacing: ".02em" }}>
            Based on publicly available information at the time of writing. Drop us a note if anything is inaccurate.
          </p>
        </Container>
      </section>

      {/* DIFFERENTIATORS */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
        <Container>
          <Eyebrow style={{ marginBottom: 18 }}>WHAT MAKES US DIFFERENT</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.4vw, 40px)",
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              fontWeight: 500,
              margin: "0 0 56px",
              maxWidth: 700,
              textWrap: "balance",
            }}
          >
            Three things competitors charge separately for, in one workspace.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
            <Differentiator
              n="01"
              title="Three channels, one bill"
              body="Most competitors do WhatsApp only. We bundle WhatsApp + Email + SMS — so you don't pay three SaaS providers to talk to one customer."
            />
            <Differentiator
              n="02"
              title="No per-seat upcharges"
              body="Starter includes 3 seats. Pro includes 10. Business is unlimited. Add teammates without rebooting your finance team's budget."
            />
            <Differentiator
              n="03"
              title="Pay for sends, not shelves"
              body="Credits scale with what you actually send. Heavier message types cost more credits, lighter ones cost less — no flat overage tax."
            />
          </div>
        </Container>
      </section>

      <FinalCTA />
    </>
  );
}

function Differentiator({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div
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
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: ".08em",
          color: "var(--accent)",
          fontWeight: 600,
        }}
      >
        {n}
      </span>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-3)", margin: 0 }}>{body}</p>
    </div>
  );
}

// Suppress unused warning — ArrowIcon/Btn intentionally available for future variants
void ArrowIcon;
void Btn;
