import type { Metadata } from "next";

import { MailIcon } from "@/components/marketing/atoms";
import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "Email marketing from your own domain — SpeedIQ",
  description:
    "Branded broadcasts from your own domain. HTML or drag editor, smart audiences, bounce handling, one-click unsubscribe and full tracking.",
  alternates: { canonical: "/features/email" },
};

export default function EmailFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="Email"
      title="Email that *lands in the inbox.*"
      subtitle="Send from your own domain. Build emails in HTML or drag-and-drop. Track every open, click and bounce."
      accent="#3b82f6"
      grad="linear-gradient(135deg, #1d3a8a 0%, #3b82f6 55%, #c7dcff 100%)"
      icon={<MailIcon size={26} color="#fff" />}
      capabilities={[
        {
          title: "Send from your domain",
          body: "Add your own domain, verify the DNS records, and send from your brand — not a shared subdomain.",
        },
        {
          title: "Shared domain to start",
          body: "Not ready to set up DNS? Send from our shared domain with a custom username while you configure yours.",
        },
        {
          title: "HTML & visual editor",
          body: "Write raw HTML for full control. Or use the drag-and-drop builder for fast email design.",
        },
        {
          title: "Personalize emails",
          body: "Drop names, order numbers or any custom field into the subject line and body.",
        },
        {
          title: "Import subscribers",
          body: "Upload up to 2,000 contacts per CSV with custom field mapping. Track status — subscribed, unsubscribed, bounced.",
        },
        {
          title: "Smart audiences",
          body: "Filter subscribers by tag, custom field or activity. Reuse the same group across campaigns.",
        },
        {
          title: "One-click unsubscribe",
          body: "Secure unsubscribe links in every email. We update the status automatically.",
        },
        {
          title: "Bounce handling",
          body: "Bounced addresses get marked as invalid automatically. Future sends skip them.",
        },
        {
          title: "Test before sending",
          body: "Send a test to one person first. Then launch to the full audience.",
        },
      ]}
      highlights={[
        {
          heading: "Land in the inbox, not the spam folder",
          body: "Sending from your own verified domain massively improves deliverability. We give you the DNS records to copy — no email engineer needed.",
          bullets: [
            "DNS-verified custom domain",
            "Automatic SPF, DKIM and DMARC records",
            "Status: none → pending → verified",
            "Use shared domain while you verify",
            "Reputation managed per project",
          ],
        },
        {
          heading: "Build emails without the pain",
          body: "Designers can drop full HTML. Marketers use the block editor. Both work on the same templates with full variable support.",
          bullets: [
            "Drag-and-drop block editor",
            "Raw HTML mode for full control",
            "Plain-text version auto-generated",
            "See the variable preview live",
            "Reuse templates across campaigns",
          ],
        },
        {
          heading: "Track every delivery, click and bounce",
          body: "Every event streams back into SpeedIQ. See exactly which subscribers opened, clicked, bounced or unsubscribed — per campaign.",
          bullets: [
            "Per-recipient status with timestamps",
            "Hard vs soft bounce classification",
            "Open and click tracking",
            "Bounced addresses auto-removed",
            "Keep data for 30 to 365 days",
          ],
        },
      ]}
      faqs={[
        {
          q: "Who powers the email delivery?",
          a: "We use Resend for the actual sending. Domain setup, signing and webhooks all match Resend's standards.",
        },
        {
          q: "How long does domain verification take?",
          a: "Once you add the DNS records, verification finishes in 5–30 minutes — depending on your DNS provider. We poll automatically and flip the status to Verified.",
        },
        {
          q: "How big can my subscriber list be?",
          a: "Starter supports up to 5,000 contacts, Pro up to 25,000, Business up to 100,000. Need more? Contact us.",
        },
        {
          q: "Is there a daily send limit?",
          a: "Your monthly credits cap your volume. Each email costs 1 credit — a 15,000-credit Pro plan sends 15,000 emails before top-up.",
        },
      ]}
    />
  );
}
