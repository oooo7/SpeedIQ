import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "Campaign Analytics & Reporting — SpeedIQ",
  description:
    "Track email open rates, monitor WhatsApp delivery and read metrics, view CTA button clicks, and generate productivity reports.",
  alternates: { canonical: "/features/analytics" },
};

export default function AnalyticsFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="Analytics"
      title="Metrics you can *rely on.*"
      subtitle="Monitor campaign delivery, open, read, and bounce rates in real time. Identify which channels and messages drive conversion."
      accent="#10b981" // Emerald-500
      grad="linear-gradient(135deg, #059669 0%, #10b981 55%, #a7f3d0 100%)"
      icon={<BarChart3 size={26} color="#fff" />}
      capabilities={[
        {
          title: "Real-time Webhook Sync",
          body: "Get immediate delivery, read, and failure updates from Meta and Twilio servers. Watch status updates live.",
        },
        {
          title: "Email Open & Bounce Tracking",
          body: "Inspect which subscribers open newsletters, which emails bounce, and track spam complaints immediately.",
        },
        {
          title: "WhatsApp Button Analysis",
          body: "Measure which quick-reply or Call-to-Action (CTA) buttons get clicked in your templates to evaluate campaign performance.",
        },
        {
          title: "Audit-proof Credit Ledger",
          body: "See exactly where every credit goes. Filter costs by campaign, recipient, or channel for billing audits.",
        },
        {
          title: "Reputation Alerts",
          body: "Monitor your WhatsApp account quality and email sender domain status to avoid deliverability drops.",
        },
        {
          title: "Exportable Reports",
          body: "Download CSV reports of delivery logs, recipient actions, and campaign cost breakdowns for external analysis.",
        },
      ]}
      highlights={[
        {
          heading: "Drill down into button clicks",
          body: "Outcomes matter. If you send a WhatsApp campaign with 'Book Tour' and 'Watch Video' CTAs, SpeedIQ shows you exactly how many times each button was clicked, letting you double-down on what works.",
          bullets: [
            "Contact-level CTA click records",
            "Auto-calculate click-through rates (CTR)",
            "Compare performance across templates",
            "Trace conversion directly to outbound campaigns",
          ],
        },
      ]}
      faqs={[
        {
          q: "How fast do campaign analytics update?",
          a: "Metrics update in real time. Our servers process status webhooks from Meta, Resend, and Twilio within milliseconds of user interaction.",
        },
      ]}
    />
  );
}
