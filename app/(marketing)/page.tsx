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
  Pricing,
  UseCasesGrid,
  WhyChooseUs,
} from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "SpeedIQ — One inbox for WhatsApp, Email & SMS",
  description:
    "Campaigns, conversations and everything between. SpeedIQ brings WhatsApp, Email and SMS into one workspace with one bill.",
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

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Channels />
      <Features />
      <HowItWorks />
      <LiveDemo />
      <Pricing />
      <CreditCalc />
      <WhyChooseUs />
      <UseCasesGrid />
      <FAQ />
      <FinalCTA />
    </>
  );
}
