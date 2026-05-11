import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowIcon,
  Btn,
  CheckIcon,
  Container,
  Eyebrow,
  MailIcon,
  SectionHead,
  SmsIcon,
  WaIcon,
} from "@/components/marketing/atoms";
import { Features as FeatureDeepDives } from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "Features — SpeedIQ",
  description:
    "Everything SpeedIQ does: WhatsApp, Email, SMS, unified inbox, templates, segments, automations, analytics, teams and credits.",
  alternates: { canonical: "/features" },
};

const CHANNELS = [
  {
    href: "/features/whatsapp",
    title: "WhatsApp",
    tag: "Cloud API · Broadcasts · Templates",
    body: "Embedded Signup, approved templates with media + buttons, broadcasts, live chat, working hours, and quality monitoring.",
    accent: "#25D366",
    grad: "linear-gradient(135deg, #0d9d4f 0%, #25D366 55%, #b6f1c2 100%)",
    icon: <WaIcon color="#fff" size={20} />,
  },
  {
    href: "/features/email",
    title: "Email",
    tag: "Resend · Custom domains",
    body: "Custom domain via DNS verification, HTML or drag editor, segments, bounce handling, one-click unsubscribe.",
    accent: "#3b82f6",
    grad: "linear-gradient(135deg, #1d3a8a 0%, #3b82f6 55%, #c7dcff 100%)",
    icon: <MailIcon color="#fff" size={20} />,
  },
  {
    href: "/features/sms",
    title: "SMS",
    tag: "Twilio · DLT-compliant",
    body: "DLT-compliant SMS for India and international, pause / resume / retry mid-broadcast, two-way inbox.",
    accent: "#a855f7",
    grad: "linear-gradient(135deg, #4c1d95 0%, #a855f7 55%, #e7d3ff 100%)",
    icon: <SmsIcon color="#fff" size={20} />,
  },
  {
    href: "/features/inbox",
    title: "Unified inbox",
    tag: "Cross-channel · Team-ready",
    body: "Every WhatsApp and SMS reply in one stream — assignment, tags, quick replies, canned messages with media.",
    accent: "#0a0a0a",
    grad: "linear-gradient(135deg, #18181b 0%, #3f3f46 55%, #a1a1aa 100%)",
    icon: (
      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7">
        <path d="M3 7h18M3 12h18M3 17h12" />
      </svg>
    ),
  },
];

const PLATFORM = [
  { title: "Campaigns & scheduling", body: "Schedule, send-now, pause / resume / retry. Live lifecycle from draft to completed." },
  { title: "Templates", body: "Variables, header media, footer, buttons. Submit to Meta and sync approval back automatically." },
  { title: "Segments & tags", body: "Filter-based segments saved as reusable audiences. Live audience-size preview before launch." },
  { title: "Analytics", body: "Per-channel dashboards: sent, delivered, read, clicked, bounced. 30 days to 1 year retention." },
  { title: "Team & roles", body: "Owner, admin, editor, viewer roles. Token-based invitations with 7-day expiry." },
  { title: "Compliance", body: "DLT for SMS, one-click unsubscribe, STOP / HELP keyword handling — across every channel." },
  { title: "API + webhooks", body: "REST API for sends and contact sync. Webhooks deliver replies, delivery, opens, clicks." },
  { title: "AI assist", body: "Draft replies, rewrite campaign copy, summarize threads. Business plan only." },
  { title: "Canned messages", body: "Project-wide library of pre-written responses with media attachments." },
];

export default function FeaturesPage() {
  return (
    <>
      {/* HEADER */}
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="FEATURES"
            title="The whole platform, *at a glance.*"
            lede="SpeedIQ replaces your WhatsApp BSP, email sender, SMS gateway and shared inbox with one workspace. Here's exactly what's in the box."
            align="center"
          />
        </Container>
      </section>

      {/* CHANNELS */}
      <section style={{ paddingTop: 48, paddingBottom: "var(--section-y)" }}>
        <Container>
          <Eyebrow style={{ marginBottom: 24 }}>CHANNELS</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {CHANNELS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  textDecoration: "none",
                  color: "var(--fg)",
                  boxShadow: "0 2px 0 rgba(255,255,255,.6) inset",
                  transition: "transform .15s ease",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    background: c.grad,
                    borderRadius: "calc(var(--radius-lg) - 4px)",
                    minHeight: 160,
                    padding: "24px 28px",
                    display: "flex",
                    alignItems: "flex-end",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,.25), transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "#fff",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(255,255,255,.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backdropFilter: "blur(6px)",
                      }}
                    >
                      {c.icon}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}>{c.title}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,.85)", letterSpacing: ".03em" }}>{c.tag}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "20px 16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--fg-2)", margin: 0 }}>{c.body}</p>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--fg)",
                    }}
                  >
                    Explore <ArrowIcon />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* PLATFORM CAPABILITIES */}
      <section
        style={{
          paddingTop: "var(--section-y)",
          paddingBottom: "var(--section-y)",
          background: "var(--bg-sunken)",
        }}
      >
        <Container>
          <SectionHead
            eyebrow="PLATFORM CAPABILITIES"
            title="Beyond the channels, *a complete workflow.*"
            lede="Templates, segments, automations, analytics, team, billing — everything that turns three channels into one product."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 1,
              marginTop: 56,
              background: "var(--line)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            {PLATFORM.map((p) => (
              <div
                key={p.title}
                style={{
                  background: "var(--bg-elev)",
                  padding: "28px 26px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 180,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--bg-sunken)",
                    color: "var(--fg-3)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckIcon color="var(--accent)" />
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--fg-3)", margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* DEEP-DIVE PRODUCT ROWS — reused from landing */}
      <FeatureDeepDives />

      {/* CTA */}
      <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
        <Container>
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
            }}
          >
            <Eyebrow>SEE IT FOR YOURSELF</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 4vw, 48px)",
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
                fontWeight: 500,
                margin: 0,
                maxWidth: 720,
                textWrap: "balance",
              }}
            >
              Start a free trial. Connect WhatsApp in 5 minutes.
            </h2>
            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
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
    </>
  );
}
