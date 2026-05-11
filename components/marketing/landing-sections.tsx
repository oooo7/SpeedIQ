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

// ─── Logo / Social proof bar ──────────────────────────────────────────────
export function LogoBar() {
  const logos = ["Kettlewala", "Saanvi Studio", "Northbeam", "Rivermint", "Octopay", "Glasshouse", "Mango Labs"];
  return (
    <section style={{ paddingBottom: 88 }}>
      <Container>
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
          }}
        >
          Trusted by 2,400+ Indian SMBs
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${logos.length}, 1fr)`,
            alignItems: "center",
            gap: 28,
            opacity: 0.55,
          }}
        >
          {logos.map((l, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                textAlign: "center",
                color: "var(--fg-2)",
                opacity: 0.7,
              }}
            >
              {l}
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
      tag: "Cloud API · Broadcasts · Templates",
      grad: "linear-gradient(135deg, #0d9d4f 0%, #25D366 55%, #b6f1c2 100%)",
      bullets: [
        "Approved template library",
        "Session messages with media",
        "Delivery, read & reply analytics",
        "Live two-way inbox",
      ],
    },
    {
      ch: "em",
      title: "Email",
      tag: "Resend-backed · Custom domains",
      grad: "linear-gradient(135deg, #1d3a8a 0%, #3b82f6 55%, #c7dcff 100%)",
      bullets: [
        "Bring your own domain (SPF/DKIM)",
        "Open & click tracking",
        "Segment by tag, behavior, list",
        "Drag-and-drop builder",
      ],
    },
    {
      ch: "sm",
      title: "SMS",
      tag: "Twilio · DLT-compliant · India-ready",
      grad: "linear-gradient(135deg, #4c1d95 0%, #a855f7 55%, #e7d3ff 100%)",
      bullets: [
        "Pre-approved DLT templates",
        "Domestic & international routes",
        "OTP & transactional flows",
        "Fallback from WhatsApp",
      ],
    },
  ];
  const accents: Record<string, string> = { wa: "#25D366", em: "#3b82f6", sm: "#a855f7" };
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <SectionHead
          eyebrow="THREE CHANNELS · ONE WORKSPACE"
          title="Reach customers *wherever* they actually reply."
          lede="Stop bouncing between Wati, Mailchimp and your SMS gateway. SpeedIQ ships all three behind a single contact list, single inbox, single bill."
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
          eyebrow="FEATURE DEEP-DIVES"
          title="The working software, *not* a marketing wireframe."
          lede="Seven surfaces your team will actually live in — built to be picked up in an afternoon, not a quarter."
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 160, marginTop: 96 }}>
          <FeatureRow
            eyebrow="01 · CAMPAIGNS"
            title="Send to thousands, without the spreadsheet."
            body="Schedule WhatsApp template broadcasts, email blasts and SMS campaigns to filtered segments. Watch sends progress live — pause, resume, retry failures with one click."
            points={[
              "Schedule, send-now, send-to-list or single test message",
              "Live lifecycle: draft → scheduled → sending → completed",
              "Pause / resume / cancel / retry mid-broadcast",
              "Quota gates prevent accidental overspend",
            ]}
            panelVariant="campaigns"
          />
          <FeatureRow
            reverse
            eyebrow="02 · TEMPLATES"
            title="Meta-compliant templates, built and approved without leaving the app."
            body="Compose WhatsApp templates with header, body, footer, buttons and variables. Submit to Meta, sync existing WABA templates, view rejection reasons inline."
            points={[
              "Marketing, Utility & Authentication categories",
              "Multi-language (EN/ES/FR + 20 more)",
              "Live WhatsApp preview as you type",
              "One-click submit to Meta + status sync",
            ]}
            panelVariant="template"
          />
          <FeatureRow
            eyebrow="03 · SEGMENTS"
            title="Audiences that update themselves."
            body="Filter contacts by tag, source, custom field, last reply or lifetime value. Save segments and reuse them across channels. Live audience preview before you hit send."
            points={[
              "Visual filter builder · AND/OR logic",
              "Live audience count + credit estimate",
              "Save and reuse across WhatsApp, email & SMS",
              "CSV import with custom-field mapping",
            ]}
            panelVariant="segment"
          />
          <FeatureRow
            reverse
            eyebrow="04 · INBOX"
            title="Every conversation, every channel, one thread."
            body="Assign threads to teammates, leave private notes, snooze and reopen. WhatsApp and SMS conversations from the same number merge automatically. Working-hours queue defers off-hours sends."
            points={[
              "Round-robin assignment + working hours",
              "Internal notes, mentions, resolution status",
              "Canned replies with merge variables",
              "Auto-merge contacts across channels",
            ]}
            panelVariant="inbox"
          />
          <FeatureRow
            eyebrow="05 · AUTOMATIONS"
            title="If-this-then-that, for every channel."
            body="From a single welcome message on Starter to branching multi-step journeys on Business — automate follow-ups without a Zapier subscription."
            points={[
              "Triggers: new contact, tag added, no reply in N hours",
              "Actions: send, wait, tag, assign, webhook",
              "Branching logic with yes/no conditions",
              "Drag-and-drop builder, no code",
            ]}
            panelVariant="automation"
          />
          <FeatureRow
            reverse
            eyebrow="06 · ANALYTICS"
            title="Know what's working across every channel."
            body="Per-channel dashboards for delivery, opens, clicks, replies and credit burn. Roll up the whole workspace or drill into a single campaign. Export to CSV."
            points={[
              "Per-channel dashboards (WhatsApp / Email / SMS)",
              "Delivery, open, click, reply & bounce rates",
              "Credit usage by send type with weekly forecast",
              "Campaign-level recipient breakdown with error codes",
            ]}
            panelVariant="analytics"
          />
          <FeatureRow
            eyebrow="07 · TEAM & BILLING"
            title="Multi-seat, multi-project, no surprises on the invoice."
            body="Invite teammates with Owner / Admin / Editor / Viewer roles. Track every credit charge in an immutable ledger. Top up with packs or auto-recharge."
            points={[
              "4 roles · 7-day expiring invite tokens",
              "Atomic credit ledger — every charge logged",
              "Top-up packs · auto-recharge thresholds",
              "Stripe multi-currency (INR / USD) · self-serve portal",
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
    { n: "01", title: "Connect your channels", body: "Plug in WhatsApp Cloud API, your sending domain for email, and Twilio for SMS. Most teams are live in under 20 minutes." },
    { n: "02", title: "Import & segment contacts", body: "Drop in a CSV or sync from your CRM. Tag by source, behavior, plan — build audiences with the filter builder." },
    { n: "03", title: "Broadcast, reply, automate", body: "Send your first campaign, answer replies from the unified inbox, and graduate to automations when you're ready." },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <SectionHead eyebrow="GET STARTED IN AN AFTERNOON" title="From signup to first broadcast *in under an hour.*" />
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
        <SectionHead eyebrow="A LOOK INSIDE" title="The product, *not* a hero illustration." align="center" />
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
        <div style={{ fontSize: 14, color: popular ? "rgba(255,255,255,.6)" : "var(--fg-3)", marginTop: 4 }}>{plan.pitch}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>
          {symbol}
          {price.toLocaleString("en-IN")}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: popular ? "rgba(255,255,255,.6)" : "var(--fg-3)" }}>{period}</span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 4,
          padding: "12px 0",
          borderTop: "1px solid " + (popular ? "rgba(255,255,255,.15)" : "var(--line)"),
          borderBottom: "1px solid " + (popular ? "rgba(255,255,255,.15)" : "var(--line)"),
        }}
      >
        {([
          ["Credits", plan.credits],
          ["Contacts", plan.contacts],
          ["Seats", plan.seats],
        ] as const).map(([k, v]) => (
          <div key={k}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: popular ? "rgba(255,255,255,.55)" : "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</div>
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
            <span style={{ color: popular ? "rgba(255,255,255,.85)" : "var(--fg-2)" }}>{f}</span>
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
          title="INR-first. *Built* for Indian SMB margins."
          lede="No per-seat tax. Predictable subscription plus pay-as-you-grow credits. Cancel any time."
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
          All plans include the unified inbox, contacts CRM, and Stripe billing in INR or USD.
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
          title="No surprise bills. *Estimate* your monthly usage."
          lede="Credits weight each message type by real cost. Slide the dials below to see which plan fits."
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
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", color: "rgba(255,255,255,.55)", textTransform: "uppercase" }}>
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
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(255,255,255,.7)" }}>
                    <span>{k}</span>
                    <span>{n.toLocaleString()} cr</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,.55)", letterSpacing: ".08em", textTransform: "uppercase" }}>
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

// ─── Testimonials ─────────────────────────────────────────────────────────
export function Testimonials() {
  const quotes = [
    { q: "We replaced Wati and Mailchimp with one bill. Our reply time dropped from 4 hours to 11 minutes.", who: "Priya Sharma", role: "Founder, Saanvi Studio" },
    { q: "Credit pricing makes sense for India. We finally know what a campaign will cost before we hit send.", who: "Rohit Iyer", role: "Growth, Northbeam" },
    { q: "The unified inbox is the actual product. Three reps handle WhatsApp, email and SMS without switching tabs.", who: "Anjali Mehta", role: "Ops Lead, Octopay" },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container>
        <SectionHead eyebrow="WHAT CUSTOMERS SAY" title="Teams that ship faster *after switching.*" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 20, marginTop: 56 }}>
          {quotes.map((t, i) => (
            <figure
              key={i}
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-lg)",
                padding: "28px 26px",
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 22,
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 32, color: "var(--accent)", lineHeight: 0, marginTop: 6 }}>“</div>
              <blockquote style={{ margin: 0, fontSize: 17, lineHeight: 1.45, color: "var(--fg)", letterSpacing: "-0.01em" }}>{t.q}</blockquote>
              <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
                <div style={{ width: 36, height: 36, borderRadius: 99, background: "var(--bg-sunken)", border: "1px solid var(--line)" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{t.who}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── Use cases ────────────────────────────────────────────────────────────
export function UseCasesGrid() {
  const cases = [
    { tag: "E-commerce", title: "Cart recovery, COD confirmations & post-purchase loops.", stat: "3.2×", stath: "Recovery uplift" },
    { tag: "Real estate", title: "Lead nurture across WhatsApp & SMS with assignment.", stat: "< 5 min", stath: "Avg response" },
    { tag: "Education", title: "Enrollment broadcasts, fee reminders, parent updates.", stat: "94%", stath: "Delivery rate" },
    { tag: "Fintech", title: "OTPs, KYC reminders, payment nudges — DLT compliant.", stat: "99.99%", stath: "OTP uptime" },
    { tag: "SAAS", title: "Trial nurture, onboarding sequences, churn save-flows.", stat: "−27%", stath: "Trial churn" },
    { tag: "Agencies", title: "White-labelled client workspaces with unified billing.", stat: "5×", stath: "Client capacity" },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)" }}>
      <Container>
        <SectionHead eyebrow="USE CASES" title="Built for the way Indian businesses *actually* message." />
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
            <div key={i} style={{ background: "var(--bg-elev)", padding: "28px 26px", display: "flex", flexDirection: "column", gap: 14, minHeight: 220 }}>
              <Eyebrow dot={false}>{c.tag}</Eyebrow>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2, textWrap: "balance" }}>{c.title}</div>
              <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>{c.stat}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{c.stath}</span>
              </div>
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
    { q: "Do I need my own WhatsApp Business API?", a: "No. SpeedIQ provisions the WhatsApp Cloud API for you in onboarding. We help with phone number verification and template approvals." },
    { q: "How does credit pricing work?", a: "Each plan includes a monthly credit allotment. Messages consume credits by type: email = 1, WhatsApp session = 2, utility template = 3, marketing template = 5, SMS domestic = 5–6, SMS international = 15. Top-up packs available anytime." },
    { q: "Is SpeedIQ DLT-compliant for Indian SMS?", a: "Yes. We handle DLT principal entity registration, header & template approvals, and route through compliant Indian carriers via Twilio." },
    { q: "Can I migrate from Wati / Interakt / AiSensy?", a: "Yes. Import contacts via CSV, and we'll port your approved WhatsApp templates. Most teams migrate in a single afternoon — concierge migration available on Pro and Business." },
    { q: "What happens if I exceed my credit allotment?", a: "You'll be alerted at 80% and 95%. After 100%, send queues pause until you top up — never a surprise bill. Top-up packs start at ₹499." },
    { q: "Do you offer annual billing?", a: "Yes — yearly plans save 20% off monthly pricing. Available in INR and USD via Stripe." },
  ];
  return (
    <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)" }}>
      <Container narrow>
        <SectionHead eyebrow="FAQ" title="Questions we get *every week.*" align="center" />
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
            <Eyebrow style={{ color: "rgba(255,255,255,.6)" }}>7-DAY PRO TRIAL · 200 CREDITS</Eyebrow>
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
            <p style={{ fontSize: 18, lineHeight: 1.5, color: "rgba(255,255,255,.7)", margin: 0, maxWidth: 540 }}>
              Spin up your workspace, connect WhatsApp, send your first broadcast — all before lunch.
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
                  border: "1px solid rgba(255,255,255,.2)",
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
