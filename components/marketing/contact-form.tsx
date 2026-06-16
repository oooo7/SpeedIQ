"use client";

import React, { useState } from "react";
import { Btn, ArrowIcon, Container } from "@/components/marketing/atoms";

export function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setStatus("error");
      setErrorMsg("Please fill out all required fields (Name, Email, and Message).");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("success");
      setFormData({ name: "", email: "", company: "", message: "" });
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to submit. Please try again.");
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 580,
        margin: "0 auto",
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)",
        padding: "40px 32px",
      }}
    >
          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 99,
                  background: "rgba(37,211,102,.13)",
                  color: "var(--accent)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  marginBottom: 16,
                }}
              >
                ✓
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 500,
                  margin: "0 0 10px",
                }}
              >
                Message Sent!
              </h3>
              <p style={{ fontSize: 14.5, color: "var(--fg-3)", margin: "0 0 20px" }}>
                Thank you for reaching out. A SpeedIQ communication specialist will get back to you shortly.
              </p>
              <Btn onClick={() => setStatus("idle")} variant="ghost" size="sm">
                Send another message
              </Btn>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {status === "error" && (
                <div
                  style={{
                    background: "rgba(239,68,68,.1)",
                    border: "1px solid rgba(239,68,68,.2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px 14px",
                    fontSize: 13.5,
                    color: "#ef4444",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="name" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-2)" }}>
                  Full Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={status === "submitting"}
                  placeholder="Jane Doe"
                  style={{
                    width: "100%",
                    height: 40,
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 12px",
                    color: "var(--fg)",
                    fontSize: 14,
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-2)" }}>
                  Business Email <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={status === "submitting"}
                  placeholder="jane@company.com"
                  style={{
                    width: "100%",
                    height: 40,
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 12px",
                    color: "var(--fg)",
                    fontSize: 14,
                    outline: "none",
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="company" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-2)" }}>
                  Company Name
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  disabled={status === "submitting"}
                  placeholder="Acme Corp"
                  style={{
                    width: "100%",
                    height: 40,
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 12px",
                    color: "var(--fg)",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="message" style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-2)" }}>
                  How can we help? <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  disabled={status === "submitting"}
                  placeholder="Tell us about your requirements..."
                  style={{
                    width: "100%",
                    minHeight: 120,
                    background: "var(--bg-sunken)",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    color: "var(--fg)",
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                  }}
                  required
                />
              </div>

              <Btn
                type="submit"
                variant="primary"
                size="lg"
                disabled={status === "submitting"}
                style={{ width: "100%", marginTop: 8 }}
                icon={<ArrowIcon />}
              >
                {status === "submitting" ? "Sending..." : "Submit Inquiry"}
              </Btn>
            </form>
          )}
    </div>
  );
}
