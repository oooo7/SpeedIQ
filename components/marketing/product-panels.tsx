"use client";

import { useEffect, useState } from "react";

import {
  Avatar,
  Btn,
  ChannelDot,
  CheckIcon,
  ReadTick,
} from "@/components/marketing/atoms";

// ─── 1. Live Inbox panel ────────────────────────────────────────────────────
const INBOX_THREADS = [
  { name: "Ava Carter", ch: "wa", preview: "Please hold size L. Cash on delivery okay?", time: "2m", unread: 2, active: true },
  { name: "Liam Bennett", ch: "wa", preview: "Loved the broadcast — got a link?", time: "14m", unread: 0 },
  { name: "maya@northbeam.com", ch: "em", preview: "Following up on the demo last…", time: "1h", unread: 1 },
  { name: "Noah K.", ch: "sm", preview: "OTP confirmed. Order placed.", time: "3h", unread: 0 },
  { name: "Hudson Studio", ch: "wa", preview: "Can we schedule for tomorrow?", time: "1d", unread: 0 },
] as const;

export function InboxPanel({ compact = false, animated = false }: { compact?: boolean; animated?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!animated) return;
    const id = setInterval(() => setTick((t) => t + 1), 3500);
    return () => clearInterval(id);
  }, [animated]);

  const threads = INBOX_THREADS.map((t, i) => ({
    ...t,
    unread:
      animated && i === tick % INBOX_THREADS.length && !("active" in t && t.active)
        ? Math.max(t.unread, 1)
        : t.unread,
  }));

  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 40px 80px -40px rgba(17,17,17,.22)",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: compact ? "220px 1fr" : "260px 1fr",
        minHeight: compact ? 360 : 540,
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* SIDEBAR */}
      <div style={{ borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--bg-sunken)" }} />
            <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--bg-sunken)" }} />
            <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--bg-sunken)" }} />
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em" }}>SPEEDIQ</div>
        </div>
        <div style={{ padding: "12px 12px 8px", display: "flex", gap: 5, flexWrap: "wrap" }}>
          {[["all", "All"], ["wa", "WA"], ["em", "Email"], ["sm", "SMS"]].map(([k, l]) => (
            <span
              key={k}
              style={{
                fontSize: 11,
                padding: "3px 9px",
                borderRadius: 99,
                background: k === "all" ? "var(--fg)" : "transparent",
                color: k === "all" ? "var(--bg)" : "var(--fg-3)",
                border: "1px solid " + (k === "all" ? "var(--fg)" : "var(--line-2)"),
                fontWeight: 500,
              }}
            >
              {l}
            </span>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "hidden", padding: "4px 6px" }}>
          {threads.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: "10px 10px",
                borderRadius: "var(--radius-sm)",
                background: "active" in t && t.active ? "var(--bg-sunken)" : "transparent",
              }}
            >
              <div style={{ position: "relative" }}>
                <Avatar name={t.name} size={32} />
                <span style={{ position: "absolute", bottom: -2, right: -2 }}>
                  <ChannelDot ch={t.ch as "wa" | "em" | "sm"} size={14} />
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.name}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)", flex: "0 0 auto" }}>{t.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 1 }}>
                  <span style={{ fontSize: 11.5, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.preview}
                  </span>
                  {t.unread > 0 && (
                    <span
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: 99,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {t.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* THREAD */}
      <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-elev)" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name="Ava Carter" size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
              Ava Carter
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: ".02em" }}>
                <ChannelDot ch="wa" size={11} withRing={false} /> +1 415-555-2118
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "#25D366" }} /> online · last seen now
            </div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", padding: "3px 8px", background: "var(--bg-sunken)", borderRadius: 99, color: "var(--fg-3)" }}>
              tag · vip
            </span>
            <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", padding: "3px 8px", background: "var(--bg-sunken)", borderRadius: 99, color: "var(--fg-3)" }}>
              assigned · sarah
            </span>
          </div>
        </div>

        <div style={{ flex: 1, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textAlign: "center", letterSpacing: ".06em" }}>
            TODAY · 2:14 PM
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
            <div style={{ background: "var(--bg-sunken)", borderRadius: 14, borderTopLeftRadius: 4, padding: "9px 13px", fontSize: 13, lineHeight: 1.4, maxWidth: "72%", color: "var(--fg)" }}>
              Hi! Is the silver kurta still in stock?
            </div>
            <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>2:14 PM</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <div style={{ background: "#25D366", color: "#fff", borderRadius: 14, borderTopRightRadius: 4, padding: "9px 13px", fontSize: 13, lineHeight: 1.4, maxWidth: "72%", boxShadow: "0 6px 20px -10px #25D366" }}>
              Yes — sizes M and L available. Want me to hold one for you?
            </div>
            <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", marginRight: 4, display: "flex", alignItems: "center", gap: 4 }}>
              2:15 PM <ReadTick read />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
            <div style={{ background: "var(--bg-sunken)", borderRadius: 14, borderTopLeftRadius: 4, padding: "9px 13px", fontSize: 13, lineHeight: 1.4, maxWidth: "72%" }}>
              Please hold size L. Cash on delivery okay?
            </div>
            <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", marginLeft: 4 }}>2:16 PM</div>
          </div>
          <div style={{ alignSelf: "center", background: "rgba(245,158,11,.10)", border: "1px dashed rgba(245,158,11,.35)", borderRadius: 10, padding: "7px 12px", fontSize: 11, color: "#a16207", fontFamily: "var(--font-mono)", letterSpacing: ".02em", maxWidth: "80%" }}>
            🔒 internal · @sarah – COD allowed for repeat customers, this is order #3
          </div>
        </div>

        <div style={{ padding: "10px 14px 12px", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg-sunken)", borderRadius: "var(--radius-sm)", padding: "8px 10px 8px 14px", border: "1px solid var(--line)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", display: "inline-flex", gap: 4, alignItems: "center" }}>
              <ChannelDot ch="wa" size={11} withRing={false} /> WA
            </span>
            <span style={{ fontSize: 13, color: "var(--fg-3)" }}>Confirming size L — out for delivery tomorrow…</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>⌘↵</span>
            <Btn size="sm" variant="accent" style={{ height: 28, padding: "0 12px" }}>
              Send
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Broadcast panel ────────────────────────────────────────────────────
export function BroadcastPanel() {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 22, fontFamily: "var(--font-sans)", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)", letterSpacing: ".06em", textTransform: "uppercase" }}>WHATSAPP · MARKETING</div>
          <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em", marginTop: 3 }}>Black Friday · 30% off</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>
            Audience: <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>tag:purchased · last_reply &lt; 30d</span>
          </div>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(37,211,102,.13)", color: "#0a3d1d", borderRadius: 99, fontSize: 10.5, fontFamily: "var(--font-mono)", letterSpacing: ".04em", fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "#25D366" }} />
          SENDING · 2,341 / 8,932
        </div>
      </div>

      <div style={{ height: 6, background: "var(--bg-sunken)", borderRadius: 99, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: "100%", width: "26%", background: "#25D366", borderRadius: 99 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {[["Queued", "6,591", null], ["Delivered", "2,128", "+97%"], ["Read", "1,406", "66%"], ["Replied", "184", "8.6%"]].map(([k, v, d], i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 3, display: "flex", alignItems: "baseline", gap: 6 }}>
              {v}
              {d && <span style={{ fontSize: 10.5, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{d}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Live delivery · last 30 min</div>
        <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>updated 4s ago</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(30,1fr)", gap: 3, height: 64, alignItems: "end" }}>
        {Array.from({ length: 30 }).map((_, i) => {
          const h = Math.round(12 + Math.abs(Math.sin(i * 0.62) * 0.5 + Math.cos(i * 0.33) * 0.5) * 50);
          const isLive = i >= 22;
          return (
            <div
              key={i}
              style={{
                height: h,
                borderRadius: 2,
                background: isLive ? "#25D366" : "var(--bg-sunken)",
                opacity: isLive ? (i === 29 ? 1 : 0.75 + (i - 22) * 0.04) : 1,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── 3. Automation panel ────────────────────────────────────────────────────
export function AutomationPanel() {
  const KindBadge = ({ kind }: { kind: "trigger" | "wait" | "send" | "cond" }) => {
    const map = {
      trigger: { label: "TRIGGER", bg: "var(--fg)", color: "var(--bg)" },
      wait: { label: "WAIT", bg: "var(--bg-sunken)", color: "var(--fg-3)" },
      send: { label: "SEND", bg: "rgba(37,211,102,.13)", color: "#0a3d1d" },
      cond: { label: "IF", bg: "rgba(168,85,247,.13)", color: "#7c3aed" },
    };
    const m = map[kind];
    return (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: ".08em", padding: "2px 7px", borderRadius: 4, fontWeight: 600, background: m.bg, color: m.color }}>
        {m.label}
      </span>
    );
  };
  const NodeCard = ({
    kind,
    label,
    sub,
    accent,
  }: {
    kind: "trigger" | "wait" | "send" | "cond";
    label: string;
    sub?: string;
    accent?: boolean;
  }) => (
    <div
      style={{
        background: accent ? "#25D366" : "var(--bg-elev)",
        color: accent ? "#0a3d1d" : "var(--fg)",
        border: "1px solid " + (accent ? "#25D366" : "var(--line-2)"),
        borderRadius: "var(--radius-sm)",
        padding: "10px 14px",
        boxShadow: "0 2px 6px rgba(17,17,17,.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <KindBadge kind={kind} />
        <span style={{ fontSize: 12.5, fontWeight: 500, letterSpacing: "-0.01em" }}>{label}</span>
      </div>
      {sub && (
        <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: accent ? "rgba(10,61,29,.65)" : "var(--fg-3)" }}>{sub}</div>
      )}
    </div>
  );
  const Connector = () => (
    <div style={{ display: "flex", justifyContent: "center", height: 18 }}>
      <div
        style={{
          width: 1.5,
          height: "100%",
          backgroundImage: "repeating-linear-gradient(to bottom, rgba(17,17,17,.32) 0 3px, transparent 3px 6px)",
          backgroundColor: "transparent",
          backgroundSize: "1.5px 6px",
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        position: "relative",
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 22px",
        overflow: "hidden",
        boxShadow: "0 1px 0 rgba(255,255,255,.6) inset",
      }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <defs>
          <pattern id="dotgrid2" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(127,127,127,.3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid2)" />
      </svg>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>welcome_flow_v3</div>
          <div style={{ display: "flex", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
            <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--bg-sunken)" }}>+ Action</span>
            <span style={{ padding: "2px 8px", borderRadius: 99, background: "var(--bg-sunken)" }}>+ Branch</span>
          </div>
        </div>
        <NodeCard kind="trigger" label="New contact added" sub="tag = lead · source = ad" />
        <Connector />
        <NodeCard kind="wait" label="Wait 5 minutes" sub="delay action" />
        <Connector />
        <NodeCard kind="send" label="Send WhatsApp" sub="template: welcome_v3" />
        <Connector />
        <NodeCard kind="cond" label="If replied within 24h?" sub="condition · branch" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#25D366", letterSpacing: ".06em", textAlign: "center" }}>↓ YES</span>
            <NodeCard kind="send" label="Tag as engaged" sub="tag = engaged" accent />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#a855f7", letterSpacing: ".06em", textAlign: "center" }}>↓ NO</span>
            <NodeCard kind="send" label="Send SMS fallback" sub="template: sms_followup" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Campaigns panel ─────────────────────────────────────────────────────
export function CampaignsPanel() {
  const rows = [
    { name: "Black Friday · 30% off", ch: "wa", status: "sending", pct: 26, sent: "2,341 / 8,932", when: "now", type: "marketing" },
    { name: "Order confirmation #4821", ch: "wa", status: "completed", pct: 100, sent: "8,932", when: "2h ago", type: "utility" },
    { name: "Sept newsletter", ch: "em", status: "scheduled", pct: 0, sent: "14,238 queued", when: "Tue 9:00am", type: "campaign" },
    { name: "OTP transactional", ch: "sm", status: "completed", pct: 100, sent: "1,204", when: "today", type: "otp" },
    { name: "Black Friday teaser", ch: "em", status: "draft", pct: 0, sent: "—", when: "—", type: "campaign" },
    { name: "Cart recovery flow", ch: "wa", status: "paused", pct: 64, sent: "4,118 / 6,440", when: "paused 12m", type: "marketing" },
  ];
  const statusStyle: Record<string, { bg: string; color: string; dot: string; live?: boolean }> = {
    sending: { bg: "rgba(37,211,102,.13)", color: "#0a3d1d", dot: "#25D366", live: true },
    completed: { bg: "var(--bg-sunken)", color: "var(--fg-3)", dot: "var(--fg-3)" },
    scheduled: { bg: "rgba(59,130,246,.12)", color: "#1e40af", dot: "#3b82f6" },
    draft: { bg: "var(--bg-sunken)", color: "var(--fg-4)", dot: "var(--fg-4)" },
    paused: { bg: "rgba(245,158,11,.13)", color: "#92400e", dot: "#f59e0b" },
  };
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", fontFamily: "var(--font-sans)", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>Campaigns</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>{rows.length} active</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "var(--bg-sunken)", fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>+ filter</span>
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "var(--accent)", color: "var(--accent-ink)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>+ new campaign</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "24px 1.7fr 1fr 1.2fr 0.8fr", padding: "8px 18px", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em", gap: 8 }}>
        <span></span>
        <span>Campaign</span>
        <span>Status</span>
        <span>Recipients</span>
        <span style={{ textAlign: "right" }}>When</span>
      </div>
      {rows.map((r, i) => {
        const s = statusStyle[r.status];
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "24px 1.7fr 1fr 1.2fr 0.8fr",
              padding: "11px 18px",
              alignItems: "center",
              borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none",
              gap: 8,
            }}
          >
            <ChannelDot ch={r.ch as "wa" | "em" | "sm"} size={18} withRing={false} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>{r.name}</div>
              <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: ".02em" }}>{r.type}</div>
            </div>
            <div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 99, background: s.bg, color: s.color, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: ".04em" }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: s.dot, animation: s.live ? "speediq-liveDot 1.4s ease-in-out infinite" : "none" }} />
                {r.status.toUpperCase()}
              </span>
              {r.pct > 0 && r.pct < 100 && (
                <div style={{ marginTop: 6, height: 3, background: "var(--bg-sunken)", borderRadius: 99 }}>
                  <div style={{ width: r.pct + "%", height: "100%", background: s.dot, borderRadius: 99 }} />
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>{r.sent}</span>
            <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)", textAlign: "right" }}>{r.when}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── 5. Template panel ──────────────────────────────────────────────────────
export function TemplatePanel() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", fontFamily: "var(--font-sans)", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset" }}>
      <div style={{ borderRight: "1px solid var(--line)", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>order_confirmation_v2</div>
            <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)", marginTop: 2, letterSpacing: ".02em" }}>WHATSAPP · UTILITY · EN</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: "rgba(37,211,102,.13)", color: "#0a3d1d", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600 }}>
            <CheckIcon size={9} color="#0a3d1d" /> APPROVED BY META
          </span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["Marketing", "Utility", "Authentication"].map((t, i) => (
            <span key={t} style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 99, background: i === 1 ? "var(--fg)" : "var(--bg-sunken)", color: i === 1 ? "var(--bg)" : "var(--fg-3)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
              {t}
            </span>
          ))}
        </div>
        {[
          { label: "HEADER · TEXT", body: "Order #{{1}} confirmed" },
          { label: "BODY", body: "Hi {{2}}, your order is on the way. Track with this link: {{3}}. Reply STOP to opt out." },
          { label: "FOOTER", body: "SpeedIQ · Sent via WhatsApp Business" },
          { label: "BUTTONS", body: "[ Track order ]  [ Contact us ]", isButtons: true },
        ].map((f) => (
          <div key={f.label}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em", marginBottom: 5 }}>{f.label}</div>
            <div style={{ fontSize: 12.5, padding: "8px 11px", background: "var(--bg-sunken)", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", color: "var(--fg-2)", fontFamily: f.isButtons ? "var(--font-mono)" : "inherit" }}>
              {f.body}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 4, background: "rgba(168,85,247,.12)", color: "#7c3aed", fontFamily: "var(--font-mono)" }}>{"{{1}}"} = order_id</span>
          <span style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 4, background: "rgba(168,85,247,.12)", color: "#7c3aed", fontFamily: "var(--font-mono)" }}>{"{{2}}"} = name</span>
          <span style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 4, background: "rgba(168,85,247,.12)", color: "#7c3aed", fontFamily: "var(--font-mono)" }}>{"{{3}}"} = url</span>
        </div>
      </div>
      <div style={{ padding: "18px 16px", background: "var(--bg-sunken)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em", textAlign: "center" }}>WHATSAPP PREVIEW</div>
        <div style={{ background: "#fff", borderRadius: 10, padding: 12, fontSize: 12.5, lineHeight: 1.4, color: "#111", boxShadow: "0 2px 8px rgba(0,0,0,.06)", maxWidth: 260, marginLeft: "auto" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Order #4821 confirmed</div>
          <div style={{ color: "#333" }}>
            Hi Ava, your order is on the way. Track with this link: <span style={{ color: "#25D366" }}>spdq.co/t/4821</span>. Reply STOP to opt out.
          </div>
          <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 6 }}>SpeedIQ · Sent via WhatsApp Business</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8, paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
            <span style={{ color: "#25D366", fontSize: 12, textAlign: "center", fontWeight: 500 }}>Track order</span>
            <span style={{ color: "#25D366", fontSize: 12, textAlign: "center", fontWeight: 500 }}>Contact us</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Segment panel ───────────────────────────────────────────────────────
export function SegmentPanel() {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "20px 22px", fontFamily: "var(--font-sans)", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>VIP repeat buyers · last 30 days</div>
          <div style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)", letterSpacing: ".02em" }}>segment · saved filter</div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>live audience preview</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {[
          ["tag", "IS", "vip"],
          ["source", "IS", "shopify"],
          ["last_inbound", "<", "30 days ago"],
          ["lifetime_orders", "≥", "3"],
        ].map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {i > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-4)", padding: "1px 6px", borderRadius: 4, background: "var(--bg-sunken)" }}>
                AND
              </span>
            )}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-sunken)", border: "1px solid var(--line)" }}>{row[0]}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 10px", borderRadius: "var(--radius-sm)", color: "var(--fg-3)" }}>{row[1]}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "rgba(37,211,102,.10)", color: "#0a3d1d", border: "1px solid rgba(37,211,102,.25)" }}>
              {row[2]}
            </span>
          </div>
        ))}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", padding: "5px 10px", borderRadius: 99, background: "var(--bg-sunken)", alignSelf: "flex-start" }}>+ add rule</span>
      </div>
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em" }}>MATCHING CONTACTS</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 4 }}>3,418</div>
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)", marginTop: 4 }}>≈ 14% of total list · est. 17,090 credits</div>
        </div>
        <Btn variant="primary" size="sm">
          Use in campaign
        </Btn>
      </div>
    </div>
  );
}

