"use client";

import { useEffect, useState } from "react";

import {
  ArrowIcon,
  Btn,
  ChannelDot,
  CheckIcon,
  Container,
  ItalicEmph,
  MailIcon,
  PhoneIcon,
  SmsIcon,
  WaIcon,
} from "@/components/marketing/atoms";

function ChannelStrip({ center }: { center?: boolean }) {
  const channels = [
    { key: "wa", label: "WhatsApp", color: "#25D366", icon: <WaIcon size={13} color="#fff" /> },
    { key: "em", label: "Email", color: "#3b82f6", icon: <MailIcon size={13} color="#fff" /> },
    { key: "sm", label: "SMS", color: "#a855f7", icon: <SmsIcon size={13} color="#fff" /> },
    { key: "ph", label: "Calls", color: "#f59e0b", icon: <PhoneIcon size={13} color="#fff" /> },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        justifyContent: center ? "center" : "flex-start",
      }}
    >
      {channels.map((c) => (
        <span
          key={c.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 12px 7px 10px",
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 99,
              background: c.color,
              color: "#fff",
            }}
          >
            {c.icon}
          </span>
          {c.label}
          {c.key === "ph" && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                fontWeight: 600,
                padding: "1px 6px",
                borderRadius: 4,
                background: "var(--bg-sunken)",
                color: "var(--fg-3)",
                letterSpacing: ".05em",
              }}
            >
              SOON
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function HeroCopy({ align = "left" }: { align?: "left" | "center" }) {
  const center = align === "center";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        alignItems: center ? "center" : "flex-start",
        textAlign: center ? "center" : "left",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(40px, 5.2vw, 68px)",
          lineHeight: 1.04,
          letterSpacing: "-0.032em",
          fontWeight: 500,
          margin: 0,
        }}
      >
        Campaigns, conversations &amp;
        <br />
        <ItalicEmph>everything between. One workspace.</ItalicEmph>
      </h1>
      <p
        style={{
          fontSize: 19,
          lineHeight: 1.5,
          color: "var(--fg-3)",
          margin: 0,
          maxWidth: 540,
          textWrap: "pretty",
        }}
      >
        SpeedIQ brings broadcasts, templates, segments, the live inbox and analytics across WhatsApp, Email and SMS into one workspace with one bill — with Calls coming soon.
      </p>
      <ChannelStrip center={center} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: center ? "center" : "flex-start" }}>
        <Btn href="/auth/sign-up" variant="primary" size="lg" icon={<ArrowIcon />}>
          Start free trial
        </Btn>
        <Btn href="/compare" variant="ghost" size="lg">
          Book a demo
        </Btn>
      </div>
      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          alignItems: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11.5,
          color: "var(--fg-3)",
          letterSpacing: ".03em",
        }}
      >
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <CheckIcon color="var(--accent)" /> 7-day Pro trial
        </span>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <CheckIcon color="var(--accent)" /> 200 credits free
        </span>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <CheckIcon color="var(--accent)" /> No credit card
        </span>
      </div>
    </div>
  );
}

