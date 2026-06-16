"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  Home, 
  GraduationCap, 
  Briefcase, 
  Activity, 
  Cpu, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Layers,
  PhoneCall,
  Settings
} from "lucide-react";

import { Container, SectionHead, Eyebrow } from "@/components/marketing/atoms";
import { INDUSTRIES } from "./solutions-data";
import { SolutionsSimulator } from "@/components/marketing/solutions-mockups";

// Extended metadata for client cards
const INDUSTRY_DETAILS: Record<string, {
  category: "commerce" | "services" | "operations";
  metric: string;
  bullets: string[];
}> = {
  ecommerce: {
    category: "commerce",
    metric: "+45.8% Cart Recovery",
    bullets: [
      "Shopify abandoned cart webhooks",
      "Order status & shipping updates",
      "Promo broadcasts with codes"
    ]
  },
  "real-estate": {
    category: "commerce",
    metric: "2.5x Lead Response",
    bullets: [
      "Zillow/CRM lead ingestion",
      "Listing alerts via SMS/WhatsApp",
      "Tour scheduling calendar confirmations"
    ]
  },
  education: {
    category: "operations",
    metric: "94.6% Attendance Rate",
    bullets: [
      "Admissions reminders & updates",
      "Parent notification broadcasts",
      "Emergency weather closure alerts"
    ]
  },
  agencies: {
    category: "services",
    metric: "Client Multi-Workspaces",
    bullets: [
      "Isolated workspace credentials",
      "Stripe billing & credit top-ups",
      "Team viewer role permissions"
    ]
  },
  healthcare: {
    category: "operations",
    metric: "-52% No-Show Cancellations",
    bullets: [
      "Appointment confirms & schedules",
      "Intake forms & PDF maps via WhatsApp",
      "Waitlist slot auto-reallocation"
    ]
  },
  saas: {
    category: "services",
    metric: "2.4x Trial Conversions",
    bullets: [
      "Onboarding nurture drip flows",
      "API usage milestone notifications",
      "Billing renewal alerts & retry nudges"
    ]
  }
};

function getSolutionIcon(slug: string, size = 20, color = "#fff") {
  switch (slug) {
    case "ecommerce":
      return <ShoppingBag size={size} color={color} />;
    case "real-estate":
      return <Home size={size} color={color} />;
    case "education":
      return <GraduationCap size={size} color={color} />;
    case "agencies":
      return <Briefcase size={size} color={color} />;
    case "healthcare":
      return <Activity size={size} color={color} />;
    case "saas":
      return <Cpu size={size} color={color} />;
    default:
      return <Cpu size={size} color={color} />;
  }
}

