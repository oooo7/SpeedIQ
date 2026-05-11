import type { Metadata } from "next";

import { MailIcon } from "@/components/marketing/atoms";
import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "Email marketing with custom domain — SpeedIQ",
  description:
    "Branded broadcasts from your own domain. HTML or drag editor, segments, bounce handling, one-click unsubscribe, and full delivery analytics.",
  alternates: { canonical: "/features/email" },
};

export default function EmailFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="Email"
      title="Email broadcasts that look like you sent them"
      subtitle="Custom domain via DNS verification, a real HTML editor, smart segments, and delivery tracking that picks up every bounce and click."
      accent="#3b82f6"
      grad="linear-gradient(135deg, #1d3a8a 0%, #3b82f6 55%, #c7dcff 100%)"
      icon={<MailIcon size={26} color="#fff" />}
      capabilities={[
        {
          title: "Custom sending domain",
          body: "Add your own domain, verify SPF / DKIM / DMARC via DNS records, and start sending from your brand — not a shared subdomain.",
        },
        {
          title: "Shared domain fallback",
          body: "Not ready to set up DNS? Send from our shared domain with a custom local part while you configure your own.",
        },
        {
          title: "HTML & visual editor",
          body: "Drop into raw HTML for full control, or use the drag-and-code builder for fast template creation.",
        },
        {
          title: "Variable interpolation",
          body: "Personalize subject lines and bodies with merge tags pulled from subscriber custom fields.",
        },
        {
          title: "Subscriber import",
          body: "Bulk import up to 2,000 subscribers per CSV with custom field mapping. Status tracking for subscribed / unsubscribed / bounced / invalid.",
        },
        {
          title: "Segments",
          body: "Filter subscribers by tags, custom fields, and engagement. Reuse segments across campaigns.",
        },
        {
          title: "One-click unsubscribe",
          body: "Token-verified unsubscribe links in every email. Auto-update subscriber status. RFC 8058 compliant.",
        },
        {
          title: "Bounce handling",
          body: "Resend webhook integration auto-marks hard bounces as invalid and removes them from future sends.",
        },
        {
          title: "Send to one or many",
          body: "Test send to a single recipient before launching the full campaign. Send-to specific list mid-campaign.",
        },
      ]}
      highlights={[
        {
          heading: "Land in the inbox, not the spam folder",
          body: "Branded sending from your own verified domain massively improves deliverability. We handle SPF, DKIM, DMARC setup with copy-paste DNS records — no email-engineer needed.",
          bullets: [
            "DNS-verified custom domain via Resend",
            "Automatic SPF / DKIM / DMARC record generation",
            "Status: none → pending → verified",
            "Fallback to shared domain while you verify",
            "Reputation managed per project, not pooled",
          ],
        },
        {
          heading: "Build emails without the pain",
          body: "Designers can drop full HTML. Marketers can use the block editor. Both work on the same templates with full variable support.",
          bullets: [
            "Drag-and-drop block editor",
            "Raw HTML mode for full control",
            "Plain-text fallback auto-generated",
            "Variable preview before send",
            "Reusable templates per project",
          ],
        },
        {
          heading: "Track every delivery, opt-out, and bounce",
          body: "Resend webhooks stream every event back into SpeedIQ. You see exactly which subscribers opened, clicked, bounced, or unsubscribed — per campaign.",
          bullets: [
            "Per-recipient status with timestamps",
            "Hard / soft bounce classification",
            "Open and click tracking",
            "Auto-suppress bounced addresses",
            "30 / 90 / 365-day retention by plan",
          ],
        },
      ]}
      faqs={[
        {
          q: "What email provider powers this?",
          a: "We use Resend under the hood for the actual SMTP delivery, with full Resend dashboard parity. Domain verification, DKIM, and webhook signatures all match Resend's standards.",
        },
        {
          q: "How long does domain verification take?",
          a: "Once you add the DNS records, verification usually completes in 5–30 minutes depending on your DNS provider's TTL. We poll automatically — you'll see the status flip to Verified.",
        },
        {
          q: "How big can my subscriber list be?",
          a: "Starter supports up to 5,000 contacts, Pro 25,000, Business 100,000. For larger lists, contact us for enterprise pricing.",
        },
        {
          q: "Is there a daily send limit?",
          a: "Your monthly credit allowance determines volume. Emails cost 1 credit each — a 15,000-credit Pro plan covers 15,000 emails / month before top-up.",
        },
      ]}
    />
  );
}
