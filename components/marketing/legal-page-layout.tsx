import type { ReactNode } from "react";
import Link from "next/link";

import {
  Container,
  Eyebrow,
} from "@/components/marketing/atoms";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: ReactNode;
}

const LEGAL_LINKS = [
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Terms", href: "/legal/terms" },
  { label: "Refund", href: "/legal/refund" },
  { label: "Cookies", href: "/legal/cookies" },
  { label: "DPA", href: "/legal/dpa" },
  { label: "Acceptable use", href: "/legal/acceptable-use" },
];

export function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  children,
}: LegalPageLayoutProps) {
  return (
    <section style={{ paddingTop: 88, paddingBottom: 120 }}>
      <Container>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: 64,
            alignItems: "flex-start",
          }}
          className="speediq-legal-grid"
        >
          <aside
            className="speediq-legal-aside"
            style={{
              position: "sticky",
              top: 88,
              alignSelf: "flex-start",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              borderRight: "1px solid var(--line)",
              paddingRight: 16,
            }}
          >
            <Eyebrow>LEGAL</Eyebrow>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    fontSize: 13.5,
                    color: "var(--fg-2)",
                    padding: "7px 0",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </aside>

          <div style={{ maxWidth: 760 }}>
            <Eyebrow>POLICIES</Eyebrow>
            <h1
              style={{
                marginTop: 18,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px, 4.8vw, 64px)",
                lineHeight: 1.04,
                letterSpacing: "-0.035em",
                fontWeight: 500,
              }}
            >
              {title}
            </h1>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 12,
                alignItems: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
                letterSpacing: ".02em",
              }}
            >
              <span>LAST UPDATED · {lastUpdated.toUpperCase()}</span>
              <span style={{ width: 4, height: 4, borderRadius: 99, background: "var(--fg-4)" }} />
              <span>v1.0</span>
            </div>
            {intro && (
              <p
                style={{
                  marginTop: 32,
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: "var(--fg-2)",
                  maxWidth: 680,
                }}
              >
                {intro}
              </p>
            )}
            <article
              className="speediq-legal-body"
              style={{
                marginTop: 48,
                display: "flex",
                flexDirection: "column",
                gap: 40,
              }}
            >
              {children}
            </article>

            <div
              style={{
                marginTop: 80,
                paddingTop: 32,
                borderTop: "1px solid var(--line)",
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
              }}
            >
              <span>Questions? Email</span>
              <a
                href="mailto:legal@speediq.app"
                style={{ color: "var(--fg)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                legal@speediq.app
              </a>
            </div>
          </div>
        </div>
      </Container>

      <style>{`
        .speediq-legal-body h2 {
          font-family: var(--font-geist);
          font-size: 22px;
          font-weight: 500;
          letter-spacing: -0.018em;
          margin: 0 0 12px;
          color: var(--fg);
        }
        .speediq-legal-body p {
          font-size: 15.5;
          line-height: 1.65;
          color: var(--fg-2);
          margin: 0 0 14px;
        }
        .speediq-legal-body ul {
          padding-left: 22px;
          margin: 0 0 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .speediq-legal-body li {
          font-size: 15px;
          line-height: 1.6;
          color: var(--fg-2);
        }
        .speediq-legal-body a {
          color: var(--fg);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .speediq-legal-body table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
          margin: 12px 0;
        }
        .speediq-legal-body th,
        .speediq-legal-body td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--line);
          text-align: left;
        }
        .speediq-legal-body th {
          font-family: var(--font-geist-mono);
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--fg-3);
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .speediq-legal-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .speediq-legal-aside {
            position: static !important;
            border-right: none !important;
            border-bottom: 1px solid var(--line) !important;
            padding-bottom: 20px;
            padding-right: 0 !important;
          }
        }
      `}</style>
    </section>
  );
}

interface LegalSectionProps {
  title: string;
  children: ReactNode;
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section>
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
