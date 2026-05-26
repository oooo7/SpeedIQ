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
    tag: "Broadcasts · Templates · Live chat",
    body: "Connect your WhatsApp Business account. Send approved templates. Run broadcasts. Chat live with customers.",
    accent: "#25D366",
    grad: "linear-gradient(135deg, #0d9d4f 0%, #25D366 55%, #b6f1c2 100%)",
    icon: <WaIcon color="#fff" size={20} />,
  },
  {
    href: "/features/email",
    title: "Email",
    tag: "Your domain · Builder · Tracking",
    body: "Send from your own domain. Build emails in HTML or drag-and-drop. Track every open, click and bounce.",
    accent: "#3b82f6",
    grad: "linear-gradient(135deg, #1d3a8a 0%, #3b82f6 55%, #c7dcff 100%)",
    icon: <MailIcon color="#fff" size={20} />,
  },
  {
    href: "/features/sms",
    title: "SMS",
    tag: "US/Canada + global · carrier-compliant",
    body: "Send SMS in US/Canada or worldwide. Pause and resume mid-campaign. Reply to incoming messages.",
    accent: "#a855f7",
    grad: "linear-gradient(135deg, #4c1d95 0%, #a855f7 55%, #e7d3ff 100%)",
    icon: <SmsIcon color="#fff" size={20} />,
  },
  {
    href: "/features/inbox",
    title: "Unified inbox",
    tag: "All channels · Team-ready",
    body: "All your WhatsApp and SMS replies in one inbox. Assign chats to teammates. Use quick replies and saved messages.",
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
  { title: "Campaigns & scheduling", body: "Schedule sends or fire instantly. Pause, resume and retry anytime." },
  { title: "Templates", body: "Build with text, images and buttons. Submit to Meta — we sync the approval status back." },
  { title: "Segments & tags", body: "Save filtered groups of contacts. See exactly how many people you'll reach." },
  { title: "Analytics", body: "Dashboards for every channel. Sent, delivered, read, clicked, bounced. Up to a year of history." },
  { title: "Team & roles", body: "Four roles. Invite teammates with a link that expires in 7 days." },
  { title: "Compliance", body: "10DLC for SMS in the US. CAN-SPAM and one-click unsubscribe for email. STOP and HELP keywords handled for you." },
  { title: "API + webhooks", body: "Send messages from your code. Get webhooks for every reply, delivery and click." },
  { title: "AI assist", body: "Draft replies, rewrite copy, summarize chats. Business plan only." },
  { title: "Saved messages", body: "A shared library of ready-to-send replies, with images and files." },
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
            lede="One workspace that replaces your WhatsApp tool, email sender, SMS gateway and shared inbox. Here's what you get."
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
            title="*Everything* you need, in one place."
            lede="Templates, segments, automations, analytics, team management, billing — all built in."
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
              Start a free trial. Connect WhatsApp, Email and SMS in one workspace.
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