// ─── 7. Analytics panel ─────────────────────────────────────────────────────
export function AnalyticsPanel() {
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "20px 22px", fontFamily: "var(--font-sans)", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>Analytics · last 30 days</div>
        <div style={{ display: "flex", gap: 4 }}>
          {["7d", "30d", "90d"].map((t, i) => (
            <span
              key={t}
              style={{
                fontSize: 10.5,
                padding: "3px 9px",
                borderRadius: 99,
                background: i === 1 ? "var(--fg)" : "transparent",
                color: i === 1 ? "var(--bg)" : "var(--fg-3)",
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
        {[
          ["Messages sent", "142,308", "+18%"],
          ["Delivery rate", "94.7%", "+0.4%"],
          ["Reply rate", "23.1%", "+2.2%"],
          ["Credits used", "38,041", "/ 50,000"],
        ].map(([k, v, d], i) => (
          <div key={i} style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</div>
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.02em", marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: i < 3 ? "var(--accent)" : "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(30,1fr)", gap: 2, height: 100, alignItems: "end", marginBottom: 8 }}>
        {Array.from({ length: 30 }).map((_, i) => {
          const wa = Math.round(22 + Math.abs(Math.sin(i * 0.5)) * 30);
          const em = Math.round(12 + Math.abs(Math.cos(i * 0.4)) * 22);
          const sm = Math.round(6 + Math.abs(Math.sin(i * 0.7)) * 12);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1 }}>
              <div style={{ background: "#25D366", height: wa, borderRadius: "2px 2px 0 0" }} />
              <div style={{ background: "#3b82f6", height: em }} />
              <div style={{ background: "#a855f7", height: sm, borderRadius: "0 0 2px 2px" }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, background: "#25D366", borderRadius: 2 }} /> WhatsApp
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, background: "#3b82f6", borderRadius: 2 }} /> Email
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, background: "#a855f7", borderRadius: 2 }} /> SMS
        </span>
      </div>
    </div>
  );
}

// ─── 8. Team panel ─────────────────────────────────────────────────────────
export function TeamPanel() {
  const members = [
    { name: "Sarah Chen", email: "sarah@kettlewala.co", role: "Owner", status: "active" },
    { name: "Marcus Reed", email: "marcus@kettlewala.co", role: "Admin", status: "active" },
    { name: "Emma Wilson", email: "emma@kettlewala.co", role: "Editor", status: "active" },
    { name: "raj@kettlewala.co", email: "invited 3d ago", role: "Viewer", status: "pending" },
  ];
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", fontFamily: "var(--font-sans)", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 500 }}>Team</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>4 of 10 seats</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "var(--accent)", color: "var(--accent-ink)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>+ invite</span>
      </div>
      {members.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < members.length - 1 ? "1px solid var(--line)" : "none" }}>
          <Avatar name={m.name} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{m.email}</div>
          </div>
          {m.status === "pending" && (
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 99, background: "rgba(245,158,11,.13)", color: "#92400e", fontWeight: 600 }}>
              PENDING
            </span>
          )}
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", padding: "3px 10px", borderRadius: 99, background: "var(--bg-sunken)", color: "var(--fg-2)", minWidth: 60, textAlign: "center" }}>
            {m.role}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 9. Credit ledger panel ────────────────────────────────────────────────
export function CreditLedgerPanel() {
  const rows = [
    { kind: "send · wa marketing", n: -325, ref: "Black Friday broadcast", when: "2m ago" },
    { kind: "send · email", n: -218, ref: "Sept newsletter", when: "1h ago" },
    { kind: "send · wa utility", n: -57, ref: "order_confirmation #4821", when: "2h ago" },
    { kind: "top-up", n: 5000, ref: "pack: Growth 5k", when: "yesterday" },
    { kind: "send · sms domestic", n: -180, ref: "OTP transactional", when: "yesterday" },
    { kind: "monthly grant", n: 15000, ref: "Pro plan renewal", when: "3d ago" },
  ];
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", fontFamily: "var(--font-sans)", boxShadow: "0 1px 0 rgba(255,255,255,.6) inset" }}>
      <div style={{ padding: "20px 22px", borderBottom: "1px solid var(--line)", background: "var(--fg)", color: "var(--bg)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--on-fg-muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>CREDIT BALANCE</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>11,959</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--on-fg-muted)" }}>of 15,000 monthly</span>
        </div>
        <div style={{ height: 4, background: "var(--on-fg-faint-line)", borderRadius: 99, marginTop: 10 }}>
          <div style={{ width: "79%", height: "100%", background: "#25D366", borderRadius: 99 }} />
        </div>
      </div>
      <div style={{ padding: "8px 18px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em", textTransform: "uppercase" }}>Recent activity</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.6fr 0.5fr", padding: "10px 18px", alignItems: "center", borderTop: "1px solid var(--line)", gap: 8 }}>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg-2)" }}>{r.kind}</span>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{r.ref}</span>
          <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: r.n > 0 ? "var(--accent)" : "var(--fg-2)", textAlign: "right" }}>
            {r.n > 0 ? "+" : ""}
            {r.n.toLocaleString()}
          </span>
          <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--fg-4)", textAlign: "right" }}>{r.when}</span>
        </div>
      ))}
    </div>
  );
}

