import Link from "next/link";

import { Container, SpeedIQLogo } from "@/components/marketing/atoms";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "WhatsApp", href: "/features/whatsapp" },
      { label: "Email", href: "/features/email" },
      { label: "SMS", href: "/features/sms" },
      { label: "Live inbox", href: "/features/inbox" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { label: "E-commerce", href: "/use-cases" },
      { label: "Real estate", href: "/use-cases" },
      { label: "Education", href: "/use-cases" },
      { label: "Fintech", href: "/use-cases" },
      { label: "SAAS", href: "/use-cases" },
      { label: "Agencies", href: "/use-cases" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Why SpeedIQ", href: "/compare" },
      { label: "Use cases", href: "/use-cases" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/legal/privacy" },
      { label: "Terms", href: "/legal/terms" },
      { label: "DPA", href: "/legal/dpa" },
      { label: "Refunds", href: "/legal/refund" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Acceptable use", href: "/legal/acceptable-use" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer style={{ paddingTop: 80, paddingBottom: 40, borderTop: "1px solid var(--line)" }}>
      <Container>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(4, minmax(0, 1fr))",
            gap: 48,
            marginBottom: 56,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Link href="/" style={{ display: "inline-flex" }}>
              <SpeedIQLogo size={22} />
            </Link>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-3)", margin: 0, maxWidth: 280 }}>
              One place to send WhatsApp, Email and SMS — and reply to every customer in one inbox.
            </p>
            
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                  color: "var(--fg-3)",
                  marginBottom: 16,
                }}
              >
                {c.title}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} style={{ fontSize: 13.5, color: "var(--fg-2)" }}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            borderTop: "1px solid var(--line)",
            fontFamily: "var(--font-mono)",
            fontSize: 11.5,
            color: "var(--fg-3)",
            letterSpacing: ".03em",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span>© {new Date().getFullYear()} SpeedIQ.</span>
          <span>
            <Link href="/legal/privacy" style={{ color: "var(--fg-3)" }}>Privacy</Link>
            <span style={{ margin: "0 10px", color: "var(--fg-4)" }}>·</span>
            <Link href="/legal/terms" style={{ color: "var(--fg-3)" }}>Terms</Link>
          </span>
        </div>
      </Container>
    </footer>
  );
}
