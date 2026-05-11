import type { Metadata } from "next";

import {
  CheckIcon,
  Container,
  Eyebrow,
  SectionHead,
} from "@/components/marketing/atoms";
import {
  CreditCalc,
  FAQ,
  FinalCTA,
  Pricing,
} from "@/components/marketing/landing-sections";
import {
  CREDIT_PACKS,
  CREDIT_WEIGHTS,
  detectCurrency,
  formatPrice,
  PLANS,
} from "@/lib/marketing/currency";

export const metadata: Metadata = {
  title: "Pricing — SpeedIQ",
  description:
    "Transparent, channel-inclusive pricing. One subscription unlocks WhatsApp, Email and SMS. Pay-as-you-grow credits for outbound volume.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — SpeedIQ",
    description:
      "Transparent, channel-inclusive pricing. One subscription unlocks WhatsApp, Email and SMS.",
    url: "/pricing",
    type: "website",
    siteName: "SpeedIQ",
  },
};

export default async function PricingPage() {
  const ctx = await detectCurrency();
  const defaultCurrency: "INR" | "USD" = ctx.currency === "inr" ? "INR" : "USD";
  const c = ctx.currency;

  return (
    <>
      {/* HEADER */}
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="PRICING"
            title="One bill. *Every channel.*"
            lede="All plans include WhatsApp, Email and SMS — no add-ons, no per-seat tax. Credits cover your outbound volume and roll forward 30 days."
            align="center"
          />
          <p
            style={{
              marginTop: 16,
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-3)",
              letterSpacing: ".02em",
            }}
          >
            Showing prices in {c === "inr" ? "₹ INR" : "$ USD"}
            {ctx.country ? ` · detected from ${ctx.country}` : ""} — toggle below to switch.
          </p>
        </Container>
      </section>

      {/* PLAN CARDS — reuses the same Pricing block as the landing */}
      <Pricing defaultCurrency={defaultCurrency} />

      {/* CREDIT WEIGHTS */}
      <section
        style={{
          paddingTop: "var(--section-y)",
          paddingBottom: "var(--section-y)",
          background: "var(--bg-sunken)",
        }}
      >
        <Container>
          <SectionHead
            eyebrow="CREDIT WEIGHTS"
            title="Different messages, *different costs.*"
            lede="Every send deducts credits from your monthly allowance. Heavier channels (international SMS, marketing templates) cost more — so you only pay for what you actually send."
          />
          <div
            style={{
              marginTop: 56,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              background: "var(--bg-elev)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 0.4fr",
                padding: "14px 22px",
                background: "var(--bg-sunken)",
                borderBottom: "1px solid var(--line)",
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              <span>Channel / message type</span>
              <span style={{ textAlign: "right" }}>Credits per send</span>
            </div>
            {CREDIT_WEIGHTS.map((row, i) => (
              <div
                key={row.channel}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 0.4fr",
                  padding: "16px 22px",
                  borderBottom: i < CREDIT_WEIGHTS.length - 1 ? "1px solid var(--line)" : "none",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 500 }}>{row.channel}</div>
                  {row.note && (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>
                      {row.note}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 26,
                    fontWeight: 500,
                    letterSpacing: "-0.025em",
                    textAlign: "right",
                  }}
                >
                  {row.credits}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* TOP-UP PACKS */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
        <Container>
          <SectionHead
            eyebrow="TOP-UP PACKS"
            title="Need more credits? *Top up any time.*"
            lede="One-time packs that stack on your subscription. Buy bigger, save more — credits never expire while your subscription is active."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
              marginTop: 56,
            }}
          >
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {pack.credits.toLocaleString()}
                </div>
                <Eyebrow dot={false}>credits</Eyebrow>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" }}>
                    {formatPrice(c === "inr" ? pack.inr : pack.usd, ctx)}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>one-time</span>
                </div>
                {pack.discount && (
                  <span
                    style={{
                      alignSelf: "flex-start",
                      marginTop: 6,
                      padding: "3px 9px",
                      borderRadius: 99,
                      background: "rgba(37,211,102,.13)",
                      color: "#0a3d1d",
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: ".04em",
                    }}
                  >
                    {pack.discount.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* COMPARISON TABLE */}
      <section
        style={{
          paddingTop: "var(--section-y)",
          paddingBottom: "var(--section-y)",
          background: "var(--bg-sunken)",
        }}
      >
        <Container>
          <SectionHead eyebrow="FULL COMPARISON" title="Every feature, *side by side.*" />
          <div
            style={{
              marginTop: 56,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              background: "var(--bg-elev)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", fontFamily: "var(--font-sans)" }}>
                <thead>
                  <tr style={{ background: "var(--bg-sunken)", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "14px 22px", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 500 }}></th>
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        style={{
                          padding: "14px 22px",
                          textAlign: "center",
                          fontFamily: "var(--font-display)",
                          fontSize: 15,
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {plan.name}
                        <div
                          style={{
                            marginTop: 4,
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--fg-3)",
                            fontWeight: 400,
                          }}
                        >
                          {formatPrice(plan.monthly[c], ctx)}/mo
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow label="Monthly credits" values={PLANS.map((p) => p.credits.toLocaleString())} />
                  <ComparisonRow label="Contacts" values={PLANS.map((p) => p.contacts.toLocaleString())} />
                  <ComparisonRow label="Team seats" values={PLANS.map((p) => (p.seats ? String(p.seats) : "Unlimited"))} />
                  <ComparisonRow label="WhatsApp + Email" values={["✓", "✓", "✓"]} />
                  <ComparisonRow label="SMS (Twilio · DLT)" values={["—", "✓", "✓"]} />
                  <ComparisonRow label="Custom email domain" values={["✓", "✓", "✓"]} />
                  <ComparisonRow label="Live unified inbox" values={["✓", "✓", "✓"]} />
                  <ComparisonRow label="Automations" values={["Basic", "Full", "Full + branching"]} />
                  <ComparisonRow label="API + webhooks" values={["—", "✓", "✓"]} />
                  <ComparisonRow label="Custom branding" values={["—", "✓", "✓"]} />
                  <ComparisonRow label="AI assist" values={["—", "—", "✓"]} />
                  <ComparisonRow label="Audit log" values={["—", "—", "✓"]} />
                  <ComparisonRow label="Custom roles" values={["—", "—", "✓"]} />
                  <ComparisonRow label="Analytics retention" values={["30 days", "90 days", "1 year"]} last />
                </tbody>
              </table>
            </div>
          </div>
        </Container>
      </section>

      {/* CREDIT CALCULATOR (reused) */}
      <CreditCalc />

      {/* FAQ (reused) */}
      <FAQ />

      {/* FINAL CTA (reused) */}
      <FinalCTA />
    </>
  );
}

function ComparisonRow({ label, values, last }: { label: string; values: string[]; last?: boolean }) {
  return (
    <tr style={{ borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <td style={{ padding: "14px 22px", fontSize: 14, color: "var(--fg-2)" }}>{label}</td>
      {values.map((v, i) => (
        <td key={i} style={{ padding: "14px 22px", textAlign: "center", fontSize: 14, color: "var(--fg)" }}>
          {v === "✓" ? (
            <span style={{ display: "inline-flex", justifyContent: "center" }}>
              <CheckIcon color="var(--accent)" />
            </span>
          ) : v === "—" ? (
            <span style={{ color: "var(--fg-4)" }}>—</span>
          ) : (
            v
          )}
        </td>
      ))}
    </tr>
  );
}
