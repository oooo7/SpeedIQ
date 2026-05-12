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
  UseCasesGrid,
  WhyChooseUs,
} from "@/components/marketing/landing-sections";
import { detectCurrency } from "@/lib/marketing/currency";

export const metadata: Metadata = {
  title: "SpeedIQ — One inbox for WhatsApp, Email & SMS",
  description:
    "Campaigns, conversations and everything between. SpeedIQ brings WhatsApp, Email, SMS and Calls into one workspace with one bill.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SpeedIQ — One inbox for WhatsApp, Email & SMS",
    description:
      "Campaigns, conversations and everything between. One workspace. One bill. WhatsApp, Email and SMS.",
    type: "website",
    url: "/",
    siteName: "SpeedIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpeedIQ — One inbox for WhatsApp, Email & SMS",
    description:
      "Campaigns, conversations and everything between. One workspace. One bill.",
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
      <WhyChooseUs />
      <UseCasesGrid />
      <FAQ />
      <FinalCTA />
    </>
  );
}
