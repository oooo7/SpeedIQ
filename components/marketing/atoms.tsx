"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import React from "react";

// ─── Logo ──────────────────────────────────────────────────────────────────
export function SpeedIQLogo({ size = 22 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <g stroke="var(--fg)" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M5 10 Q 11 4, 16 10 T 27 10">
            <animate
              attributeName="d"
              values="M5 10 Q 11 4, 16 10 T 27 10;M5 10 Q 11 16, 16 10 T 27 10;M5 10 Q 11 4, 16 10 T 27 10"
              dur="4s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M5 16 Q 11 10, 16 16 T 27 16">
            <animate
              attributeName="d"
              values="M5 16 Q 11 10, 16 16 T 27 16;M5 16 Q 11 22, 16 16 T 27 16;M5 16 Q 11 10, 16 16 T 27 16"
              dur="4s"
              repeatCount="indefinite"
              begin="-1.3s"
            />
          </path>
          <path d="M5 22 Q 11 16, 16 22 T 27 22">
            <animate
              attributeName="d"
              values="M5 22 Q 11 16, 16 22 T 27 22;M5 22 Q 11 28, 16 22 T 27 22;M5 22 Q 11 16, 16 22 T 27 22"
              dur="4s"
              repeatCount="indefinite"
              begin="-2.6s"
            />
          </path>
        </g>
      </svg>
      <span style={{ fontWeight: 600, letterSpacing: "-0.01em", fontSize: 17 }}>
        SpeedIQ
      </span>
    </span>
  );
}

// ─── Buttons ───────────────────────────────────────────────────────────────
interface BtnProps {
  children: ReactNode;
  variant?: "primary" | "accent" | "ghost" | "plain";
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  style?: CSSProperties;
  type?: "button" | "submit";
}

export function Btn({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  icon,
  style,
  type = "button",
}: BtnProps) {
  const sizes: Record<string, CSSProperties> = {
    sm: { padding: "7px 12px", fontSize: 13, height: 32 },
    md: { padding: "11px 18px", fontSize: 14, height: 40 },
    lg: { padding: "14px 22px", fontSize: 15, height: 48 },
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: "var(--fg)", color: "var(--bg)", border: "1px solid var(--fg)" },
    accent: {
      background: "var(--accent)",
      color: "var(--accent-ink)",
      border: "1px solid var(--accent)",
      fontWeight: 600,
    },
    ghost: { background: "transparent", color: "var(--fg)", border: "1px solid var(--line-2)" },
    plain: { background: "transparent", color: "var(--fg)", border: "none" },
  };
  const base: CSSProperties = {
    ...sizes[size],
    ...variants[variant],
    borderRadius: "var(--radius-sm)",
    fontFamily: "inherit",
    fontWeight: 500,
    letterSpacing: "-0.005em",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    transition: "transform .15s ease, opacity .15s ease, background-color .15s ease",
    whiteSpace: "nowrap",
    textDecoration: "none",
    ...style,
  };
  const content = (
    <>
      {children}
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
    </>
  );
  if (href) {
    return (
      <Link href={href} style={base}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} style={base}>
      {content}
    </button>
  );
}

// ─── Eyebrow / mono tag ────────────────────────────────────────────────────
export function Eyebrow({
  children,
  dot = true,
  style,
}: {
  children: ReactNode;
  dot?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--fg-3)",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: "var(--accent)",
            display: "inline-block",
          }}
        />
      )}
      {children}
    </div>
  );
}

