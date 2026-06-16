"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Home, 
  GraduationCap, 
  Briefcase, 
  Activity, 
  Cpu, 
  Check, 
  CheckCheck, 
  Send,
  User,
  MoreVertical,
  Phone,
  Video,
  ChevronRight,
  Database,
  ArrowRight,
  TrendingUp,
  MessageSquare
} from "lucide-react";

export interface MockupProps {
  industry: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone Mockup Component (Simulating WhatsApp interface)
// ─────────────────────────────────────────────────────────────────────────────
export function PhoneMockup({ industry }: MockupProps) {
  const [clicked, setClicked] = useState(false);
  const [typedReply, setTypedReply] = useState(false);

  // Reset interactive state when changing industry
  useEffect(() => {
    setClicked(false);
    setTypedReply(false);
  }, [industry]);

  const getIndustryContent = (ind: string) => {
    switch (ind) {
      case "ecommerce":
        return {
          sender: "Kettlewala Store",
          avatarBg: "#be123c",
          avatarText: "K",
          verified: true,
          message: "Hi Sarah! We noticed you left some beautiful items in your cart. Your shopping bag is saved! 🛍️\n\nTap below to finish checkout and get 10% off.\n\nCode: *TREAT10*",
          cta: "🛒 Complete Checkout",
          replyText: "Thanks! Checkout completed, excited! 🎉",
          status: "Order #9421 Confirmed"
        };
      case "real-estate":
        return {
          sender: "Summit Properties",
          avatarBg: "#1d4ed8",
          avatarText: "S",
          verified: true,
          message: "Hey David, a new 3-Bedroom Apartment just listed in Downtown matching your price filter! 🏢\n\nPrice: $640,000\nVirtual tour and images are ready.",
          cta: "📸 View Virtual Tour",
          replyText: "Wow, I want to book a viewing for Saturday!",
          status: "Viewing Scheduled"
        };
      case "education":
        return {
          sender: "SpeedIQ Academy",
          avatarBg: "#6d28d9",
          avatarText: "A",
          verified: true,
          message: "Hello Mrs. Davis, orientation details for Term 2 are now ready. 🏫\n\nPlease confirm your student orientation attendance using the button below.",
          cta: "✅ Confirm Attendance",
          replyText: "Attendance confirmed. We will be there! 👍",
          status: "Orientation Confirmed"
        };
      case "agencies":
        return {
          sender: "Atlas Growth",
          avatarBg: "#d97706",
          avatarText: "G",
          verified: true,
          message: "Hey team, your weekly client broadcast summary is ready:\n\n• Client: Kettlewala\n• Delivery Rate: 99.8%\n• Conversions: +18.4%\n• Credits Used: 4,820",
          cta: "📊 View Performance",
          replyText: "Excellent results. Clients will love this report!",
          status: "Report Exported"
        };
      case "healthcare":
        return {
          sender: "Apex Dental Clinic",
          avatarBg: "#059669",
          avatarText: "H",
          verified: true,
          message: "Hi James, this is a reminder for your dental checkup with Dr. Aris tomorrow at 10:00 AM. 🩺\n\nPlease confirm if you will attend.",
          cta: "📅 Confirm Appointment",
          replyText: "Confirmed! See you tomorrow at 10.",
          status: "Status updated: Confirmed"
        };
      case "saas":
        return {
          sender: "SpeedIQ Support",
          avatarBg: "#0891b2",
          avatarText: "S",
          verified: true,
          message: "Welcome to SpeedIQ! Your 7-day trial starts today. 🚀\n\nTap below to watch our 2-minute quick-start setup video and import your first CSV list.",
          cta: "🎥 Watch Onboarding Video",
          replyText: "Just watched it, extremely helpful. Importing now!",
          status: "Workspace Activated"
        };
      default:
        return {
          sender: "SpeedIQ Support",
          avatarBg: "#111",
          avatarText: "S",
          verified: true,
          message: "Hello! Thank you for choosing SpeedIQ.",
          cta: "Get Started",
          replyText: "Let's go!",
          status: "Connected"
        };
    }
  };

  const data = getIndustryContent(industry);

  const handleCtaClick = () => {
    if (clicked) return;
    setClicked(true);
    setTimeout(() => {
      setTypedReply(true);
    }, 800);
  };

  return (
    <div 
      style={{
        width: "100%",
        maxWidth: 320,
        height: 520,
        background: "var(--bg)",
        border: "12px solid #222",
        borderRadius: 40,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        margin: "0 auto",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
      }}
    >
      {/* Phone Camera Notch */}
      <div 
        style={{
          width: 110,
          height: 18,
          background: "#222",
          borderRadius: "0 0 12px 12px",
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 99,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: 99, background: "#111", marginRight: 6 }} />
        <div style={{ width: 30, height: 3, borderRadius: 99, background: "#111" }} />
      </div>

      {/* WhatsApp App Header */}
      <div 
        style={{
          background: "#075e54",
          color: "#fff",
          padding: "24px 12px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          flexShrink: 0
        }}
      >
        <div 
          style={{
            width: 32,
            height: 32,
            borderRadius: 99,
            background: data.avatarBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)"
          }}
        >
          {data.avatarText}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
            {data.sender}
            {data.verified && (
              <span 
                style={{
                  display: "inline-flex",
                  background: "#128c7e",
                  color: "#fff",
                  borderRadius: 99,
                  padding: 1,
                  fontSize: 7
                }}
              >
                <Check size={8} strokeWidth={3} />
              </span>
            )}
          </div>
          <div style={{ fontSize: 9.5, opacity: 0.8, whiteSpace: "nowrap" }}>Online · Official Account</div>
        </div>
        <div style={{ display: "flex", gap: 10, opacity: 0.8 }}>
          <Video size={14} />
          <Phone size={14} />
          <MoreVertical size={14} />
        </div>
      </div>

      {/* WhatsApp Body (Chat Feed) */}
      <div 
        style={{
          flex: 1,
          background: "#efeae2",
          backgroundImage: "radial-gradient(#dfdcd6 1px, transparent 1px)",
          backgroundSize: "12px 12px",
          padding: "16px 12px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}
      >
        {/* Info Tag */}
        <div 
          style={{
            alignSelf: "center",
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 9.5,
            color: "#555",
            textAlign: "center",
            boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
            maxWidth: "85%"
          }}
        >
          🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read them.
        </div>

        {/* Incoming Template Message */}
        <div 
          style={{
            alignSelf: "flex-start",
            background: "#fff",
            borderRadius: "0 10px 10px 10px",
            padding: "10px 12px 6px",
            maxWidth: "85%",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}
        >
          <div style={{ fontSize: 12, color: "#111", lineHeight: 1.4, whiteSpace: "pre-line" }}>
            {data.message}
          </div>
          
          {/* Interactive Button inside template */}
          <button
            onClick={handleCtaClick}
            disabled={clicked}
            style={{
              background: "#f0f2f5",
              border: "1px solid #e1e4e8",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: clicked ? "#888" : "#075e54",
              cursor: clicked ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              transition: "all 0.2s ease",
              width: "100%"
            }}
          >
            {data.cta}
            {!clicked && <ChevronRight size={12} />}
          </button>

          {/* Time Stamp */}
          <div style={{ alignSelf: "flex-end", fontSize: 8.5, color: "#888", display: "flex", alignItems: "center", gap: 2, marginTop: -2 }}>
            11:42 AM
          </div>
        </div>

        {/* Interactive Response Message */}
        {clicked && (
          <div 
            style={{
              alignSelf: "flex-end",
              background: "#d9fdd3",
              borderRadius: "10px 0 10px 10px",
              padding: "8px 10px 6px",
              maxWidth: "85%",
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              animation: "speediq-fadeSlide 0.25s ease-out forwards",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            <div style={{ fontSize: 12, color: "#111", lineHeight: 1.35 }}>
              {typedReply ? data.replyText : "..."}
            </div>
            {/* Time Stamp + Read Tick */}
            <div style={{ alignSelf: "flex-end", fontSize: 8.5, color: "#555", display: "flex", alignItems: "center", gap: 2 }}>
              11:42 AM 
              {typedReply ? <CheckCheck size={11} color="#34b7f1" /> : <Check size={11} />}
            </div>
          </div>
        )}

        {/* Triggered Status Log */}
        {typedReply && (
          <div 
            style={{
              alignSelf: "center",
              background: "rgba(7, 94, 84, 0.12)",
              color: "#075e54",
              borderRadius: 16,
              padding: "4px 10px",
              fontSize: 9.5,
              fontWeight: 600,
              textAlign: "center",
              animation: "speediq-fadeSlide 0.2s ease-out forwards",
              border: "1px solid rgba(7, 94, 84, 0.15)"
            }}
          >
            ⚡ {data.status}
          </div>
        )}
      </div>

      {/* WhatsApp Input Field */}
      <div 
        style={{
          background: "#f0f2f5",
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0
        }}
      >
        <div 
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 20,
            padding: "6px 12px",
            fontSize: 12.5,
            color: "#888",
            border: "1px solid #e1e4e8"
          }}
        >
          {clicked ? "Type a message..." : `Tap "${data.cta.split(" ").slice(1).join(" ")}" to reply...`}
        </div>
        <div 
          style={{
            width: 32,
            height: 32,
            borderRadius: 99,
            background: "#075e54",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <Send size={13} fill="#fff" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Mockup Component (Simulating SpeedIQ inbox/campaign dashboard)
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardMockup({ industry }: MockupProps) {
  const getIndustryDashboard = (ind: string) => {
    switch (ind) {
      case "ecommerce":
        return {
          title: "E-Commerce Playbook",
          metric: "45.8%",
          metricLabel: "Cart Recovery Rate",
          color: "#e11d48",
          bgColor: "rgba(225, 29, 72, 0.08)",
          subscribers: [
            { name: "Sarah K.", activity: "Checkout abandoned", status: "Triggered Rem.", time: "2m ago" },
            { name: "Alex M.", activity: "Purchased TREAT10", status: "Recovered", time: "15m ago" },
            { name: "Elena R.", activity: "Checkout abandoned", status: "Sent (Read)", time: "1h ago" }
          ],
          integration: "Shopify Connected",
          activityTitle: "Cart Webhooks Ingested"
        };
      case "real-estate":
        return {
          title: "Real Estate Matcher",
          metric: "88.2%",
          metricLabel: "Lead Response Rate",
          color: "#3b82f6",
          bgColor: "rgba(59, 130, 246, 0.08)",
          subscribers: [
            { name: "David L.", activity: "Requested viewing", status: "Assigned (Agent)", time: "5m ago" },
            { name: "Marcus P.", activity: "Listing alert read", status: "Replied", time: "45m ago" },
            { name: "Jane S.", activity: "Site tour confirmed", status: "Scheduled", time: "3h ago" }
          ],
          integration: "Zillow Lead Feed",
          activityTitle: "New Listing Broadcasts"
        };
      case "education":
        return {
          title: "Academy Portal",
          metric: "94.6%",
          metricLabel: "Orientation Confirmations",
          color: "#8b5cf6",
          bgColor: "rgba(139, 92, 246, 0.08)",
          subscribers: [
            { name: "Mrs. Davis", activity: "Orientation click", status: "Confirmed", time: "1m ago" },
            { name: "John T. (Parent)", activity: "Fee reminder read", status: "Replied", time: "2h ago" },
            { name: "Amelie C.", activity: "Doc upload alert sent", status: "Delivered", time: "4h ago" }
          ],
          integration: "SchoolCRM Ingestion",
          activityTitle: "Parent Alerts Broadcasted"
        };
      case "agencies":
        return {
          title: "Agency Command",
          metric: "14 Clients",
          metricLabel: "Active Managed Workspaces",
          color: "#f59e0b",
          bgColor: "rgba(245, 158, 11, 0.08)",
          subscribers: [
            { name: "Kettlewala Store", activity: "Promo blast complete", status: "99.8% Deliv.", time: "10m ago" },
            { name: "Vanguard Tech", activity: "Stripe Billing sync", status: "Synced", time: "1h ago" },
            { name: "Urban Flats", activity: "Credits low warning", status: "Auto-topped", time: "5h ago" }
          ],
          integration: "Stripe Account Sync",
          activityTitle: "Isolated Auditing Logs"
        };
      case "healthcare":
        return {
          title: "Clinic Dashboard",
          metric: "52% drop",
          metricLabel: "No-Show Cancellations",
          color: "#10b981",
          bgColor: "rgba(16, 185, 129, 0.08)",
          subscribers: [
            { name: "James R.", activity: "Rem. click Confirm", status: "Confirmed", time: "1m ago" },
            { name: "Sarah Higgins", activity: "Reschedule request", status: "Inbox Ticket", time: "30m ago" },
            { name: "Dr. Aris Calendar", activity: "Slot freed & reallocated", status: "Completed", time: "2h ago" }
          ],
          integration: "Dentrix Scheduler",
          activityTitle: "Patient Feed Sync"
        };
      case "saas":
        return {
          title: "SaaS Growth Loop",
          metric: "2.4x",
          metricLabel: "Trial-to-Paid Conversion",
          color: "#06b6d4",
          bgColor: "rgba(6, 182, 212, 0.08)",
          subscribers: [
            { name: "Nathan S.", activity: "Onboarding click", status: "Activated", time: "4m ago" },
            { name: "DevCorp Adm.", activity: "Quota alert (80% read)", status: "Sent SMS", time: "12m ago" },
            { name: "Leah K.", activity: "Trial expiring tomorrow", status: "Sent (Mail)", time: "1h ago" }
          ],
          integration: "Clerk Auth Webhook",
          activityTitle: "Milestone-Triggered Runs"
        };
      default:
        return {
          title: "SpeedIQ Workspace",
          metric: "99.9%",
          metricLabel: "Outbound Deliverability",
          color: "#111",
          bgColor: "rgba(0,0,0,0.05)",
          subscribers: [],
          integration: "API Connection Setup",
          activityTitle: "Campaign Stream"
        };
    }
  };

  const db = getIndustryDashboard(industry);

  return (
    <div 
      style={{
        width: "100%",
        height: 520,
        background: "var(--bg-elev)",
        border: "1px solid var(--line-2)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontSize: 13,
        color: "var(--fg)",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
      }}
    >
      {/* Top Header Row */}
      <div 
        style={{
          borderBottom: "1px solid var(--line)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span 
            style={{
              width: 10,
              height: 10,
              borderRadius: 99,
              background: db.color
            }}
          />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{db.title}</span>
        </div>
        <div 
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: db.color,
            background: db.bgColor,
            padding: "4px 10px",
            borderRadius: 99,
            fontWeight: 600,
            letterSpacing: ".04em"
          }}
        >
          {db.integration}
        </div>
      </div>

      {/* Hero Analytics Card */}
      <div style={{ padding: "20px 24px 10px" }}>
        <div 
          style={{
            background: "var(--bg-sunken)",
            borderRadius: "var(--radius-sm)",
            padding: "20px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid var(--line)"
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em", fontFamily: "var(--font-mono)" }}>
              {db.metricLabel}
            </div>
            <div 
              style={{
                fontSize: 32,
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                color: "var(--fg)",
                marginTop: 4,
                display: "flex",
                alignItems: "baseline",
                gap: 6
              }}
            >
              {db.metric}
              <TrendingUp size={16} color={db.color} />
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, background: "rgba(37, 211, 102, 0.15)", color: "#128c7e", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
              <span style={{ width: 5, height: 5, borderRadius: 99, background: "#128c7e" }} />
              API Healthy
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
              Sync interval: Live webhooks
            </div>
          </div>
        </div>
      </div>

      {/* Live Stream Logs */}
      <div style={{ flex: 1, padding: "10px 24px 20px", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--fg-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
            <Database size={12} color={db.color} />
            {db.activityTitle}
          </div>
          <span style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)" }}>Realtime Log Feed</span>
        </div>

        {/* Rows of items */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }} className="custom-scrollbar">
          {db.subscribers.map((sub, idx) => (
            <div 
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--bg-elev)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12.5,
                transition: "all 0.2s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div 
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 99,
                    background: "var(--bg-sunken)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--fg-3)"
                  }}
                >
                  <User size={12} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--fg)" }}>{sub.name}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 1 }}>{sub.activity}</div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span 
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10.5,
                    fontWeight: 600,
                    background: sub.status.includes("Confirmed") || sub.status.includes("Recovered") || sub.status.includes("Synced")
                      ? "rgba(37, 211, 102, 0.1)" 
                      : sub.status.includes("Triggered") || sub.status.includes("Warning")
                      ? `${db.color}15`
                      : "rgba(0, 0, 0, 0.04)",
                    color: sub.status.includes("Confirmed") || sub.status.includes("Recovered") || sub.status.includes("Synced")
                      ? "#128c7e" 
                      : sub.status.includes("Triggered") || sub.status.includes("Warning")
                      ? db.color
                      : "var(--fg-2)"
                  }}
                >
                  {sub.status}
                </span>
                <div style={{ fontSize: 9.5, color: "var(--fg-4)", marginTop: 3 }}>{sub.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fully Combined Interactive Simulator Workspace Widget
// ─────────────────────────────────────────────────────────────────────────────
export function SolutionsSimulator() {
  const [activeTab, setActiveTab] = useState("ecommerce");
  
  const tabs = [
    { id: "ecommerce", label: "E-Commerce", color: "#e11d48", icon: <ShoppingBag size={14} /> },
    { id: "real-estate", label: "Real Estate", color: "#3b82f6", icon: <Home size={14} /> },
    { id: "education", label: "Education", color: "#8b5cf6", icon: <GraduationCap size={14} /> },
    { id: "saas", label: "SaaS Growth", color: "#06b6d4", icon: <Cpu size={14} /> },
    { id: "healthcare", label: "Healthcare", color: "#10b981", icon: <Activity size={14} /> },
    { id: "agencies", label: "Agencies & Org", color: "#f59e0b", icon: <Briefcase size={14} /> }
  ];

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Selector Tabs Row */}
      <div 
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 10,
          background: "var(--bg-sunken)",
          padding: 6,
          borderRadius: 99,
          border: "1px solid var(--line)",
          maxWidth: 720,
          margin: "0 auto"
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 18px",
                borderRadius: 99,
                border: "none",
                background: isActive ? "var(--bg-elev)" : "transparent",
                color: isActive ? "var(--fg)" : "var(--fg-3)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: isActive ? "0 4px 12px -2px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.6) inset" : "none",
                borderBottom: isActive ? `2px solid ${tab.color}` : "none",
                transition: "all 0.2s ease"
              }}
            >
              <span style={{ color: isActive ? tab.color : "inherit" }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Simulator Layout Panels */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.35fr",
          gap: 32,
          alignItems: "center",
          background: "var(--bg-sunken)",
          borderRadius: "var(--radius-lg)",
          padding: "36px clamp(16px, 4vw, 48px)",
          border: "1px solid var(--line)"
        }}
      >
        {/* Left Side: Phone Simulator */}
        <div>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              STEP 1: Try it yourself (Click button on screen)
            </span>
          </div>
          <PhoneMockup industry={activeTab} />
        </div>

        {/* Right Side: Dashboard Simulator */}
        <div>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-4)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              STEP 2: Observe SpeedIQ live reaction feed
            </span>
          </div>
          <DashboardMockup industry={activeTab} />
        </div>
      </div>
    </div>
  );
}
