import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "Unified inbox for WhatsApp & SMS — SpeedIQ",
  description:
    "One inbox for every channel. Assign chats. Use quick replies, saved messages and tags. Hold sends outside business hours.",
  alternates: { canonical: "/features/inbox" },
};

export default function InboxFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="Unified inbox"
      title="One inbox. *Every reply.*"
      subtitle="WhatsApp and SMS replies in one place. Assign chats to teammates. Tag, archive and search. Stop switching apps."
      accent="#0a0a0a"
      grad="linear-gradient(135deg, #18181b 0%, #3f3f46 55%, #a1a1aa 100%)"
      icon={<Inbox size={26} color="#fff" />}
      capabilities={[
        {
          title: "All chats in one list",
          body: "WhatsApp and SMS chats in one stream, sorted by last activity. Filter by channel, unread or archived.",
        },
        {
          title: "Full chat history",
          body: "Every message per customer across every channel, with direction and timestamps.",
        },
        {
          title: "Send media",
          body: "Drop photos, videos and files into WhatsApp replies. MMS for SMS where carriers allow it.",
        },
        {
          title: "Quick replies",
          body: "Short, ready-to-send responses. Hit one click to use them in any chat.",
        },
        {
          title: "Saved messages",
          body: "Longer, reusable replies with attachments. Shared across the workspace.",
        },
        {
          title: "Team assignment",
          body: "Assign chats to teammates. Role-based access controls who can see and reply.",
        },
        {
          title: "Tags & filters",
          body: "Tag chats to track intent — support, sales, abuse. Filter the inbox by tag.",
        },
        {
          title: "Archive & soft-delete",
          body: "Archive resolved chats to clear the inbox. Soft-delete with full history — nothing is lost.",
        },
        {
          title: "Working hours",
          body: "Set business hours per timezone. Outbound replies wait until you're back online.",
        },
        {
          title: "Mark read or unread",
          body: "Visual unread counters per chat. Mark read on click or in bulk.",
        },
        {
          title: "Search every chat",
          body: "Search by contact name, phone or message text. Full history kept for the life of the project.",
        },
        {
          title: "Works on mobile",
          body: "Responsive layout works on phone, tablet and desktop. Reply from anywhere.",
        },
      ]}
      highlights={[
        {
          heading: "Built for shared inboxes, not solo senders",
          body: "Your team handles dozens of chats a day. The inbox supports assignment, tags, archive and audit trails — so two people don't reply to the same customer, and resolved chats don't clutter the queue.",
          bullets: [
            "Owner, Admin, Editor, Viewer roles",
            "Assign chats to specific teammates",
            "Unread counter per chat",
            "Archive without losing history",
            "Audit log of every reply (Business)",
          ],
        },
        {
          heading: "Reply faster with saved templates",
          body: "Quick replies for one-liners. Saved messages with media for common scenarios. Everything shared across the workspace, so onboarding a new teammate is instant.",
          bullets: [
            "Quick reply library sorted by topic",
            "Slash-search in any chat",
            "Saved messages with attachments",
            "Personalize with variables",
            "Secure media storage",
          ],
        },
        {
          heading: "Never break the 24-hour rule by accident",
          body: "WhatsApp's reply window is 24 hours after a customer message. After that, you need a template. The inbox knows where each chat is in the window — and warns you before you send something that would fail.",
          bullets: [
            "Live window status per chat",
            "Template suggestion when window expires",
            "Working-hours queue for off-hours",
            "Auto STOP / opt-out handling",
            "Quality alerts before you hit a limit",
          ],
        },
      ]}
      faqs={[
        {
          q: "Can I reply to email in the inbox too?",
          a: "Email replies go to your existing email client for now. We treat email as a broadcast channel today. WhatsApp and SMS are the live channels in the inbox.",
        },
        {
          q: "Can I see who replied to a chat?",
          a: "Yes. Every outbound message records the sending user. On the Business plan, you get a full audit log of replies, assignments and chat actions.",
        },
        {
          q: "What happens to old chats?",
          a: "Chats stay accessible for the life of the project. Archive or soft-delete to clean up. Data stays for export at any time.",
        },
        {
          q: "Does the inbox work on mobile?",
          a: "Yes. The layout is responsive — phone, tablet, desktop. Reply from anywhere.",
        },
      ]}
    />
  );
}