// ─── 10. Contacts panel ─────────────────────────────────────────────────────
export function ContactsPanel() {
  const rows = [
    { name: "Ava Carter", phone: "+1 415-555-2118", tags: ["vip", "purchased"], ch: "wa" },
    { name: "Liam Bennett", phone: "+1 415-555-4770", tags: ["lead", "homepage"], ch: "wa" },
    { name: "maya@northbeam.com", phone: "newsletter list", tags: ["subscribed"], ch: "em" },
    { name: "Noah K.", phone: "+1 415-555-9001", tags: ["otp", "active"], ch: "sm" },
    { name: "Emma Wilson", phone: "+1 415-555-2241", tags: ["vip", "high-value"], ch: "wa" },
  ];
  return (
    <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", fontFamily: "var(--font-sans)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Contacts</div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>14,238 total</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "var(--bg-sunken)", fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>+ filter</span>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: "var(--accent)", color: "var(--accent-ink)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>+ import csv</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 0.5fr", padding: "10px 18px", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        <span>Name</span>
        <span>Reach</span>
        <span>Tags</span>
        <span style={{ textAlign: "right" }}>Ch.</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr 0.5fr", padding: "10px 18px", alignItems: "center", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={r.name} size={24} />
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>{r.name}</span>
          </div>
          <span style={{ fontSize: 11.5, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}>{r.phone}</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {r.tags.map((t) => (
              <span key={t} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 99, background: "var(--bg-sunken)", color: "var(--fg-2)", fontFamily: "var(--font-mono)" }}>
                {t}
              </span>
            ))}
          </div>
          <div style={{ textAlign: "right" }}>
            <ChannelDot ch={r.ch as "wa" | "em" | "sm"} size={16} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────
export type ProductPanelVariant =
  | "inbox"
  | "broadcast"
  | "automation"
  | "campaigns"
  | "template"
  | "segment"
  | "analytics"
  | "team"
  | "credits"
  | "contacts";

export function ProductPanel({ variant }: { variant: ProductPanelVariant }) {
  switch (variant) {
    case "inbox":
      return <InboxPanel compact />;
    case "broadcast":
      return <BroadcastPanel />;
    case "automation":
      return <AutomationPanel />;
    case "campaigns":
      return <CampaignsPanel />;
    case "template":
      return <TemplatePanel />;
    case "segment":
      return <SegmentPanel />;
    case "analytics":
      return <AnalyticsPanel />;
    case "team":
      return <TeamPanel />;
    case "credits":
      return <CreditLedgerPanel />;
    case "contacts":
      return <ContactsPanel />;
    default:
      return null;
  }
}
