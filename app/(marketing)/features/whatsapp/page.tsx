import type { Metadata } from "next";

import { WaIcon } from "@/components/marketing/atoms";
import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "WhatsApp marketing & live chat — SpeedIQ",
  description:
    "Connect your WhatsApp Business account through Meta's official flow. Send approved templates, run broadcasts and chat live from one inbox.",
  alternates: { canonical: "/features/whatsapp" },
};

export default function WhatsAppFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="WhatsApp"
      title="WhatsApp that *just works.*"
      subtitle="Connect your WhatsApp Business account in one click. Send templates, run broadcasts, chat live — all from one place."
      accent="#25D366"
      grad="linear-gradient(135deg, #0d9d4f 0%, #25D366 55%, #b6f1c2 100%)"
      icon={<WaIcon size={26} color="#fff" />}
      capabilities={[
        {
          title: "Connect in one click",
          body: "Set up your WhatsApp Business account through Meta's official flow. No paperwork. No waiting weeks.",
        },
        {
          title: "Template builder",
          body: "Build templates with text, photos, videos and buttons. Send to Meta and we sync the approval status back for you.",
        },
        {
          title: "Marketing & utility",
          body: "Run promotional broadcasts. Send order confirmations and OTPs. Fully compliant with Meta's rules.",
        },
        {
          title: "Live chat inbox",
          body: "Reply to customers in real time. Send text and media. Use quick replies and saved messages.",
        },
        {
          title: "Smart audiences",
          body: "Filter contacts by tag, custom field or activity. See exactly how many people you'll reach before sending.",
        },
        {
          title: "Working hours",
          body: "Set your business hours and timezone. Outbound messages wait until you're back online.",
        },
        {
          title: "Quality alerts",
          body: "Track your account's WhatsApp quality rating. Get warned before you hit a limit.",
        },
        {
          title: "20+ languages",
          body: "Build the same template in English, Hindi, Spanish, French and more. We pick the right language per contact.",
        },
        {
          title: "Personalize at scale",
          body: "Drop first names, order numbers or any custom field into your messages — automatically.",
        },
      ]}
      highlights={[
        {
          heading: "Connect through Meta's official flow",
          body: "We use Meta's Embedded Signup — the same OAuth-based flow approved BSPs use. Click connect, choose your account and phone number, and start sending. No PDF forms or copy-pasted access tokens.",
          bullets: [
            "Official Meta setup — no token copying",
            "Webhooks set up automatically",
            "All your numbers found for you",
            "Tokens refreshed in the background",
          ],
        },
        {
          heading: "Broadcasts that actually deliver",
          body: "WhatsApp is strict about templates and quality. We keep you compliant — pre-flight checks before submit, real-time status from Meta, and alerts before you hit a limit.",
          bullets: [
            "Submit templates to Meta in one click",
            "Sync existing templates from your account",
            "See audience size before sending",
            "Pause, resume and retry mid-campaign",
            "Track sent, delivered, read and failed",
          ],
        },
        {
          heading: "Live chat that never loses threads",
          body: "When customers reply, every message lands in one inbox. Assign chats, send saved replies and media, mark as read — without touching WhatsApp Web.",
          bullets: [
            "Full chat history per customer",
            "Send photos, videos and files",
            "Quick replies sorted by category",
            "Saved message library with attachments",
            "Hold sends outside business hours",
            "Assign chats to teammates",
          ],
        },
      ]}
      faqs={[
        {
          q: "Do I need an existing WhatsApp Business account?",
          a: "No. We help you create one inside Meta's flow. Already have one? Just connect it.",
        },
        {
          q: "Whose number is used to send?",
          a: "Yours. You bring or create the account and phone number. We never use shared numbers, so your branding and quality rating stay yours.",
        },
        {
          q: "How do I get marketing templates approved?",
          a: "Build templates in SpeedIQ with full preview. Submit to Meta in one click. Most get approved in minutes. We sync the status back automatically.",
        },
        {
          q: "What about the 24-hour rule?",
          a: "After a customer replies, you have 24 hours for free-form chat (2 credits). After that, use an approved template (3 credits for utility, 5 for marketing). We enforce this automatically.",
        },
      ]}
    />
  );
}
