"use client";

import React, { useState, useMemo } from "react";
import { ArrowRight, Calculator, Check, Info, TrendingUp } from "lucide-react";
import { Btn } from "@/components/marketing/atoms";

export function ROICalculator() {
  const [contacts, setContacts] = useState(15000);
  const [orderValue, setOrderValue] = useState(75);
  const [abandonmentRate, setAbandonmentRate] = useState(70);

  // Recovery Rate Assumptions
  const emailRate = 0.08; // 8% recovery
  const whatsappRate = 0.38; // 38% recovery

  // Calculated values
  const results = useMemo(() => {
    const abandonedLeads = contacts * (abandonmentRate / 100);
    const emailRecovered = Math.round(abandonedLeads * emailRate);
    const whatsappRecovered = Math.round(abandonedLeads * whatsappRate);

    const emailRevenue = emailRecovered * orderValue;
    const whatsappRevenue = whatsappRecovered * orderValue;
    const netGained = whatsappRevenue - emailRevenue;

    // Recommend Plan based on contact size
    let recommendedPlan = "Starter";
    let planCost = 29;
    if (contacts > 2000 && contacts <= 15000) {
      recommendedPlan = "Pro";
      planCost = 79;
    } else if (contacts > 15000) {
      recommendedPlan = "Business";
      planCost = 199;
    }

    return {
      abandonedLeads: Math.round(abandonedLeads),
      emailRecovered,
      whatsappRecovered,
      emailRevenue,
      whatsappRevenue,
      netGained,
      recommendedPlan,
      planCost,
    };
  }, [contacts, orderValue, abandonmentRate]);

  // Height percentages for comparison charts
  const maxHeight = Math.max(results.whatsappRevenue, 1);
  const emailHeightPct = Math.round((results.emailRevenue / maxHeight) * 100);
  const whatsappHeightPct = Math.round((results.whatsappRevenue / maxHeight) * 100);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 32,
        alignItems: "stretch",
        width: "100%",
        maxWidth: 1080,
        margin: "0 auto",
        color: "var(--fg)",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
      }}
    >
      <style>{`
        .roi-slider-input {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          width: 100%;
          height: 28px;
          margin: 0;
          padding: 0;
          cursor: grab;
          position: absolute;
          z-index: 2;
          opacity: 0;
        }
        .roi-slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 28px;
          height: 28px;
          background: transparent;
          border: 0;
        }
        .roi-slider-input::-moz-range-thumb {
          width: 28px;
          height: 28px;
          background: transparent;
          border: 0;
        }
      `}</style>

      {/* Sliders Input Panel */}
      <div
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* List Size Slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Monthly Contacts / List Size</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>
              {contacts.toLocaleString()}
            </span>
          </div>
          <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
            <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 99, background: "var(--bg-sunken)", border: "1px solid var(--line)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(contacts / 100000) * 100}%`, background: "var(--fg)" }} />
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={1000}
              value={contacts}
              onChange={(e) => setContacts(Number(e.target.value))}
              className="roi-slider-input"
            />
            <div
              style={{
                position: "absolute",
                left: `calc(${(contacts / 100000) * 100}% - 11px)`,
                width: 22,
                height: 22,
                borderRadius: 99,
                background: "#fff",
                border: "2px solid var(--fg)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 99, background: "var(--fg)" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
            <span>1,000</span>
            <span>50k</span>
            <span>100,000</span>
          </div>
        </div>

        {/* Average Order Value Slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Average Order Value (AOV)</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>
              ${orderValue}
            </span>
          </div>
          <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
            <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 99, background: "var(--bg-sunken)", border: "1px solid var(--line)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(orderValue / 500) * 100}%`, background: "var(--accent)" }} />
            </div>
            <input
              type="range"
              min={10}
              max={500}
              step={5}
              value={orderValue}
              onChange={(e) => setOrderValue(Number(e.target.value))}
              className="roi-slider-input"
            />
            <div
              style={{
                position: "absolute",
                left: `calc(${(orderValue / 500) * 100}% - 11px)`,
                width: 22,
                height: 22,
                borderRadius: 99,
                background: "#fff",
                border: "2px solid var(--accent)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 99, background: "var(--accent)" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
            <span>$10</span>
            <span>$250</span>
            <span>$500</span>
          </div>
        </div>

        {/* Abandonment Rate Slider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Unaddressed / Abandoned Carts</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, color: "var(--fg)" }}>
              {abandonmentRate}%
            </span>
          </div>
          <div style={{ position: "relative", height: 28, display: "flex", alignItems: "center" }}>
            <div style={{ position: "absolute", left: 0, right: 0, height: 6, borderRadius: 99, background: "var(--bg-sunken)", border: "1px solid var(--line)", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${((abandonmentRate - 10) / 80) * 100}%`, background: "#e11d48" }} />
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={abandonmentRate}
              onChange={(e) => setAbandonmentRate(Number(e.target.value))}
              className="roi-slider-input"
            />
            <div
              style={{
                position: "absolute",
                left: `calc(${((abandonmentRate - 10) / 80) * 100}% - 11px)`,
                width: 22,
                height: 22,
                borderRadius: 99,
                background: "#fff",
                border: "2px solid #e11d48",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 99, background: "#e11d48" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>
            <span>10%</span>
            <span>50%</span>
            <span>90%</span>
          </div>
        </div>

        {/* Assumption Info Box */}
        <div
          style={{
            background: "var(--bg-sunken)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 14px",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 12,
            color: "var(--fg-3)",
            lineHeight: 1.45,
          }}
        >
          <Info size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--fg-4)" }} />
          <span>
            We model an industry-average <strong>8% recovery rate</strong> for Email and a conservative <strong>38% recovery rate</strong> for WhatsApp templates.
          </span>
        </div>
      </div>

      {/* ROI Display and Comparison Graph */}
      <div
        style={{
          background: "var(--fg)",
          color: "var(--bg)",
          borderRadius: "var(--radius-lg)",
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          justifyContent: "space-between",
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)",
        }}
      >
        <div>
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--on-fg-muted)", textTransform: "uppercase", letterSpacing: ".08em" }}>
            NET EXTRA REVENUE / MONTH
          </span>
          <div
            style={{
              fontSize: "clamp(36px, 4vw, 56px)",
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              letterSpacing: "-0.04em",
              color: "var(--bg)",
              marginTop: 6,
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              lineHeight: 1,
            }}
          >
            ${results.netGained.toLocaleString()}
            <span style={{ fontSize: 16, fontFamily: "var(--font-sans)", color: "var(--accent)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <TrendingUp size={16} />
              +{Math.round(((results.whatsappRevenue - results.emailRevenue) / (results.emailRevenue || 1)) * 100)}%
            </span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 13.5, color: "var(--on-fg-mid)", lineHeight: 1.45 }}>
            By engaging cart abandoners instantly on WhatsApp instead of waiting for standard emails to be opened.
          </p>
        </div>

        {/* Dynamic Comparison Chart */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-around",
            height: 140,
            borderBottom: "1px solid var(--on-fg-line)",
            paddingBottom: 10,
            position: "relative",
          }}
        >
          {/* Email Column */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "40%", gap: 8 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--on-fg-mid)" }}>
              ${results.emailRevenue.toLocaleString()}
            </div>
            <div
              style={{
                width: "100%",
                height: `${Math.max(emailHeightPct, 6)}%`,
                background: "var(--on-fg-muted)",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.25s ease-out",
              }}
            />
            <div style={{ fontSize: 11, fontWeight: 500, color: "var(--on-fg-muted)" }}>Email Recovery</div>
          </div>

          {/* WhatsApp Column */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "40%", gap: 8 }}>
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>
              ${results.whatsappRevenue.toLocaleString()}
            </div>
            <div
              style={{
                width: "100%",
                height: `${Math.max(whatsappHeightPct, 6)}%`,
                background: "var(--accent)",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.25s ease-out",
                boxShadow: "0 0 20px rgba(37, 211, 102, 0.4)",
              }}
            />
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)" }}>SpeedIQ WhatsApp</div>
          </div>
        </div>

        {/* Recommended plan section */}
        <div
          style={{
            borderTop: "1px solid var(--on-fg-line)",
            paddingTop: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 9.5, fontFamily: "var(--font-mono)", color: "var(--on-fg-muted)", textTransform: "uppercase" }}>
              RECOMMENDED TIER
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{results.recommendedPlan} Plan</span>
              <span style={{ fontSize: 12, color: "var(--on-fg-muted)" }}>(${results.planCost}/mo)</span>
            </div>
          </div>

          <Btn href="/pricing" variant="accent" size="md" icon={<ArrowRight size={14} />}>
            Upgrade Tier
          </Btn>
        </div>
      </div>
    </div>
  );
}
