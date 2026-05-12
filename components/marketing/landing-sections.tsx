"use client";

import { useMemo, useState } from "react";
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
import {
  ProductPanel,
  type ProductPanelVariant,
} from "@/components/marketing/product-panels";

// ─── Trust strip: real platforms we build on ──────────────────────────────
export function LogoBar() {
  const platforms = [
    { name: "WhatsApp Cloud API", sub: "Meta" },
    { name: "Resend", sub: "Email delivery" },
    { name: "Twilio", sub: "SMS carrier" },
    { name: "Stripe", sub: "Billing" },
    { name: "Supabase", sub: "Data & auth" },
  ];
  return (
    <section style={{ paddingBottom: 88 }}>
      <Container>
        <div
          style={{
            textAlign: "center",
            marginBottom: 28,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
          }}
        >
          Built on infrastructure you already trust
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${platforms.length}, minmax(0, 1fr))`,
            alignItems: "center",
            gap: 28,
          }}
        >
          {platforms.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                color: "var(--fg-2)",
                opacity: 0.85,
              }}
            >
              <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em" }}>
                {p.name}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", letterSpacing: ".04em" }}>
                {p.sub}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── Channels overview ────────────────────────────────────────────────────
function ChannelPreview({ ch }: { ch: "wa" | "em" | "sm" }) {
  if (ch === "wa") {
    return (
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#111", maxWidth: "80%", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
          Hi Aarav, your order #4821 ships today 📦
        </div>
        <div style={{ background: "#DCF8C6", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#111", alignSelf: "flex-end", maxWidth: "70%", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
          Awesome, thanks!
        </div>
        <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,.85)" }}>
          delivered · read
        </div>
      </div>
    );
  }
  if (ch === "em") {
    return (
      <div style={{ width: "100%", background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 8px 20px rgba(0,0,0,.10)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "#6b7280", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 4 }}>
          SEPT NEWSLETTER · TO 14,238
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 8 }}>What&apos;s new at Kettlewala this month</div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#6b7280", fontFamily: "var(--font-mono)" }}>
          <span>open · 32.1%</span>
          <span>click · 8.4%</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: "8px 12px", fontSize: 12, color: "#111", maxWidth: "85%", boxShadow: "0 4px 12px rgba(0,0,0,.10)" }}>
        Your OTP is <strong>739 204</strong>. Valid 5 min.
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,.9)", alignSelf: "flex-start" }}>
        DLT · TRANSACTIONAL · 99.99% delivery
      </div>
    </div>
  );
}

export function Channels() {
  const items: {
    ch: "wa" | "em" | "sm";
    title: string;
    tag: string;
    grad: string;
    bullets: string[];
  }[] = [
    {
      ch: "wa",
      title: "WhatsApp",
      tag: "Broadcasts · Templates · Live chat",
      grad: "linear-gradient(135deg, #0d9d4f 0%, #25D366 55%, #b6f1c2 100%)",
      bullets: [
        "Send approved templates",
        "Share photos, videos and files",
        "See who got it, read it, replied",
        "Reply live from one inbox",
      ],
    },
    {
      ch: "em",
      title: "Email",
      tag: "Your domain · Broadcasts · Tracking",
      grad: "linear-gradient(135deg, #1d3a8a 0%, #3b82f6 55%, #c7dcff 100%)",
      bullets: [
        "Send from your own domain",
        "See opens and clicks",
        "Build groups from tags",
        "Drag-and-drop builder",
      ],
    },
    {
      ch: "sm",
      title: "SMS",
      tag: "India + global · DLT-compliant",
      grad: "linear-gradient(135deg, #4c1d95 0%, #a855f7 55%, #e7d3ff 100%)",
      bullets: [
        "Approved DLT templates ready",
        "Send in India or worldwide",
        "OTPs and transactional alerts",
        "Auto-fallback from WhatsApp",
      ],
    },
  ];
  const accents: Record<string, string> = { wa: "#25D366", em: "#3b82f6", sm: "#a855f7" };
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <SectionHead
          eyebrow="ALL YOUR CHANNELS"
          title="Talk to customers on *the apps they use.*"
          lede="WhatsApp, Email and SMS — all from one place. One contact list. One inbox. One bill."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24, marginTop: 80 }}>
          {items.map((it) => (
            <div
              key={it.ch}
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-lg)",
                padding: 14,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 2px 0 rgba(255,255,255,.6) inset",
              }}
            >
              <div
                style={{
                  position: "relative",
                  background: it.grad,
                  borderRadius: "calc(var(--radius-lg) - 4px)",
                  padding: "28px 24px",
                  minHeight: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,.25), transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "relative", width: "100%" }}>
                  <ChannelPreview ch={it.ch} />
                </div>
              </div>
              <div style={{ padding: "24px 14px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: accents[it.ch],
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {it.ch === "wa" && <WaIcon color="#fff" />}
                    {it.ch === "em" && <MailIcon color="#fff" />}
                    {it.ch === "sm" && <SmsIcon color="#fff" />}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em" }}>{it.title}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", letterSpacing: ".03em" }}>{it.tag}</div>
                  </div>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                  {it.bullets.map((b, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--fg-2)" }}>
                      <span style={{ marginTop: 4, flex: "0 0 auto" }}>
                        <CheckIcon color={accents[it.ch]} />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── Feature deep-dives ───────────────────────────────────────────────────
function FeatureRow({
  reverse,
  eyebrow,
  title,
  body,
  points,
  panelVariant,
}: {
  reverse?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  panelVariant: ProductPanelVariant | "campaigns" | "template" | "segment" | "inbox" | "automation" | "analytics" | "team";
}) {
  const gradients: Record<string, string> = {
    campaigns: "radial-gradient(120% 90% at 0% 0%, #ffd9b8 0%, #f0a87a 35%, #c2410c 100%)",
    template: "radial-gradient(120% 90% at 100% 0%, #c8f0d8 0%, #6ed09a 40%, #0a6b3b 100%)",
    segment: "radial-gradient(120% 90% at 0% 100%, #e8d8ff 0%, #a78bfa 40%, #6d28d9 100%)",
    inbox: "radial-gradient(120% 90% at 100% 100%, #d6e6ff 0%, #7aa8ff 40%, #1e3a8a 100%)",
    automation: "linear-gradient(135deg, #fde2e4 0%, #f1a6c8 50%, #7c2d7a 100%)",
    analytics: "radial-gradient(120% 90% at 50% 0%, #c4e8ff 0%, #4fa6e6 40%, #0b3d6b 100%)",
    team: "linear-gradient(135deg, #fff1c4 0%, #f0b15a 50%, #b45309 100%)",
  };
  const wallpaper = gradients[panelVariant] || gradients.inbox;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.15fr",
        gap: 88,
        alignItems: "center",
        direction: reverse ? "rtl" : "ltr",
      }}
    >
      <div style={{ direction: "ltr" as const }}>
        <Eyebrow style={{ marginBottom: 18 }}>{eyebrow}</Eyebrow>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(30px, 3.6vw, 44px)",
            lineHeight: 1.05,
            letterSpacing: "-0.028em",
            fontWeight: 500,
            margin: "0 0 18px",
            textWrap: "balance",
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--fg-3)", margin: "0 0 26px", maxWidth: 480 }}>{body}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
          {points.map((p, i) => (
            <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ marginTop: 5, flex: "0 0 auto" }}>
                <CheckIcon color="var(--accent)" />
              </span>
              <span style={{ fontSize: 14.5, color: "var(--fg-2)" }}>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ direction: "ltr" as const }}>
        <div
          style={{
            background: wallpaper,
            borderRadius: "calc(var(--radius-lg) + 8px)",
            padding: "clamp(32px, 4.5vw, 64px) clamp(28px, 4vw, 56px)",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 30px 60px -30px rgba(0,0,0,.25)",
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(80% 60% at 50% 0%, rgba(255,255,255,.35), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <ProductPanel variant={panelVariant as ProductPanelVariant} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section
      style={{
        paddingTop: "var(--section-y)",
        paddingBottom: "var(--section-y)",
        background: "var(--bg-sunken)",
      }}
    >
      <Container>
        <SectionHead
          eyebrow="FEATURES"
          title="Real working software, *built for real teams.*"
          lede="Seven tools your team uses every day — campaigns, templates, segments, the inbox, automations, analytics, and team & billing."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 160, marginTop: 96 }}>
          <FeatureRow
            eyebrow="01 · CAMPAIGNS"
            title="Send to thousands. No spreadsheets."
            body="Schedule broadcasts on WhatsApp, Email and SMS. Watch every send progress live. Pause, resume or retry with one click."
            points={[
              "Schedule for later or send now",
              "Track every step — draft, sending, done",
              "Pause, resume or cancel mid-send",
              "Retry only the failed ones",
            ]}
            panelVariant="campaigns"
          />
          <FeatureRow
            reverse
            eyebrow="02 · TEMPLATES"
            title="Build WhatsApp templates. Get them approved fast."
            body="Design templates with text, media and buttons. Submit to Meta in one click. We sync the approval status back automatically."
            points={[
              "Marketing, Utility and Auth templates",
              "Pick from 20+ languages",
              "Live WhatsApp preview as you type",
              "One click to submit. Auto status sync.",
            ]}
            panelVariant="template"
          />
          <FeatureRow
            eyebrow="03 · SEGMENTS"
            title="Audiences that update themselves."
            body="Filter contacts by tag, source or any custom field. Save the filter and reuse it across every channel. See exactly how many people you'll reach before you send."
            points={[
              "Easy filter builder with AND / OR rules",
              "See audience size and credit cost live",
              "Reuse one segment across all channels",
              "Import CSVs and map custom fields",
            ]}
            panelVariant="segment"
          />
          <FeatureRow
            reverse
            eyebrow="04 · INBOX"
            title="Every reply, in one inbox."
            body="Reply to WhatsApp and SMS chats in the same place. Assign chats to teammates. Add internal notes. Same customer? We merge their chats automatically."
            points={[
              "Assign chats round-robin or by hand",
              "Add private notes and tag teammates",
              "Use saved replies with variables",
              "Auto-merge customers across channels",
            ]}
            panelVariant="inbox"
          />
          <FeatureRow
            eyebrow="05 · AUTOMATIONS"
            title="Set it up once. Let it run."
            body="Send a welcome message when someone signs up. Follow up if they don't reply. Branch into different paths based on what they do. No Zapier needed."
            points={[
              "Triggers: new contact, tag added, no reply",
              "Actions: send, wait, tag, assign, webhook",
              "If / then branches with yes / no logic",
              "Drag-and-drop builder. No code.",
            ]}
            panelVariant="automation"
          />
          <FeatureRow
            reverse
            eyebrow="06 · ANALYTICS"
            title="See what works. Drop what doesn't."
            body="Track delivery, opens, clicks and replies for every channel. See your credit usage at a glance. Export anything to CSV."
            points={[
              "A dashboard for each channel",
              "Delivery, open, click and reply rates",
              "Track credit usage with weekly forecasts",
              "Drill into any campaign or recipient",
            ]}
            panelVariant="analytics"
          />
          <FeatureRow
            eyebrow="07 · TEAM & BILLING"
            title="Add your team. Track every credit."
            body="Invite teammates with the right role. Every credit you spend is logged. Top up when you run low — or set up auto-recharge."
            points={[
              "Four roles — Owner, Admin, Editor, Viewer",
              "Every credit charge logged forever",
              "Buy top-up packs or auto-recharge",
              "Pay in INR or USD via Stripe",
            ]}
            panelVariant="team"
          />
        </div>
      </Container>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────
export function HowItWorks() {
  const steps = [
    { n: "01", title: "Connect your channels", body: "Connect WhatsApp via Meta's official flow, verify your email domain, and add your Twilio account for SMS." },
    { n: "02", title: "Add your contacts", body: "Upload a CSV or add contacts via the API. Tag them and build groups with the filter builder." },
    { n: "03", title: "Send. Reply. Automate.", body: "Send your first campaign. Reply to incoming messages in the inbox. Add automations when you're ready." },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <SectionHead eyebrow="GET STARTED" title="From signup to first send, *in three steps.*" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 28, marginTop: 64 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{ borderTop: "1px solid var(--fg)", paddingTop: 22, display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", letterSpacing: ".08em" }}>STEP {s.n}</div>
              <h4 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.15 }}>
                {s.title}
              </h4>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--fg-3)", margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── Live demo ────────────────────────────────────────────────────────────
export function LiveDemo() {
  const [tab, setTab] = useState<"inbox" | "broadcast" | "automation">("inbox");
  const tabs: { id: "inbox" | "broadcast" | "automation"; label: string }[] = [
    { id: "inbox", label: "Live Inbox" },
    { id: "broadcast", label: "Broadcasts" },
    { id: "automation", label: "Automations" },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
      <Container>
        <SectionHead eyebrow="PRODUCT TOUR" title="*See* the actual product." align="center" />
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 36, marginBottom: 28 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 99,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                background: tab === t.id ? "var(--fg)" : "transparent",
                color: tab === t.id ? "var(--bg)" : "var(--fg-2)",
                border: "1px solid " + (tab === t.id ? "var(--fg)" : "var(--line-2)"),
                transition: "all .15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <ProductPanel variant={tab} />
        </div>
      </Container>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    inrM: 999,
    inrY: 9590,
    usdM: 12,
    usdY: 115,
    credits: "5,000",
    contacts: "5,000",
    seats: "3",
    pitch: "For solo founders and small teams getting started.",
    features: ["WhatsApp Cloud API broadcasts", "Email + SMS campaigns", "Live inbox (3 seats)", "Basic automations", "CSV import & tagging"],
  },
  {
    id: "pro",
    name: "Pro",
    popular: true,
    inrM: 2499,
    inrY: 23990,
    usdM: 29,
    usdY: 278,
    credits: "15,000",
    contacts: "25,000",
    seats: "10",
    pitch: "For growing teams running real campaigns.",
    features: [
      "Everything in Starter",
      "Full automations + sequences",
      "A/B testing on campaigns",
      "Custom email domain",
      "10 seats, role permissions",
      "7-day Pro trial · 200 credits",
    ],
  },
  {
    id: "business",
    name: "Business",
    inrM: 6999,
    inrY: 67190,
    usdM: 79,
    usdY: 759,
    credits: "50,000",
    contacts: "100,000",
    seats: "∞",
    pitch: "For agencies and high-volume senders.",
    features: [
      "Everything in Pro",
      "Branching automations",
      "Unlimited seats",
      "Priority WhatsApp template review",
      "Dedicated success manager",
      "SLA & audit log",
    ],
  },
] as const;

function PricingCard({ plan, currency, cycle }: { plan: (typeof PLANS)[number]; currency: "INR" | "USD"; cycle: "m" | "y" }) {
  const price = cycle === "m" ? (currency === "INR" ? plan.inrM : plan.usdM) : currency === "INR" ? plan.inrY : plan.usdY;
  const symbol = currency === "INR" ? "₹" : "$";
  const period = cycle === "m" ? "/mo" : "/yr";
  const popular = "popular" in plan && plan.popular;
  return (
    <div
      style={{
        background: popular ? "var(--fg)" : "var(--bg-elev)",
        color: popular ? "var(--bg)" : "var(--fg)",
        border: "1px solid " + (popular ? "var(--fg)" : "var(--line)"),
        borderRadius: "var(--radius-lg)",
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "relative",
        transform: popular ? "translateY(-8px)" : "none",
      }}
    >
      {popular && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: 28,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            letterSpacing: ".08em",
            padding: "4px 10px",
            borderRadius: 99,
            fontWeight: 600,
          }}
        >
          MOST POPULAR
        </div>
      )}
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>{plan.name}</div>
        <div style={{ fontSize: 14, color: popular ? "var(--on-fg-muted)" : "var(--fg-3)", marginTop: 4 }}>{plan.pitch}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {symbol}
          {price.toLocaleString("en-IN")}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: popular ? "var(--on-fg-muted)" : "var(--fg-3)" }}>{period}</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 4,
          padding: "12px 0",
          borderTop: "1px solid " + (popular ? "var(--on-fg-line)" : "var(--line)"),
          borderBottom: "1px solid " + (popular ? "var(--on-fg-line)" : "var(--line)"),
        }}
      >
        {([
          ["Credits", plan.credits],
          ["Contacts", plan.contacts],
          ["Seats", plan.seats],
        ] as const).map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: popular ? "var(--on-fg-muted)" : "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        {plan.features.map((f, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, lineHeight: 1.45 }}>
            <span style={{ marginTop: 4, flex: "0 0 auto" }}>
              <CheckIcon color="var(--accent)" />
            </span>
            <span style={{ color: popular ? "var(--on-fg-strong)" : "var(--fg-2)" }}>{f}</span>
          </li>
        ))}
      </ul>
      <Btn href="/auth/sign-up" variant={popular ? "accent" : "primary"} size="md" style={{ width: "100%", justifyContent: "center" }}>
        Start {plan.name} {cycle === "y" && "(save 20%)"}
      </Btn>
    </div>
  );
}

export function Pricing({ defaultCurrency = "INR" }: { defaultCurrency?: "INR" | "USD" }) {
  const [currency, setCurrency] = useState<"INR" | "USD">(defaultCurrency);
  const [cycle, setCycle] = useState<"m" | "y">("m");
  return (
    <section id="pricing" style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <SectionHead
          eyebrow="PRICING"
          title="*Simple* pricing. Pay for what you send."
          lede="Pick a plan, get monthly credits. Heavy messages cost more, light ones less. No per-seat charges. Cancel any time."
          align="center"
        />
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 36, marginBottom: 48, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", background: "var(--bg-sunken)", border: "1px solid var(--line)", borderRadius: 99, padding: 3 }}>
            {(["INR", "USD"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 99,
                  border: "none",
                  background: currency === c ? "var(--fg)" : "transparent",
                  color: currency === c ? "var(--bg)" : "var(--fg-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: ".04em",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {c === "INR" ? "₹ INR" : "$ USD"}
              </button>
            ))}
          </div>
          <div style={{ display: "inline-flex", background: "var(--bg-sunken)", border: "1px solid var(--line)", borderRadius: 99, padding: 3 }}>
            {([
              ["m", "Monthly"],
              ["y", "Yearly — save 20%"],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setCycle(k)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 99,
                  border: "none",
                  background: cycle === k ? "var(--fg)" : "transparent",
                  color: cycle === k ? "var(--bg)" : "var(--fg-3)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, alignItems: "stretch" }}>
          {PLANS.map((p) => (
            <PricingCard key={p.id} plan={p} currency={currency} cycle={cycle} />
          ))}
        </div>
        <div style={{ marginTop: 28, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>
          Every plan includes the inbox, contacts and Stripe billing in INR or USD.
        </div>
      </Container>
    </section>
  );
}

// ─── Credit calculator ────────────────────────────────────────────────────
const CREDIT_WEIGHTS = {
  email: 1,
  waSession: 2,
  waUtility: 3,
  waMarketing: 5,
  smsDomestic: 5,
  smsIntl: 15,
};

function CreditSlider({
  label,
  sub,
  value,
  onChange,
  max,
  weight,
  color = "var(--accent)",
  step = 50,
}: {
  label: string;
  sub: string;
  value: number;
  onChange: (n: number) => void;
  max: number;
  weight: number;
  color?: string;
  step?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const credits = value * weight;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: color, flex: "0 0 auto" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
              {sub} · {weight} cr each
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.01em" }}>{value.toLocaleString()}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color, fontWeight: 600 }}>= {credits.toLocaleString()} cr</div>
        </div>
      </div>
      <div className="speediq-slider" style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 99,
            background: "var(--bg-sunken)",
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: pct + "%",
              background: `linear-gradient(90deg, ${color}aa, ${color})`,
              transition: "width .12s ease",
            }}
          />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "space-between", pointerEvents: "none", padding: "0 2px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ width: 1, height: 8, background: "var(--line)", opacity: 0.6 }} />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            width: "100%",
            height: 28,
            margin: 0,
            padding: 0,
            opacity: 0,
            cursor: "grab",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `calc(${pct}% - 11px)`,
            width: 22,
            height: 22,
            borderRadius: 99,
            background: "#fff",
            border: `2px solid ${color}`,
            boxShadow: "0 2px 6px rgba(0,0,0,.18), 0 1px 0 rgba(255,255,255,.6) inset",
            transition: "left .12s ease",
            pointerEvents: "none",
          }}
        >
          <div style={{ position: "absolute", inset: 5, borderRadius: 99, background: color }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-4)", letterSpacing: ".04em" }}>
        <span>0</span>
        <span>{(max / 2).toLocaleString()}</span>
        <span>{max.toLocaleString()}</span>
      </div>
    </div>
  );
}

export function CreditCalc() {
  const [v, setV] = useState({ email: 5000, waUtility: 800, waMarketing: 1200, smsDomestic: 400 });
  const total = useMemo(
    () =>
      v.email * CREDIT_WEIGHTS.email +
      v.waUtility * CREDIT_WEIGHTS.waUtility +
      v.waMarketing * CREDIT_WEIGHTS.waMarketing +
      v.smsDomestic * CREDIT_WEIGHTS.smsDomestic,
    [v]
  );
  const recommended = total <= 5000 ? "Starter" : total <= 15000 ? "Pro" : "Business";
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
      <Container>
        <SectionHead
          eyebrow="CREDIT CALCULATOR"
          title="*See* what you'll spend each month."
          lede="Drag the sliders to match your monthly volume. We'll suggest the right plan."
        />
        <div style={{ marginTop: 56, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, alignItems: "stretch" }}>
          <div
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <CreditSlider color="#3b82f6" step={100} label="Email sends" sub="Newsletters, transactional" value={v.email} onChange={(x) => setV({ ...v, email: Math.round(x) })} max={50000} weight={CREDIT_WEIGHTS.email} />
            <CreditSlider color="#25D366" step={50} label="WhatsApp utility" sub="OTPs, order updates" value={v.waUtility} onChange={(x) => setV({ ...v, waUtility: Math.round(x) })} max={10000} weight={CREDIT_WEIGHTS.waUtility} />
            <CreditSlider color="#0a9d4a" step={50} label="WhatsApp marketing" sub="Broadcasts, promos" value={v.waMarketing} onChange={(x) => setV({ ...v, waMarketing: Math.round(x) })} max={10000} weight={CREDIT_WEIGHTS.waMarketing} />
            <CreditSlider color="#a855f7" step={25} label="SMS (domestic)" sub="India routes" value={v.smsDomestic} onChange={(x) => setV({ ...v, smsDomestic: Math.round(x) })} max={5000} weight={CREDIT_WEIGHTS.smsDomestic} />
          </div>
          <div style={{ background: "var(--fg)", color: "var(--bg)", borderRadius: "var(--radius-lg)", padding: 32, display: "flex", flexDirection: "column", gap: 22, justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", color: "var(--on-fg-muted)", textTransform: "uppercase" }}>
                ESTIMATED CREDITS / MONTH
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 80, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, marginTop: 10 }}>{total.toLocaleString()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
                {([
                  ["Email", v.email * CREDIT_WEIGHTS.email],
                  ["WA utility", v.waUtility * CREDIT_WEIGHTS.waUtility],
                  ["WA marketing", v.waMarketing * CREDIT_WEIGHTS.waMarketing],
                  ["SMS domestic", v.smsDomestic * CREDIT_WEIGHTS.smsDomestic],
                ] as const).map(([k, n]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--on-fg-mid)" }}>
                    <span>{k}</span>
                    <span>{n.toLocaleString()} cr</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: "1px solid var(--on-fg-line)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--on-fg-muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                RECOMMENDED PLAN
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>{recommended}</span>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: "#25D366" }} />
              </div>
              <Btn href="/auth/sign-up" variant="accent" size="md" style={{ alignSelf: "flex-start" }} icon={<ArrowIcon />}>
                Start {recommended} plan
              </Btn>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ─── Why teams choose us (replaces fake testimonials) ─────────────────────
export function WhyChooseUs() {
  const reasons = [
    {
      title: "One bill, three channels",
      body: "WhatsApp, Email and SMS are all included. No add-ons, no per-seat charges, no juggling vendors.",
    },
    {
      title: "Predictable credit pricing",
      body: "Each plan includes a monthly credit allowance. Heavy messages cost more credits, light ones less. You see costs before you send.",
    },
    {
      title: "Built for teams from day one",
      body: "Multi-seat workspaces, four roles, shared inbox with assignment and a credit ledger that logs every charge.",
    },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <SectionHead eyebrow="WHY SPEEDIQ" title="Three reasons teams *pick us.*" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20, marginTop: 56 }}>
          {reasons.map((r) => (
            <div
              key={r.title}
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
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                  margin: 0,
                }}
              >
                {r.title}
              </h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "var(--fg-3)" }}>{r.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── Use cases ────────────────────────────────────────────────────────────
export function UseCasesGrid() {
  const cases: { tag: string; title: string; examples: string[] }[] = [
    {
      tag: "E-commerce",
      title: "Cart recovery, order confirms and post-purchase messages.",
      examples: ["Order WhatsApp template", "Cart recovery SMS", "Email newsletter"],
    },
    {
      tag: "Real estate",
      title: "Nurture leads on WhatsApp and SMS with team assignment.",
      examples: ["Lead capture flow", "Property drip campaign", "Appointment SMS"],
    },
    {
      tag: "Education",
      title: "Admissions, fee reminders and parent updates.",
      examples: ["Admission WhatsApp", "Fee SMS reminder", "Parent newsletter"],
    },
    {
      tag: "Fintech",
      title: "OTPs, KYC reminders and payment nudges. DLT compliant.",
      examples: ["OTP via WhatsApp Auth", "Balance alert SMS", "Audit log"],
    },
    {
      tag: "SAAS",
      title: "Trial nurture, onboarding flows and win-back messages.",
      examples: ["Welcome WhatsApp flow", "Trial expiry email", "Win-back SMS"],
    },
    {
      tag: "Agencies",
      title: "Run client workspaces with one bill and clean billing per project.",
      examples: ["Per-client workspaces", "Project-scoped credits", "Stripe billing"],
    },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
      <Container>
        <SectionHead eyebrow="USE CASES" title="Built for the way *teams* really message." />
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
          {cases.map((c, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-elev)",
                padding: "28px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                minHeight: 220,
              }}
            >
              <Eyebrow dot={false}>{c.tag}</Eyebrow>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                  lineHeight: 1.25,
                  textWrap: "balance",
                }}
              >
                {c.title}
              </div>
              <ul
                style={{
                  marginTop: "auto",
                  listStyle: "none",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {c.examples.map((ex) => (
                  <li
                    key={ex}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      color: "var(--fg-3)",
                      letterSpacing: ".02em",
                    }}
                  >
                    <span style={{ width: 4, height: 4, borderRadius: 99, background: "var(--accent)" }} />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────
export function FAQ() {
  const [open, setOpen] = useState<number>(0);
  const qs = [
    {
      q: "Do I need my own WhatsApp Business account?",
      a: "You connect (or create) your own WhatsApp Business account through Meta's official Embedded Signup flow inside SpeedIQ. The phone number, account and quality rating stay yours.",
    },
    {
      q: "How does credit pricing work?",
      a: "Each plan includes monthly credits. Each message deducts credits by type: email = 1, WhatsApp session = 2, WhatsApp utility template = 3, WhatsApp marketing template = 5, SMS domestic (India) = 5, SMS international = 15. Top-up packs are available any time.",
    },
    {
      q: "Does SpeedIQ support DLT for SMS in India?",
      a: "Yes. SMS uses Twilio. We surface principal entity, content template ID and sender ID configuration so India sends can be routed through DLT-compliant carriers.",
    },
    {
      q: "Can I import contacts from another tool?",
      a: "Yes. Contact import is via CSV with custom-field mapping for WhatsApp, email subscribers and SMS contacts.",
    },
    {
      q: "What happens if I run out of credits?",
      a: "Outbound sends pause when your balance hits zero — no surprise bills. You can top up any time, or enable auto-recharge on a chosen threshold.",
    },
    {
      q: "Do you offer yearly billing?",
      a: "Yes. Yearly plans are roughly 20% off the monthly rate. Billing runs on Stripe and supports INR and USD pricing.",
    },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container narrow>
        <SectionHead eyebrow="FAQ" title="*Common* questions, answered." align="center" />
        <div style={{ marginTop: 48, borderTop: "1px solid var(--line)" }}>
          {qs.map((it, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--line)" }}>
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "22px 4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  fontFamily: "inherit",
                  color: "var(--fg)",
                }}
              >
                <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>{it.q}</span>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    background: open === i ? "var(--fg)" : "transparent",
                    color: open === i ? "var(--bg)" : "var(--fg-3)",
                    border: "1px solid " + (open === i ? "var(--fg)" : "var(--line-2)"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flex: "0 0 auto",
                    transition: "all .2s ease",
                  }}
                >
                  {open === i ? "−" : "+"}
                </span>
              </button>
              <div style={{ maxHeight: open === i ? 200 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
                <p style={{ margin: "0 0 22px", paddingRight: 48, fontSize: 15.5, lineHeight: 1.55, color: "var(--fg-3)" }}>{it.a}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────
export function FinalCTA() {
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <div
          style={{
            background: "var(--fg)",
            color: "var(--bg)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(48px, 8vw, 96px) clamp(32px, 6vw, 80px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-30%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 600,
              height: 600,
              borderRadius: "50%",
              background: "radial-gradient(circle, var(--accent) 0%, transparent 60%)",
              opacity: 0.18,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <Eyebrow style={{ color: "var(--on-fg-muted)" }}>7-DAY FREE TRIAL</Eyebrow>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(40px, 6vw, 84px)",
                fontWeight: 500,
                letterSpacing: "-0.035em",
                lineHeight: 1,
                margin: 0,
                textWrap: "balance",
                maxWidth: 900,
              }}
            >
              One inbox. <span style={{ color: "var(--accent)" }}>Every channel.</span>
              <br />
              Ship today.
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.5, color: "var(--on-fg-mid)", margin: 0, maxWidth: 540 }}>
              Set up your workspace, connect WhatsApp, send your first campaign. All before lunch.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              <Btn href="/auth/sign-up" variant="accent" size="lg" icon={<ArrowIcon />}>
                Start free trial
              </Btn>
              <Link
                href="/compare"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 48,
                  padding: "0 22px",
                  background: "transparent",
                  color: "var(--bg)",
                  border: "1px solid var(--on-fg-line)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
