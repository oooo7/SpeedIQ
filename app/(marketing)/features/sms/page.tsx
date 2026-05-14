import type { Metadata } from "next";

import { SmsIcon } from "@/components/marketing/atoms";
import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "SMS marketing with 10DLC compliance — SpeedIQ",
  description:
    "Connect Twilio. Send SMS in US/Canada or worldwide. STOP/HELP handled automatically. Pause, resume and retry mid-campaign.",
  alternates: { canonical: "/features/sms" },
};

export default function SmsFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="SMS"
      title="SMS that *reaches every phone.*"
      subtitle="Connect Twilio. Send SMS in US/Canada or worldwide. Reply to inbound messages. Stay compliant with 10DLC and CTIA rules."
      accent="#a855f7"
      grad="linear-gradient(135deg, #4c1d95 0%, #a855f7 55%, #e7d3ff 100%)"
      icon={<SmsIcon size={26} color="#fff" />}
      capabilities={[
        {
          title: "Bring your Twilio",
          body: "Use your own Twilio account. Provision numbers and set up messaging services right inside SpeedIQ.",
        },
        {
          title: "10DLC for the US",
          body: "Register your brand, campaigns and use cases — all surfaced in the UI for US A2P sends.",
        },
        {
          title: "Templates",
          body: "Reusable SMS templates with variables. Personalize without copy-paste.",
        },
        {
          title: "Pause / resume / retry",
          body: "Pause sends to fix a typo. Resume where you left off. Retry only the recipients that failed.",
        },
        {
          title: "Two-way inbox",
          body: "Customer replies land in the inbox. Filter by unread, archived or all. Assign chats to teammates.",
        },
        {
          title: "Auto opt-out",
          body: "STOP, START and HELP keywords are handled automatically. Opt-outs tracked per contact.",
        },
        {
          title: "US/Canada & global",
          body: "Domestic SMS at 5 credits each. MMS at 8. International at 15. Costs shown on every send.",
        },
        {
          title: "Schedule & throttle",
          body: "Schedule for a future date. We throttle sends to stay within Twilio's API limits — even on big blasts.",
        },
        {
          title: "Delivery alerts",
          body: "Twilio webhooks stream every status — queued, sent, delivered, failed — back to your campaign with error codes.",
        },
      ]}
      highlights={[
        {
          heading: "Built for the real rules of A2P SMS",
          body: "10DLC rules mean you can't send SMS from any number to any phone in the US. We surface brand registration, campaign approval and approved use cases — and won't let you fire a non-compliant send.",
          bullets: [
            "Brand registration in one place",
            "Campaign approval workflow",
            "Sender ID and short code management",
            "Pre-flight compliance checks",
            "Domestic 5 credits / global 15 credits",
          ],
        },
        {
          heading: "Run campaigns like an operator",
          body: "Fire 50,000 messages and find a typo on message 200? Pause. Fix. Resume. Failed on a chunk of numbers? Retry only those. SMS campaigns get treated as production systems, not one-shot scripts.",
          bullets: [
            "Pause without losing progress",
            "Resume from where you stopped",
            "Cancel cleanly with full audit",
            "Retry only the failed sends",
            "Per-recipient status + error codes",
          ],
        },
        {
          heading: "Replies don't disappear",
          body: "Every customer reply lands in the inbox alongside WhatsApp. Assign chats, tag conversations, archive resolved ones, and reply with saved messages.",
          bullets: [
            "Filters: unread, archived, all",
            "Assign chats to teammates",
            "Archive or delete softly",
            "Unread counter per chat",
            "Auto STOP / START / HELP handling",
          ],
        },
      ]}
      faqs={[
        {
          q: "Do I need my own Twilio account?",
          a: "Yes. You use your Twilio credentials so you keep full carrier visibility and billing transparency. Setup is a single flow inside Settings → SMS.",
        },
        {
          q: "Is SMS on the Starter plan?",
          a: "SMS is on Pro and Business. Starter focuses on WhatsApp and Email. Upgrade to Pro any time to unlock it.",
        },
        {
          q: "How does compliance work for international sends?",
          a: "10DLC applies to messages ending in the US. Canada follows CRTC and CWTA rules. Other destinations follow local regulations. We track non-domestic sends as international (15 credits) and use Twilio's global network.",
        },
        {
          q: "What happens when someone replies STOP?",
          a: "STOP, UNSUBSCRIBE, CANCEL, END and QUIT are auto-recognized. The contact opts out and future campaigns skip them automatically.",
        },
      ]}
    />
  );
}
