"use client";

import React, { useState, useEffect } from "react";
import { 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  Smartphone, 
  Sparkles 
} from "lucide-react";
import { Btn } from "@/components/marketing/atoms";

export function SandboxDemo() {
  const [channel, setChannel] = useState<"wa" | "em" | "sm">("wa");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [apiLogs, setApiLogs] = useState<string[]>([]);
  const [simulated, setSimulated] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-fill fields for ease of test
  useEffect(() => {
    if (channel === "em") {
      setPhone("");
    } else {
      setEmail("");
    }
  }, [channel]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (channel === "em" && !email) {
      setErrorMsg("Please enter an email address.");
      setSendStatus("error");
      return;
    }
    if (channel !== "em" && !phone) {
      setErrorMsg("Please enter a phone number with country code.");
      setSendStatus("error");
      return;
    }

    setSendStatus("sending");
    setErrorMsg("");
    setApiLogs(["1. Ingesting request into sandbox queue..."]);

    const logSteps = [
      "2. Checking SpeedIQ environment variables...",
      channel === "wa" ? "3. Invoking Meta WhatsApp Business API endpoint..." :
      channel === "sm" ? "3. Invoking Twilio Messaging API service..." :
      "3. Triggering Resend email delivery cluster...",
      "4. Processing message queue confirmation..."
    ];

    // Animate backend logs simulation
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < logSteps.length) {
        setApiLogs(prev => [...prev, logSteps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 450);

    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: channel !== "em" ? phone : undefined,
          email: channel === "em" ? email : undefined,
          type: channel
        })
      });

      const data = await res.json();
      
      // Delay response slightly to let logs animation look organic
      setTimeout(() => {
        if (!res.ok) {
          setSendStatus("error");
          setErrorMsg(data.error || "Failed to trigger sandbox.");
          setApiLogs(prev => [...prev, `❌ Error: ${data.error || "Send failed"}`]);
        } else {
          setSendStatus("success");
          setSimulated(!!data.simulated);
          setApiLogs(prev => [
            ...prev, 
            data.simulated 
              ? "✅ Sandbox completed: Graceful simulated delivery (No live keys set up)." 
              : "🚀 Success: Message dispatched to carrier network!"
          ]);
        }
      }, 1800);

    } catch (err: any) {
      clearInterval(interval);
      setSendStatus("error");
      setErrorMsg(err.message || "Failed to connect to API.");
      setApiLogs(prev => [...prev, "❌ Network error connecting to SpeedIQ endpoint."]);
    }
  };

  return (
    <div
      style={{
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        padding: "36px 30px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
        color: "var(--fg)",
        fontFamily: "var(--font-sans), system-ui, sans-serif"
      }}
    >
      <style>{`
        @keyframes sandbox-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
        .sandbox-log-line {
          animation: speediq-fadeSlide 0.2s ease-out forwards;
        }
      `}</style>

      <div>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={12} /> Live API Playground
        </span>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 500, margin: "6px 0 8px", letterSpacing: "-0.015em" }}>
          Try SpeedIQ Sandbox
        </h3>
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--fg-3)", lineHeight: 1.5 }}>
          Test outbound delivery. Enter your info below to trigger a real message to your device, or see the simulated workflow log feed.
        </p>
      </div>

      {/* Channel Selector Row */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(3, 1fr)", 
          gap: 8, 
          background: "var(--bg-sunken)",
          padding: 4,
          borderRadius: 8,
          border: "1px solid var(--line)"
        }}
      >
        {([
          ["wa", "WhatsApp", <MessageSquare size={13} key="wa" />],
          ["em", "Email", <Mail size={13} key="em" />],
          ["sm", "SMS", <Smartphone size={13} key="sm" />]
        ] as const).map(([id, label, icon]) => {
          const isActive = channel === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (sendStatus === "sending") return;
                setChannel(id);
                setSendStatus("idle");
                setApiLogs([]);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                border: "none",
                borderRadius: 6,
                background: isActive ? "var(--bg-elev)" : "transparent",
                color: isActive ? "var(--fg)" : "var(--fg-3)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: sendStatus === "sending" ? "not-allowed" : "pointer",
                boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* Sandbox Form */}
      {sendStatus === "success" ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ width: 44, height: 44, borderRadius: 99, background: "rgba(37,211,102,.12)", color: "#25D366", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <CheckCircle2 size={22} />
          </div>
          <h4 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 6px" }}>
            {simulated ? "Demo Simulated!" : "Nudge Dispatched!"}
          </h4>
          <p style={{ fontSize: 13, color: "var(--fg-3)", margin: "0 0 20px", lineHeight: 1.45 }}>
            {simulated 
              ? "Your environment variables are unconfigured. The simulated API pipeline completed with success codes in the log logger."
              : `A live ${channel === "wa" ? "WhatsApp" : channel === "sm" ? "SMS" : "Email"} campaign alert has been pushed to your device!`}
          </p>
          <Btn size="md" variant="ghost" onClick={() => setSendStatus("idle")}>
            Try another channel
          </Btn>
        </div>
      ) : (
        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sendStatus === "error" && (
            <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: "#ef4444" }}>
              {errorMsg}
            </div>
          )}

          {channel === "em" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="sandbox-email" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-2)" }}>
                Test Email Address
              </label>
              <input
                type="email"
                id="sandbox-email"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sendStatus === "sending"}
                style={{
                  width: "100%",
                  height: 40,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0 12px",
                  color: "var(--fg)",
                  fontSize: 13.5,
                  outline: "none"
                }}
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="sandbox-phone" style={{ fontSize: 12.5, fontWeight: 500, color: "var(--fg-2)" }}>
                Test Phone Number (E.164 format)
              </label>
              <input
                type="tel"
                id="sandbox-phone"
                placeholder="+15551234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={sendStatus === "sending"}
                style={{
                  width: "100%",
                  height: 40,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line-2)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0 12px",
                  color: "var(--fg)",
                  fontSize: 13.5,
                  outline: "none"
                }}
              />
            </div>
          )}

          <Btn
            type="submit"
            variant="accent"
            size="md"
            disabled={sendStatus === "sending"}
            style={{ width: "100%" }}
            icon={sendStatus === "sending" ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          >
            {sendStatus === "sending" ? "Triggering..." : "⚡ Send Sandbox Nudge"}
          </Btn>
        </form>
      )}

      {/* Dynamic API Logger Feed */}
      {apiLogs.length > 0 && (
        <div 
          style={{ 
            borderTop: "1px solid var(--line)", 
            paddingTop: 18, 
            display: "flex", 
            flexDirection: "column", 
            gap: 8 
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--fg-4)" }}>
            <span>SPEEDIQ CONSOLE LOGS</span>
            <span style={{ animation: sendStatus === "sending" ? "sandbox-pulse 1s infinite" : "none", color: sendStatus === "sending" ? "var(--accent)" : "inherit" }}>
              {sendStatus === "sending" ? "● STREAMING" : "● DISPATCHED"}
            </span>
          </div>
          <div 
            style={{ 
              background: "var(--bg-sunken)", 
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.5,
              color: "var(--fg-2)",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            {apiLogs.map((log, idx) => (
              <div key={idx} className="sandbox-log-line">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
