import type { Metadata } from "next";

import { WaIcon } from "@/components/marketing/atoms";
import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "WhatsApp marketing & live chat — SpeedIQ",
  description:
    "Connect your WhatsApp Business Account in 5 minutes. Send approved templates, run broadcasts, and chat live from one unified inbox.",
  alternates: { canonical: "/features/whatsapp" },
};

export default function WhatsAppFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="WhatsApp"
      title="WhatsApp marketing, the way Meta intended"
      subtitle="One-click Embedded Signup with Meta. Templates, broadcasts, live chat, and analytics — all from your own WhatsApp Business Account."
      accent="#25D366"
      grad="linear-gradient(135deg, #0d9d4f 0%, #25D366 55%, #b6f1c2 100%)"
      icon={<WaIcon size={26} color="#fff" />}
      capabilities={[
        {
          title: "Embedded Signup",
          body: "Connect your WABA and phone number via Meta's official OAuth flow — no manual API setup, no waiting weeks.",
        },
        {
          title: "Template builder",
          body: "Build templates with body, header (text or media), footer, and call-to-action buttons. Submit to Meta and sync status back automatically.",
        },
        {
          title: "Marketing & utility templates",
          body: "Send broadcasts using Marketing, Utility, and Authentication template categories — fully compliant with Meta's rules.",
        },
        {
          title: "Live chat inbox",
          body: "Reply to inbound messages in real time. Send text and media replies. Mark threads read. Use quick replies and canned messages.",
        },
        {
          title: "Segments & filters",
          body: "Build audiences from tags, custom fields, source, and engagement signals. Preview audience size before launch.",
        },
        {
          title: "Working hours",
          body: "Set business hours and timezone. Outbound messages queue automatically outside working hours.",
        },
        {
          title: "Quality monitoring",
          body: "Track your account's quality rating (Green / Yellow / Red), tier limits, and template approval rate.",
        },
        {
          title: "Multi-language templates",
          body: "Build the same template in English, Hindi, Spanish, French and more. Auto-select language per contact.",
        },
        {
          title: "Variable interpolation",
          body: "Pull first name, order number, or any custom field into template variables at send time.",
        },
      ]}
      highlights={[
        {
          heading: "Connect in 5 minutes, not 5 weeks",
          body: "We use Meta's official Embedded Signup — the same flow giant BSPs use. Click connect, choose your WABA and phone number, and you're sending messages. No PDF forms, no manual reviews.",
          bullets: [
            "Official Meta OAuth — no copy-pasting tokens",
            "Auto-provision webhook subscriptions",
            "Auto-discover all phone numbers on your WABA",
            "Refresh tokens handled automatically",
          ],
        },
        {
          heading: "Send broadcasts that actually deliver",
          body: "WhatsApp is strict about templates and quality. SpeedIQ keeps you compliant: pre-flight checks before submit, real-time status sync from Meta, and quality rating alerts before you get throttled.",
          bullets: [
            "Templates submit to Meta in one click",
            "Sync existing templates from any connected WABA",
            "Live audience size preview before send",
            "Pause / resume / retry mid-campaign",
            "Per-recipient status: sent / delivered / read / failed",
          ],
        },
        {
          heading: "Live chat that doesn't lose threads",
          body: "When customers reply, SpeedIQ pulls every message into a real inbox. Assign threads, drop in canned messages, send media, and mark read — all without touching WhatsApp Web.",
          bullets: [
            "Unified thread view with full history",
            "Send media (images, docs, audio) from the inbox",
            "Quick replies categorized by intent",
            "Canned message library with attachments",
            "Working-hours queue for outbound replies",
            "Assignment to teammates with role-based access",
          ],
        },
      ]}
      faqs={[
        {
          q: "Do I need an existing WhatsApp Business Account?",
          a: "No. Embedded Signup walks you through creating a new WABA inside Meta's flow — or you can connect an existing one.",
        },
        {
          q: "Whose number is used to send?",
          a: "Your own. You bring (or create) the WABA and phone number; SpeedIQ never relies on shared numbers, so your branding and quality rating are yours.",
        },
        {
          q: "How do I get marketing templates approved?",
          a: "Build templates inside SpeedIQ with full preview, then submit to Meta in one click. Most marketing and utility templates are approved within minutes. We sync the status back automatically.",
        },
        {
          q: "What about WhatsApp's 24-hour rule?",
          a: "Session messages (within 24h of a customer reply) cost 2 credits. After 24h, you must use an approved template (3 credits for utility, 5 for marketing). SpeedIQ enforces this automatically so you don't get throttled.",
        },
      ]}
    />
  );
}
