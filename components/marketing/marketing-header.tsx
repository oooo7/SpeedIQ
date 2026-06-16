"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import {
  ArrowIcon,
  Btn,
  Container,
  SpeedIQLogo,
} from "@/components/marketing/atoms";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";

const NAV_LINKS = [
  { label: "Product", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Why us", href: "/compare" },
  { label: "Solutions", href: "/solutions" },
];

export function MarketingHeader() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onS = () => setScrolled(window.scrollY > 12);
    onS();
    window.addEventListener("scroll", onS, { passive: true });
    return () => window.removeEventListener("scroll", onS);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: scrolled ? "color-mix(in srgb, var(--bg) 82%, transparent)" : "transparent",
        backdropFilter: scrolled ? "blur(12px) saturate(140%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px) saturate(140%)" : "none",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        transition: "all .2s ease",
      }}
    >
      <Container style={{ display: "flex", alignItems: "center", height: 64, gap: 32 }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <SpeedIQLogo />
        </Link>
        <nav style={{ display: "none", gap: 22, marginLeft: 8 }} className="speediq-nav-desktop">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} style={{ fontSize: 13.5, color: "var(--fg-2)", fontWeight: 450 }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <ThemeToggle />
        <div className="speediq-cta-desktop" style={{ display: "none", alignItems: "center", gap: 12 }}>
          {user ? (
            <Btn href="/dashboard" variant="primary" size="sm" icon={<ArrowIcon />}>
              Open dashboard
            </Btn>
          ) : (
            <>
              <Link href="/auth/login" style={{ fontSize: 13.5, color: "var(--fg-2)" }}>
                Sign in
              </Link>
              <Btn href="/auth/sign-up" variant="primary" size="sm" icon={<ArrowIcon />}>
                Start free
              </Btn>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          className="speediq-burger"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            background: "var(--bg-elev)",
            border: "1px solid var(--line-2)",
            color: "var(--fg)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
          }}
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </Container>

      {open && (
        <div
          style={{
            borderTop: "1px solid var(--line)",
            background: "var(--bg)",
            padding: "16px 32px 20px",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ fontSize: 15, color: "var(--fg)", padding: "8px 0" }}
              >
                {l.label}
              </Link>
            ))}
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
              {user ? (
                <Btn href="/dashboard" variant="primary" size="md" style={{ width: "100%" }}>
                  Open dashboard
                </Btn>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    style={{
                      height: 40,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--line-2)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 14,
                      color: "var(--fg)",
                    }}
                  >
                    Sign in
                  </Link>
                  <Btn href="/auth/sign-up" variant="primary" size="md" style={{ width: "100%" }}>
                    Start free trial
                  </Btn>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .speediq-nav-desktop { display: flex !important; }
          .speediq-cta-desktop { display: inline-flex !important; }
          .speediq-burger { display: none !important; }
        }
      `}</style>
    </header>
  );
}
