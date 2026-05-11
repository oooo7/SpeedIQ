import type { Metadata } from "next";

import { Hero } from "@/components/marketing/hero";
import {
  Channels,
  CreditCalc,
  FAQ,
  Features,
  FinalCTA,
  HowItWorks,
  LiveDemo,
  LogoBar,
  Pricing,
  Testimonials,
  UseCasesGrid,
} from "@/components/marketing/landing-sections";
import { detectCurrency } from "@/lib/marketing/currency";

export const metadata: Metadata = {
  title: "SpeedIQ — One inbox for WhatsApp, Email & SMS",
  description:
    "Campaigns, conversations and everything between. SpeedIQ unifies broadcasts, templates, segments, live inbox and analytics across WhatsApp, Email, SMS and Calls.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SpeedIQ — One inbox for WhatsApp, Email & SMS",
    description:
      "Campaigns, conversations and everything between — built INR-first for Indian SMBs from ₹999/mo.",
    type: "website",
    url: "/",
    siteName: "SpeedIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpeedIQ — One inbox for WhatsApp, Email & SMS",
    description:
      "Campaigns, conversations and everything between — built INR-first for Indian SMBs from ₹999/mo.",
  },
};

export default async function LandingPage() {
  const currencyContext = await detectCurrency();
  const defaultCurrency: "INR" | "USD" = currencyContext.currency === "inr" ? "INR" : "USD";

  return (
    <>
      <Hero />
      <LogoBar />
      <Channels />
      <Features />
      <HowItWorks />
      <LiveDemo />
      <Pricing defaultCurrency={defaultCurrency} />
      <CreditCalc />
      <Testimonials />
      <UseCasesGrid />
      <FAQ />
      <FinalCTA />
    </>
  );
}