// ─── Container ─────────────────────────────────────────────────────────────
export function Container({
  children,
  style,
  narrow = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  narrow?: boolean;
}) {
  return (
    <div
      style={{
        maxWidth: narrow ? 980 : "var(--container)",
        margin: "0 auto",
        padding: "0 32px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Italic emphasis ───────────────────────────────────────────────────────
export function ItalicEmph({ children }: { children: ReactNode }) {
  return (
    <em
      style={{
        fontStyle: "italic",
        fontFamily: "var(--font-display)",
        fontWeight: 400,
      }}
    >
      {children}
    </em>
  );
}

function renderEmphTitle(title: string | ReactNode): ReactNode {
  if (typeof title !== "string") return title;
  const parts = title.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("*") && p.endsWith("*")) {
      return (
        <em
          key={i}
          style={{ fontStyle: "italic", fontWeight: 400 }}
        >
          {p.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// ─── Section header ────────────────────────────────────────────────────────
export function SectionHead({
  eyebrow,
  title,
  lede,
  align = "left",
  style,
}: {
  eyebrow?: string;
  title: string | ReactNode;
  lede?: string;
  align?: "left" | "center";
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: align === "center" ? 760 : 700,
        margin: align === "center" ? "0 auto" : 0,
        ...style,
      }}
    >
      {eyebrow && <Eyebrow style={{ marginBottom: 18 }}>{eyebrow}</Eyebrow>}
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(32px, 4.2vw, 52px)",
          lineHeight: 1.04,
          letterSpacing: "-0.025em",
          margin: "0 0 18px",
          fontWeight: 500,
          textWrap: "balance",
        }}
      >
        {renderEmphTitle(title)}
      </h2>
      {lede && (
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.5,
            color: "var(--fg-3)",
            margin: 0,
            maxWidth: 580,
            textWrap: "pretty",
            ...(align === "center" ? { marginLeft: "auto", marginRight: "auto" } : {}),
          }}
        >
          {lede}
        </p>
      )}
    </div>
  );
}

// ─── Channel icons ─────────────────────────────────────────────────────────
export function WaIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 21l1.65-4.5A8 8 0 1 1 8 19.4L3 21z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M8.5 9c.2 1.5 1 3 2.3 4.3 1.3 1.3 2.8 2.1 4.2 2.3.5.1 1-.2 1.2-.6l.4-.7c.2-.3.1-.7-.2-.9l-1.4-1c-.3-.2-.7-.1-1 .1l-.6.7c-1.1-.5-2-1.3-2.6-2.6l.7-.6c.2-.2.3-.6.1-1l-1-1.4c-.2-.3-.6-.4-.9-.2l-.7.4c-.4.2-.7.7-.6 1.2z"
        fill={color}
      />
    </svg>
  );
}
export function MailIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.6" />
      <path d="M4 7l8 6 8-6" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
export function SmsIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 5h16v11H8l-4 4V5z" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="11" r="1" fill={color} />
      <circle cx="13" cy="11" r="1" fill={color} />
      <circle cx="17" cy="11" r="1" fill={color} />
    </svg>
  );
}
export function PhoneIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2.4z" />
    </svg>
  );
}
export function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function CheckIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8.5l3.5 3.5L13 4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Floating chip + channel dot + avatar (used in hero & panels) ──────────
export function FloatingChip({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: "10px 12px",
        boxShadow:
          "0 10px 30px -10px rgba(17,17,17,.18), 0 1px 0 rgba(255,255,255,.6) inset",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ChannelDot({
  ch,
  size = 14,
  withRing = true,
}: {
  ch: "wa" | "em" | "sm";
  size?: number;
  withRing?: boolean;
}) {
  const map: Record<string, string> = { wa: "#25D366", em: "#3b82f6", sm: "#a855f7" };
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: map[ch],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: withRing ? "0 0 0 2px var(--bg-elev)" : "none",
        flex: "0 0 auto",
      }}
    >
      {ch === "wa" && <WaIcon size={size * 0.65} color="#fff" />}
      {ch === "em" && <MailIcon size={size * 0.65} color="#fff" />}
      {ch === "sm" && <SmsIcon size={size * 0.65} color="#fff" />}
    </span>
  );
}

export function Avatar({ name, size = 28, color }: { name: string; size?: number; color?: string }) {
  const init = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const palette = ["#25D366", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
  const c = color || palette[name.charCodeAt(0) % palette.length];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: c,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        flex: "0 0 auto",
      }}
    >
      {init}
    </span>
  );
}

export function ReadTick({ read = true }: { read?: boolean }) {
  return (
    <svg width="14" height="10" viewBox="0 0 16 10" fill="none" style={{ verticalAlign: "middle" }}>
      <path d="M1 5l3 3 6-7" stroke={read ? "#25D366" : "rgba(255,255,255,.65)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 5l3 3 6-7" stroke={read ? "#25D366" : "rgba(255,255,255,.65)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
