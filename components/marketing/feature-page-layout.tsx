"use client";

import React, { type ReactNode, useState } from "react";
import {
  ArrowIcon,
  Btn,
  CheckIcon,
  Container,
  Eyebrow,
} from "@/components/marketing/atoms";
import { PhoneMockup, DashboardMockup } from "./solutions-mockups";
import { 
  Plus, 
  Minus,
  MessageSquare,
  Mail,
  Zap,
  BarChart3,
  Users,
  Settings,
  ChevronRight,
  UserCheck
} from "lucide-react";

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
  slug?: string; // Optional slug to help identify solutions vs. features
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Interactive Previews for Feature Pages
// ─────────────────────────────────────────────────────────────────────────────

// Email Mockup
function EmailPreview() {
  return (
    <div style={{ width: "100%", maxWidth: 360, margin: "0 auto", background: "var(--bg-elev)", borderRadius: 14, border: "1px solid var(--line-2)", boxShadow: "0 20px 40px -15px rgba(0,0,0,0.25)", overflow: "hidden", fontFamily: "var(--font-sans), system-ui" }}>
      {/* Browser Bar */}
      <div style={{ background: "var(--bg-sunken)", padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: "#ef4444" }} />
        <div style={{ width: 8, height: 8, borderRadius: 99, background: "#f59e0b" }} />
        <div style={{ width: 8, height: 8, borderRadius: 99, background: "#10b981" }} />
        <div style={{ flex: 1, background: "var(--bg-elev)", borderRadius: 4, height: 16, margin: "0 12px", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-4)", border: "1px solid var(--line)" }}>
          campaigns.speediq.app/newsletter
        </div>
      </div>
      {/* Email Body */}
      <div style={{ padding: 18, color: "#111", background: "#f9fafb" }}>
        <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 10, marginBottom: 12, fontSize: 11, color: "#6b7280" }}>
          <div><strong>From:</strong> newsletter@kettlewala.com</div>
          <div style={{ marginTop: 2 }}><strong>Subject:</strong> September Roast Launch ☕</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, textAlign: "center" }}>
          <span style={{ fontSize: 24 }}>☕</span>
          <h4 style={{ margin: "10px 0 6px", fontSize: 15, fontWeight: 600 }}>The Autumn Roast is Here</h4>
          <p style={{ margin: 0, fontSize: 12, color: "#4b5563", lineHeight: 1.4 }}>Slow roasted in micro-batches with notes of dark chocolate, maple, and pecan.</p>
          <button style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 11, fontWeight: 600, marginTop: 14, cursor: "pointer" }}>
            Get 15% Off First Bag
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: "#6b7280", fontFamily: "var(--font-mono)", marginTop: 12, justifyContent: "center" }}>
          <span>open: 32.1%</span>
          <span>click: 8.4%</span>
          <span>bounces: 0.1%</span>
        </div>
      </div>
    </div>
  );
}

