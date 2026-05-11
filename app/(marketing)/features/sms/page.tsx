import type { Metadata } from "next";

import { SmsIcon } from "@/components/marketing/atoms";
import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "SMS marketing with DLT compliance — SpeedIQ",
  description:
    "Twilio-backed SMS for India and international. DLT principal entity support, STOP/HELP handling, two-way inbox, and pause/resume/retry mid-campaign.",
  alternates: { canonical: "/features/sms" },
};

export default function SmsFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="SMS"
      title="SMS that actually reaches the inbox — and complies with the rules"
      subtitle="Connect your Twilio account, register DLT entities, and send to India or anywhere in the world. Two-way inbox, opt-out automation, and rock-solid campaign controls."
      accent="#a855f7"
      grad="linear-gradient(135deg, #4c1d95 0%, #a855f7 55%, #e7d3ff 100%)"
      icon={<SmsIcon size={26} color="#fff" />}
      capabilities={[
        {
          title: "Twilio integration",
          body: "Bring your own Twilio account. Provision numbers, configure messaging services, and send via Twilio's carrier network.",
        },
        {
          title: "DLT compliance (India)",
          body: "Principal entity registration, content template IDs, and approved sender IDs — all surfaced in the UI for India sends.",
        },
        {
          title: "Templates with variables",
          body: "Reusable SMS templates with merge tags. Personalize without copy-paste.",
        },
        {
          title: "Pause / resume / cancel",
          body: "Mid-campaign actions: pause to fix copy, resume where you left off, cancel cleanly, or retry only the failed recipients.",
        },
        {
          title: "Live two-way inbox",
          body: "Customer replies land in the unified inbox. Threading, assignment, archive, and soft-delete. Filter by unread / archived / all.",
        },
        {
          title: "Opt-out automation",
          body: "STOP, START, and HELP keywords processed automatically. Opt-out and consent status tracked per contact.",
        },
        {
          title: "Domestic & international",
          body: "Domestic SMS in India (5 credits), MMS (8 credits), and international SMS (15 credits). Pricing breakdown on every send.",
        },
        {
          title: "Schedule & throttle",
          body: "Schedule by date/time. Built-in throttle (15ms between sends) keeps you under Twilio's API limits even on big blasts.",
        },
        {
          title: "Delivery webhooks",
          body: "Twilio status callbacks stream queued / sent / delivered / failed / undelivered events with carrier error codes back to your campaign.",
        },
      ]}
      highlights={[
        {
          heading: "Built for the realities of Indian SMS",
          body: "DLT regulations mean you can't just send SMS from any number to any phone in India. SpeedIQ surfaces principal entity registration, template IDs, and approved sender IDs — and won't let you fire a non-compliant send.",
          bullets: [
            "Principal entity SID configuration",
            "Content template ID per send",
            "Header (sender ID) management",
            "Pre-flight compliance validation",
            "Domestic 5 credits / international 15 credits",
          ],
        },
        {
          heading: "Run campaigns like an operator, not a hopeful sender",
          body: "Fire 50,000 messages and find a typo in message 200? Pause. Fix. Resume. Failed delivery on a chunk of numbers? Retry only those. SpeedIQ treats SMS campaigns as production systems, not one-shot scripts.",
          bullets: [
            "Pause without losing recipient progress",
            "Resume from exact send position",
            "Cancel cleanly with full audit trail",
            "Retry only failed recipients with one click",
            "Per-recipient status + Twilio error codes",
          ],
        },
        {
          heading: "Inbound replies don't disappear into the void",
          body: "Every customer reply lands in the unified inbox alongside WhatsApp. Team members can assign threads, tag conversations, archive resolved chats, and respond with canned messages — exactly like email.",
          bullets: [
            "Inbox filters: unread / archived / all",
            "Conversation assignment to teammates",
            "Soft-delete and archive flags",
            "Unread counter per conversation",
            "Auto-handle STOP / START / HELP",
          ],
        },
      ]}
      faqs={[
        {
          q: "Do I need my own Twilio account?",
          a: "Yes. SpeedIQ uses your Twilio credentials so you keep full carrier visibility and billing transparency. Setup is a single OAuth-style flow inside Settings → SMS.",
        },
        {
          q: "Is SMS available on the Starter plan?",
          a: "SMS is included on Pro and Business plans. Starter focuses on WhatsApp + Email. You can upgrade to Pro any time to unlock SMS.",
        },
        {
          q: "How does DLT work for non-Indian customers?",
          a: "DLT only applies to sends terminating in India. International sends bypass DLT and follow the destination country's rules; SpeedIQ tracks them as international (15 credits) and uses Twilio's global network.",
        },
        {
          q: "What happens to customers who reply STOP?",
          a: "STOP, UNSUBSCRIBE, CANCEL, END, QUIT, and STOPALL are auto-recognized. The contact's opt_out flag flips to true, consent_status becomes opted_out, and any future campaigns skip them automatically.",
        },
      ]}
    />
  );
}
