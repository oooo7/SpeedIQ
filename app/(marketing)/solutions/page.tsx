import type { Metadata } from "next";
import Script from "next/script";

import { Container, SectionHead } from "@/components/marketing/atoms";
import { FinalCTA } from "@/components/marketing/landing-sections";
import { SolutionsClient } from "./solutions-client";

export const metadata: Metadata = {
  title: "Industry Solutions — SpeedIQ",
  description:
    "Explore how SpeedIQ's unified WhatsApp, Email and SMS marketing platform empowers E-commerce, Real Estate, Education, Agencies, Healthcare, and SaaS teams.",
  alternates: { canonical: "/solutions" },
  openGraph: {
    title: "Industry Solutions — SpeedIQ",
    description: "Explore how SpeedIQ's unified messaging platform empowers E-commerce, Real Estate, Education, Agencies, Healthcare, and SaaS teams.",
    type: "website",
    url: "/solutions",
    siteName: "SpeedIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Industry Solutions — SpeedIQ",
    description: "Explore how SpeedIQ's unified messaging platform empowers various industries.",
  },
};

export default function SolutionsHubPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "SpeedIQ Solutions Hub",
    "description": "Custom WhatsApp, Email, and SMS communication solutions tailored for various industries.",
    "url": "https://speediq.app/solutions"
  };

  return (
    <>
      <Script
        id="jsonld-solutions"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* HERO SECTION */}
      <section style={{ paddingTop: 96, paddingBottom: 36, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 1200,
            height: 300,
            background: "radial-gradient(50% 50% at 50% 0%, rgba(59,130,246,.08), transparent)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
        <Container style={{ position: "relative", zIndex: 2 }}>
          <SectionHead
            as="h1"
            eyebrow="SOLUTIONS"
            title="Built for *your industry.*"
            lede="Discover how leading teams utilize SpeedIQ to automate customer outreach, coordinate campaigns, and scale conversion rates on their own channels."
            align="center"
          />
        </Container>
      </section>

      {/* FILTER & INTERACTIVE GRID CLIENT COMPONENT */}
      <SolutionsClient />

      <FinalCTA />

      {/* Styled custom CSS properties for HSL glowing hovers */}
      <style>{`
        .solution-card:hover {
          transform: translateY(-6px);
          border-color: var(--line-2) !important;
          box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.25) !important;
        }
        .solution-card:hover .arrow {
          transform: translateX(5px);
        }
        .solution-card:hover .glow-bar {
          opacity: 1 !important;
        }
        
        /* Specific accent shadows on hover */
        .card-ecommerce:hover { border-color: rgba(225, 29, 72, 0.4) !important; box-shadow: 0 20px 40px -20px rgba(225, 29, 72, 0.15) !important; }
        .card-real-estate:hover { border-color: rgba(59, 130, 246, 0.4) !important; box-shadow: 0 20px 40px -20px rgba(59, 130, 246, 0.15) !important; }
        .card-education:hover { border-color: rgba(139, 92, 246, 0.4) !important; box-shadow: 0 20px 40px -20px rgba(139, 92, 246, 0.15) !important; }
        .card-agencies:hover { border-color: rgba(245, 158, 11, 0.4) !important; box-shadow: 0 20px 40px -20px rgba(245, 158, 11, 0.15) !important; }
        .card-healthcare:hover { border-color: rgba(16, 185, 129, 0.4) !important; box-shadow: 0 20px 40px -20px rgba(16, 185, 129, 0.15) !important; }
        .card-saas:hover { border-color: rgba(6, 182, 212, 0.4) !important; box-shadow: 0 20px 40px -20px rgba(6, 182, 212, 0.15) !important; }
      `}</style>
    </>
  );
}
