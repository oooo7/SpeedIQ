import type { Metadata } from "next";
import { GitPullRequest } from "lucide-react";

import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "Marketing Automation & Drip Flows — SpeedIQ",
  description:
    "Design drip flows, trigger automated WhatsApp templates based on events, schedule campaigns, and coordinate customer journeys.",
  alternates: { canonical: "/features/automation" },
};

export default function AutomationFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="Automation"
      title="Automations that build *relationships.*"
      subtitle="Connect checkout triggers, schedule newsletter campaigns, and configure multi-channel drip sequences on autopilot."
      accent="#a855f7" // Purple-500
      grad="linear-gradient(135deg, #7e22ce 0%, #a855f7 55%, #d8b4fe 100%)"
      icon={<GitPullRequest size={26} color="#fff" />}
      capabilities={[
        {
          title: "Webhook Triggers",
          body: "Trigger instant flows when user actions happen in your app, such as signing up, abandoning a cart, or upgrading.",
        },
        {
          title: "Multi-channel Drips",
          body: "Design onboarding campaigns. Send an email on day 1, follow up on WhatsApp on day 3, and send a check-in SMS on day 7.",
        },
        {
          title: "Flexible Scheduling",
          body: "Draft campaigns ahead of time and schedule them. SpeedIQ holds sending outside business hours automatically.",
        },
        {
          title: "Delay & Wait steps",
          body: "Add duration-based delays or hold execution until specific criteria match, ensuring your messages hit at the perfect time.",
        },
        {
          title: "Meta-approved Templates",
          body: "Incorporate rich media WhatsApp templates with interactive buttons directly into your automated customer journeys.",
        },
        {
          title: "Credit Quota Safety",
          body: "Verify project credit balances. Automations automatically pause and alert project owners if credit counts drop too low.",
        },
      ]}
      highlights={[
        {
          heading: "Design responsive user journeys",
          body: "Guide customers from signup to activation. Build onboarding branches that deliver targeted guidance via email, switching to WhatsApp support triggers if they go inactive.",
          bullets: [
            "Seamless multi-channel drip execution",
            "Hold sending automatically outside quiet hours",
            "Pause sequences as soon as contacts respond",
            "Optimize campaign sequences with real-time conversion stats",
          ],
        },
      ]}
      faqs={[
        {
          q: "What triggers are supported?",
          a: "You can trigger automations using standard webhooks from your app, or by adding tags to a contact.",
        },
        {
          q: "Do sequences stop if a customer replies?",
          a: "Yes. You can configure campaigns to automatically stop as soon as a subscriber replies, letting support agents take over in the live chat inbox.",
        },
      ]}
    />
  );
}