// Automation Flow Mockup
function AutomationPreview() {
  return (
    <div style={{ width: "100%", maxWidth: 360, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, fontFamily: "var(--font-sans), system-ui", color: "var(--fg)" }}>
      {/* Node 1 */}
      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(169, 85, 247, 0.15)", color: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={12} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Trigger</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Contact Tag Added: &quot;New Lead&quot;</div>
        </div>
      </div>
      {/* Down arrow */}
      <div style={{ alignSelf: "center", width: 2, height: 16, background: "var(--line-2)" }} />
      {/* Node 2 */}
      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(37, 211, 102, 0.15)", color: "#25D366", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageSquare size={12} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Action</div>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Send WhatsApp: &quot;Welcome Nudge&quot;</div>
        </div>
      </div>
      {/* Down arrow */}
      <div style={{ alignSelf: "center", width: 2, height: 16, background: "var(--line-2)" }} />
      {/* Branch Node */}
      <div style={{ background: "var(--bg-elev)", border: "1px solid var(--line-2)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", position: "relative" }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>If customer replies within 2 days?</div>
        {/* Branch Lines */}
        <div style={{ position: "absolute", bottom: -16, left: "25%", right: "25%", height: 16, borderLeft: "2px solid var(--line-2)", borderRight: "2px solid var(--line-2)", borderTop: "none" }} />
      </div>
      {/* Yes/No Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 4 }}>
        <div style={{ background: "rgba(37, 211, 102, 0.05)", border: "1px dashed rgba(37, 211, 102, 0.3)", borderRadius: 8, padding: 8, textAlign: "center", fontSize: 11 }}>
          <div style={{ color: "#128c7e", fontWeight: 600, fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>Yes</div>
          <div style={{ color: "var(--fg-2)", marginTop: 2 }}>Assign to Team Inbox</div>
        </div>
        <div style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px dashed rgba(59, 130, 246, 0.3)", borderRadius: 8, padding: 8, textAlign: "center", fontSize: 11 }}>
          <div style={{ color: "#1d4ed8", fontWeight: 600, fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>No</div>
          <div style={{ color: "var(--fg-2)", marginTop: 2 }}>Send Follow-up Email</div>
        </div>
      </div>
    </div>
  );
}

// Contacts Segments Mockup
function ContactsPreview() {
  return (
    <div style={{ width: "100%", maxWidth: 360, margin: "0 auto", background: "var(--bg-elev)", borderRadius: 14, border: "1px solid var(--line-2)", padding: 18, boxShadow: "0 20px 40px -15px rgba(0,0,0,0.25)", fontFamily: "var(--font-sans), system-ui", color: "var(--fg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Segment Builder</span>
        <span style={{ fontSize: 10, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Active Segment</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Tag Rule */}
        <div style={{ background: "var(--bg-sunken)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Contacts tagged with <strong>&quot;Lead&quot;</strong></span>
          <span style={{ color: "#10b981", fontSize: 10, fontWeight: 600 }}>AND</span>
        </div>
        {/* Activity Rule */}
        <div style={{ background: "var(--bg-sunken)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Last active <strong>&lt; 14 days ago</strong></span>
          <span style={{ color: "#10b981", fontSize: 10, fontWeight: 600 }}>AND</span>
        </div>
        {/* Country Rule */}
        <div style={{ background: "var(--bg-sunken)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Country is <strong>United States</strong></span>
          <span style={{ color: "var(--fg-4)", fontSize: 10 }}>END</span>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9.5, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>AUDIENCE SIZE</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>4,812 Contacts</div>
        </div>
        <button style={{ background: "var(--fg)", color: "var(--bg)", border: "none", borderRadius: 6, padding: "8px 12px", fontSize: 11, fontWeight: 600, display: "inline-flex", gap: 4, alignItems: "center" }}>
          Create Campaign <ChevronRight size={10} />
        </button>
      </div>
    </div>
  );
}

// FAQ Accordion Card Item
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div 
      style={{ 
        borderBottom: "1px solid var(--line)",
        transition: "background-color 0.2s ease"
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "20px 8px",
          background: "transparent",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          fontSize: 16,
          fontWeight: 500,
          color: "var(--fg)",
          fontFamily: "inherit"
        }}
      >
        {q}
        <span 
          style={{ 
            width: 28, 
            height: 28, 
            borderRadius: 99, 
            background: "var(--bg-sunken)", 
            display: "inline-flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: "var(--fg-3)",
            transition: "transform 0.2s ease"
          }}
        >
          {open ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? 500 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
          padding: open ? "0 8px 20px" : "0 8px"
        }}
      >
        <p style={{ margin: 0, paddingRight: 48, fontSize: 14.5, lineHeight: 1.6, color: "var(--fg-3)" }}>
          {a}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FEATURE PAGE LAYOUT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
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
  slug,
}: FeaturePageLayoutProps) {
  
  // Decide which visual component to render in the split hero based on eyebrow or slug
  const renderHeroMockup = () => {
    const s = slug || eyebrow.toLowerCase();
    
    // Check if it's one of the industry solutions slugs
    if (["ecommerce", "real-estate", "education", "agencies", "healthcare", "saas"].includes(s)) {
      return (
        <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Glowing background layer */}
          <div 
            style={{ 
              position: "absolute", 
              width: 320, 
              height: 320, 
              borderRadius: 99, 
              background: accent, 
              opacity: 0.12, 
              filter: "blur(50px)",
              pointerEvents: "none"
            }} 
          />
          {/* Overlapping Mockups stack */}
          <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
            <div style={{ transform: "scale(0.95) translateX(-20px)", zIndex: 2 }}>
              <PhoneMockup industry={s} />
            </div>
            <div 
              style={{ 
                position: "absolute", 
                left: "48%", 
                top: "15%", 
                width: "60%", 
                transform: "scale(0.95)",
                zIndex: 1,
                pointerEvents: "none",
                display: "none" // Stacks nicely on wider split layouts
              }}
              className="hero-dashboard-layer"
            >
              <DashboardMockup industry={s} />
            </div>
          </div>
        </div>
      );
    }

    // Check feature pages mapping
    switch (s) {
      case "whatsapp":
        return <PhoneMockup industry="saas" />;
      case "sms":
        return <PhoneMockup industry="healthcare" />;
      case "email":
        return <EmailPreview />;
      case "automation":
        return <AutomationPreview />;
      case "contacts":
        return <ContactsPreview />;
      case "inbox":
        return <DashboardMockup industry="healthcare" />; // Shows inbox records
      case "analytics":
        return <DashboardMockup industry="saas" />; // Shows metric dashboard
      default:
        return <DashboardMockup industry="saas" />;
    }
  };

  return (
    <>
      <style>{`
        @media (min-width: 1024px) {
          .split-hero-grid {
            display: grid !important;
            grid-template-columns: 1fr 1.05fr !important;
            gap: 64px !important;
            text-align: left !important;
            align-items: center !important;
          }
          .split-hero-content {
            align-items: flex-start !important;
            text-align: left !important;
          }
          .hero-dashboard-layer {
            display: block !important;
          }
        }
        
        .cap-card {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .cap-card:hover {
          transform: translateY(-4px);
          border-color: var(--line-2) !important;
          box-shadow: 0 12px 28px -10px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.05);
        }
      `}</style>

      {/* HERO */}
      <section style={{ paddingTop: 88, paddingBottom: 64, overflow: "hidden", position: "relative" }}>
        {/* Glow behind */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 1200, height: 260, background: `radial-gradient(50% 50% at 50% 0%, ${accent}08, transparent)`, pointerEvents: "none", zIndex: 1 }} />
        
        <Container style={{ position: "relative", zIndex: 2 }}>
          <div className="split-hero-grid" style={{ display: "flex", flexDirection: "column", gap: 32, textAlign: "center" }}>
            
            {/* Copy Content Column */}
            <div
              className="split-hero-content"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 22,
                maxWidth: 600,
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
                  fontSize: "clamp(34px, 4vw, 56px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.035em",
                  fontWeight: 500,
                  margin: 0,
                  textWrap: "balance",
                }}
              >
                {title}
              </h1>
              <p
                style={{
                  fontSize: 17.5,
                  lineHeight: 1.55,
                  color: "var(--fg-3)",
                  margin: 0,
                  maxWidth: 520,
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

            {/* Split Visual Column */}
            <div 
              style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}
            >
              {renderHeroMockup()}
            </div>

          </div>
        </Container>
      </section>

      {/* CAPABILITIES GRID */}
      <section style={{ paddingTop: 80, paddingBottom: 80, background: "var(--bg-sunken)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <Container>
          <Eyebrow style={{ marginBottom: 18 }}>WHAT YOU CAN DO</Eyebrow>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.4vw, 40px)",
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              fontWeight: 500,
              margin: "0 0 48px",
              maxWidth: 700,
              textWrap: "balance",
            }}
          >
            Every surface, mapped out.
          </h2>
          
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {capabilities.map((c) => (
              <div
                key={c.title}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 160,
                  boxShadow: "0 4px 12px -8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.05)"
                }}
                className="cap-card"
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
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16.5, fontWeight: 500, letterSpacing: "-0.015em", margin: 0 }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-3)", margin: 0 }}>{c.body}</p>
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
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 64,
                alignItems: "center",
                direction: i % 2 === 1 ? "rtl" : "ltr",
              }}
            >
              {/* Text Column */}
              <div style={{ direction: "ltr" as const }}>
                <Eyebrow style={{ marginBottom: 16 }}>{`0${i + 1} · WHY IT MATTERS`}</Eyebrow>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(26px, 3.2vw, 36px)",
                    lineHeight: 1.08,
                    letterSpacing: "-0.025em",
                    fontWeight: 500,
                    margin: "0 0 16px",
                    textWrap: "balance",
                  }}
                >
                  {h.heading}
                </h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--fg-3)", margin: "0 0 24px", maxWidth: 460 }}>{h.body}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
                  {h.bullets.map((b) => (
                    <li key={b} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ marginTop: 5, flex: "0 0 auto" }}>
                        <CheckIcon color={accent} />
                      </span>
                      <span style={{ fontSize: 14, color: "var(--fg-2)" }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Graphic Column */}
              <div style={{ direction: "ltr" as const }}>
                <div
                  style={{
                    background: grad,
                    borderRadius: "calc(var(--radius-lg) + 8px)",
                    padding: "clamp(32px, 4.5vw, 56px) clamp(24px, 3.5vw, 48px)",
                    minHeight: 320,
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 30px 60px -30px rgba(0,0,0,.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
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
                      width: "100%",
                      maxWidth: 380,
                    }}
                  >
                    {h.bullets.slice(0, 3).map((b, j) => (
                      <div
                        key={j}
                        style={{
                          background: "rgba(255,255,255,.94)",
                          backdropFilter: "blur(8px)",
                          borderRadius: "var(--radius)",
                          padding: "14px 18px",
                          color: "#111",
                          fontSize: 13,
                          fontWeight: 500,
                          boxShadow: "0 8px 24px -12px rgba(0,0,0,.15)",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          animation: `speediq-fadeSlide 0.3s ease-out forwards`,
                          animationDelay: `${j * 0.1}s`
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
        <section style={{ paddingTop: "var(--section-y)", paddingBottom: "var(--section-y)", background: "var(--bg-sunken)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
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
            <div style={{ borderTop: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
              {faqs.map((f) => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
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
            <p style={{ margin: 0, fontSize: 15.5, color: "var(--fg-3)", maxWidth: 560 }}>
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