export function SolutionsClient() {
  const [filter, setFilter] = useState<"all" | "commerce" | "services" | "operations">("all");

  const filterTabs = [
    { id: "all", label: "All Industries" },
    { id: "commerce", label: "Commerce & B2C" },
    { id: "services", label: "B2B & Services" },
    { id: "operations", label: "Operations & Alerts" }
  ];

  const industriesList = Object.values(INDUSTRIES).map(ind => {
    const details = INDUSTRY_DETAILS[ind.slug] || { category: "commerce", metric: "Active Campaigns", bullets: [] };
    return {
      ...ind,
      ...details
    };
  });

  const filteredIndustries = industriesList.filter(ind => {
    if (filter === "all") return true;
    return ind.category === filter;
  });

  return (
    <>
      {/* FILTER TABS */}
      <section style={{ paddingBottom: 24 }}>
        <Container>
          <div 
            style={{ 
              display: "flex", 
              justifyContent: "center", 
              gap: 8, 
              flexWrap: "wrap",
              marginBottom: 16
            }}
          >
            {filterTabs.map((tab) => {
              const isSelected = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 99,
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    background: isSelected ? "var(--fg)" : "transparent",
                    color: isSelected ? "var(--bg)" : "var(--fg-3)",
                    border: "1px solid " + (isSelected ? "var(--fg)" : "var(--line-2)"),
                    transition: "all .15s ease",
                  }}
                >
                  {tab.id === "all" && <Layers size={13} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} />}
                  {tab.id === "commerce" && <ShoppingBag size={13} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} />}
                  {tab.id === "services" && <Briefcase size={13} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} />}
                  {tab.id === "operations" && <Activity size={13} style={{ marginRight: 6, display: "inline", verticalAlign: "middle" }} />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      {/* SOLUTIONS GRID */}
      <section style={{ paddingBottom: 80, position: "relative", zIndex: 2 }}>
        <Container>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 28,
              marginTop: 16,
            }}
          >
            {filteredIndustries.map((ind) => (
              <Link
                key={ind.slug}
                href={`/solutions/${ind.slug}`}
                style={{
                  textDecoration: "none",
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "36px 30px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease",
                  cursor: "pointer",
                  position: "relative",
                  boxShadow: "0 4px 20px -10px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
                  animation: "speediq-fadeSlide 0.3s ease-out forwards"
                }}
                className={`solution-card card-${ind.slug}`}
              >
                {/* Header Row with Icon and Category Tag */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: ind.grad,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 8px 24px -6px ${ind.accent}66`,
                      flexShrink: 0,
                    }}
                  >
                    {getSolutionIcon(ind.slug)}
                  </div>

                  {/* Impact Metric Badge */}
                  <div 
                    style={{
                      background: `${ind.accent}15`,
                      color: ind.accent,
                      border: `1px solid ${ind.accent}30`,
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <TrendingUp size={12} />
                    {ind.metric}
                  </div>
                </div>
                
                {/* Titles and copy */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Eyebrow dot={false} style={{ color: ind.accent, fontSize: 10, fontWeight: 600, letterSpacing: ".08em" }}>
                    {ind.eyebrow}
                  </Eyebrow>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      margin: 0,
                      color: "var(--fg)",
                      lineHeight: 1.25,
                    }}
                  >
                    {ind.title.replace(/\*/g, "")}
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "var(--fg-3)" }}>
                    {ind.subtitle}
                  </p>
                </div>

                {/* Bullet playbooks feed (like official site) */}
                <div 
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10
                  }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--fg-4)", fontFamily: "var(--font-mono)", letterSpacing: ".05em", textTransform: "uppercase" }}>
                    Key Playbooks
                  </span>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {ind.bullets.map((bullet, idx) => (
                      <li key={idx} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "var(--fg-2)" }}>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: ind.accent, flexShrink: 0 }} />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Footer link */}
                <div 
                  style={{ 
                    marginTop: "auto", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 6, 
                    fontSize: 13, 
                    fontWeight: 500, 
                    color: "var(--fg-2)",
                    paddingTop: 12,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  Explore {ind.eyebrow} workflow 
                  <ArrowRight size={13} style={{ transition: "transform 0.2s ease", marginLeft: 2 }} className="arrow" />
                </div>

                {/* Hover glow line */}
                <div 
                  style={{
                    position: "absolute",
                    bottom: -1,
                    left: 24,
                    right: 24,
                    height: 2,
                    background: ind.grad,
                    borderRadius: 99,
                    opacity: 0,
                    transition: "opacity 0.25s ease",
                  }}
                  className="glow-bar"
                />
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* INTERACTIVE PLAYBOOK SIMULATOR WORKSPACE */}
      <section 
        style={{ 
          paddingTop: 80, 
          paddingBottom: 100, 
          background: "var(--bg-sunken)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)"
        }}
      >
        <Container>
          <SectionHead
            eyebrow="PLAYBOOK SIMULATOR"
            title="Try our *pre-built* workflows."
            lede="Select an industry to experience how SpeedIQ sends campaigns and alerts from a customer's WhatsApp inbox to your team's live activity dashboard."
            align="center"
            style={{ marginBottom: 48 }}
          />

          <SolutionsSimulator />
        </Container>
      </section>
    </>
  );
}
