import type { ReactNode } from "react";

import {
  ArrowIcon,
  Btn,
  CheckIcon,
  Container,
  Eyebrow,
} from "@/components/marketing/atoms";

export interface FeatureBlock {
  title: string;
  body: string;
}

interface FeaturePageLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent?: string;
  grad?: string;
  icon: ReactNode;
  capabilities: FeatureBlock[];
  highlights: { heading: string; body: string; bullets: string[] }[];
  faqs?: { q: string; a: string }[];
}

export function FeaturePageLayout({
  eyebrow,
  title,
  subtitle,
  accent = "#25D366",
  grad = "linear-gradient(135deg, #0d9d4f 0%, #25D366 55%, #b6f1c2 100%)",
  icon,
  capabilities,
  highlights,
  faqs,
}: FeaturePageLayoutProps) {
  return (
    <>
      {/* HERO */}
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 22,
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: grad,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: `0 10px 30px -10px ${accent}aa`,
              }}
            >
              {icon}
            </div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(36px, 4.4vw, 60px)",
                lineHeight: 1.02,
                letterSpacing: "-0.03em",
                fontWeight: 500,
                margin: 0,
                textWrap: "balance",
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: 18,
                lineHeight: 1.5,
                color: "var(--fg-3)",
                margin: 0,
                maxWidth: 600,
                textWrap: "pretty",
              }}
            >
              {subtitle}
            </p>
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <Btn href="/auth/sign-up" variant="primary" size="lg" icon={<ArrowIcon />}>
                Start free trial
              </Btn>
              <Btn href="/pricing" variant="ghost" size="lg">
                See pricing
              </Btn>
            </div>
          </div>
        </Container>
      </section>

      {/* CAPABILITIES GRID */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
        <Container>
          <Eyebrow style={{ marginBottom: 18 }}>WHAT YOU CAN DO</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.4vw, 40px)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              fontWeight: 500,
              margin: "0 0 56px",
              maxWidth: 700,
              textWrap: "balance",
            }}
          >
            Every surface, mapped out.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 1,
              background: "var(--line)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            {capabilities.map((c) => (
              <div
                key={c.title}
                style={{
                  background: "var(--bg-elev)",
                  padding: "28px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minHeight: 180,
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
                  <CheckIcon color={accent} />
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--fg-3)", margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* HIGHLIGHTS — alternating rows */}
      {highlights.map((h, i) => (
        <section key={h.heading} style={{ paddingTop: "var(--section-y)", paddingBottom: i === highlights.length - 1 ? "var(--section-y)" : 0 }}>
          <Container>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 72,
                alignItems: "center",
                direction: i % 2 === 1 ? "rtl" : "ltr",
              }}
            >
              <div style={{ direction: "ltr" as const }}>
                <Eyebrow style={{ marginBottom: 16 }}>{`0${i + 1} · WHY IT MATTERS`}</Eyebrow>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(28px, 3.2vw, 38px)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.025em",
                    fontWeight: 500,
                    margin: "0 0 16px",
                    textWrap: "balance",
                  }}
                >
                  {h.heading}
                </h3>
                <p style={{ fontSize: 16, lineHeight: 1.55, color: "var(--fg-3)", margin: "0 0 24px", maxWidth: 460 }}>{h.body}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
                  {h.bullets.map((b) => (
                    <li key={b} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ marginTop: 5, flex: "0 0 auto" }}>
                        <CheckIcon color={accent} />
                      </span>
                      <span style={{ fontSize: 14.5, color: "var(--fg-2)" }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ direction: "ltr" as const }}>
                <div
                  style={{
                    background: grad,
                    borderRadius: "calc(var(--radius-lg) + 8px)",
                    padding: "clamp(36px, 5vw, 64px)",
                    minHeight: 360,
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 30px 60px -30px rgba(0,0,0,.25)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,.35), transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      maxWidth: 420,
                    }}
                  >
                    {h.bullets.slice(0, 3).map((b, j) => (
                      <div
                        key={j}
                        style={{
                          background: "rgba(255,255,255,.92)",
                          backdropFilter: "blur(6px)",
                          borderRadius: "var(--radius-sm)",
                          padding: "12px 14px",
                          color: "#111",
                          fontSize: 13.5,
                          fontWeight: 500,
                          boxShadow: "0 6px 20px -10px rgba(0,0,0,.2)",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 99,
                            background: accent,
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "0 0 auto",
                          }}
                        >
                          <CheckIcon size={10} color="#fff" />
                        </span>
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>
      ))}

      {/* FAQ */}
      {faqs && faqs.length > 0 && (
        <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
          <Container narrow>
            <Eyebrow style={{ marginBottom: 18 }}>FAQ</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 3.4vw, 40px)",
                lineHeight: 1.04,
                letterSpacing: "-0.025em",
                fontWeight: 500,
                margin: "0 0 32px",
              }}
            >
              Common questions
            </h2>
            <div style={{ borderTop: "1px solid var(--line)" }}>
              {faqs.map((f) => (
                <details key={f.q} style={{ borderBottom: "1px solid var(--line)" }}>
                  <summary
                    style={{
                      padding: "20px 4px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      listStyle: "none",
                      fontSize: 16.5,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {f.q}
                    <span style={{ fontSize: 22, color: "var(--fg-3)" }}>+</span>
                  </summary>
                  <p style={{ margin: "0 0 20px", paddingRight: 48, fontSize: 15, lineHeight: 1.55, color: "var(--fg-3)" }}>{f.a}</p>
                </details>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* CTA */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
        <Container>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 3.6vw, 44px)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                fontWeight: 500,
                margin: 0,
                maxWidth: 640,
                textWrap: "balance",
              }}
            >
              Get started in minutes
            </h2>
            <p style={{ margin: 0, fontSize: 16, color: "var(--fg-3)", maxWidth: 560 }}>
              Connect your accounts, import contacts, and send your first message today.
            </p>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <Btn href="/auth/sign-up" variant="primary" size="lg" icon={<ArrowIcon />}>
                Start free trial
              </Btn>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