// ─── Mission-control composite ────────────────────────────────────────────
function HeroDashboard() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => p + 1), 1800);
    return () => clearInterval(t);
  }, []);

  const sent = 38041 + pulse * 7;
  const replies = 891 + Math.floor(pulse / 2);

  const campaigns = [
    { name: "Black Friday · 30% off", ch: "wa", pct: Math.min(38, 26 + pulse), status: "sending" },
    { name: "Sept newsletter", ch: "em", pct: 100, status: "completed" },
    { name: "Cart recovery automation", ch: "wa", pct: Math.min(72, 64 + pulse), status: "sending" },
  ];

  const activity = [
    { ch: "wa", who: "Ava Carter", what: "replied to Black Friday", when: "2s ago" },
    { ch: "em", who: "maya@northbeam.com", what: "opened Sept newsletter", when: "14s ago" },
    { ch: "wa", who: "Liam Bennett", what: "matched welcome_flow_v3", when: "38s ago" },
    { ch: "sm", who: "+1 415-555…", what: "OTP delivered", when: "1m ago" },
    { ch: "em", who: "kunal@northbeam.com", what: "clicked CTA in newsletter", when: "1m ago" },
  ];

  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "0 30px 60px -30px rgba(0,0,0,.18), 0 2px 0 rgba(255,255,255,.6) inset",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--bg-sunken)",
        }}
      >
        <div style={{ display: "flex", gap: 5 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#ff5f56" }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#ffbd2e" }} />
          <span style={{ width: 9, height: 9, borderRadius: 99, background: "#27c93f" }} />
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>app.speediq.app / dashboard</span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            padding: "3px 9px",
            borderRadius: 99,
            background: "var(--bg-elev)",
            border: "1px solid var(--line)",
            fontFamily: "var(--font-mono)",
            color: "var(--fg-3)",
          }}
        >
          ⎈ Kettlewala
        </span>
        <span
          style={{
            fontSize: 11,
            padding: "3px 9px",
            borderRadius: 99,
            background: "var(--fg)",
            color: "var(--bg)",
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
          }}
        >
          {(11959).toLocaleString()} credits
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "1px solid var(--line)" }}>
        {[
          { k: "Sent today", v: sent.toLocaleString(), d: "+18%", live: true },
          { k: "Delivery rate", v: "94.7%", d: "+0.4%" },
          { k: "Replies", v: replies.toLocaleString(), d: "+12%", live: true },
          { k: "Open rate", v: "32.1%", d: "email" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "14px 16px", borderRight: i < 3 ? "1px solid var(--line)" : "none" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: "var(--fg-3)",
                letterSpacing: ".06em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {s.live && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 99,
                    background: "var(--accent)",
                    animation: "speediq-liveDot 1.4s ease-in-out infinite",
                  }}
                />
              )}
              {s.k}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.025em",
                marginTop: 3,
                lineHeight: 1,
              }}
            >
              {s.v}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", marginTop: 3 }}>{s.d}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr" }}>
        <div style={{ padding: "14px 16px", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-3)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                In flight
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>3 campaigns</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {campaigns.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <ChannelDot ch={c.ch as "wa" | "em" | "sm"} size={16} withRing={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.name}
                    </div>
                    <div style={{ height: 3, background: "rgba(0,0,0,.06)", borderRadius: 99, marginTop: 5 }}>
                      <div
                        style={{
                          width: c.pct + "%",
                          height: "100%",
                          background: c.status === "completed" ? "var(--fg-3)" : "#25D366",
                          borderRadius: 99,
                          transition: "width 1.6s ease",
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", minWidth: 32, textAlign: "right" }}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-3)", letterSpacing: ".08em", textTransform: "uppercase" }}>
                Today by channel
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              {[
                ["WA", "#25D366"],
                ["EM", "#3b82f6"],
                ["SM", "#a855f7"],
              ].map(([l, c]) => (
                <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-3)" }}>
                  <span style={{ width: 6, height: 6, background: c, borderRadius: 2 }} />
                  {l}
                </span>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(24,1fr)", gap: 2, height: 56, alignItems: "end" }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const wa = 14 + Math.abs(Math.sin(i * 0.5 + pulse * 0.1)) * 22;
                const em = 8 + Math.abs(Math.cos(i * 0.4)) * 16;
                const sm = 4 + Math.abs(Math.sin(i * 0.7)) * 8;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1 }}>
                    <div style={{ background: "#25D366", height: wa, borderRadius: "2px 2px 0 0", transition: "height .6s ease" }} />
                    <div style={{ background: "#3b82f6", height: em }} />
                    <div style={{ background: "#a855f7", height: sm, borderRadius: "0 0 2px 2px" }} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-3)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              Live activity
            </span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)" }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 99,
                  background: "var(--accent)",
                  animation: "speediq-liveDot 1.4s ease-in-out infinite",
                }}
              />
              STREAMING
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activity.map((a, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "7px 9px",
                  borderRadius: "var(--radius-sm)",
                  background: i === 0 ? "rgba(37,211,102,.06)" : "transparent",
                  border: i === 0 ? "1px solid rgba(37,211,102,.18)" : "1px solid transparent",
                  animation: i === 0 ? "speediq-fadeSlide .6s ease" : "none",
                }}
              >
                <ChannelDot ch={a.ch as "wa" | "em" | "sm"} size={14} withRing={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 500 }}>{a.who}</span>{" "}
                    <span style={{ color: "var(--fg-3)" }}>{a.what}</span>
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--fg-4)" }}>{a.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


export function Hero() {
  return (
    <section style={{ paddingTop: 56, paddingBottom: "var(--section-y)" }}>
      <Container>
        <div style={{ display: "flex", flexDirection: "column", gap: 64 }}>
          <HeroCopy align="left" />
          <HeroDashboard />
        </div>
      </Container>
    </section>
  );
}
