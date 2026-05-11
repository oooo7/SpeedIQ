import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";



export const metadata: Metadata = {
  title: "Unified inbox for WhatsApp & SMS — SpeedIQ",
  description:
    "One inbox for every channel. Threaded conversations, team assignment, canned messages, quick replies, working-hours queue, and full search.",
  alternates: { canonical: "/features/inbox" },
};

export default function InboxFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="Unified inbox"
      title="One inbox for every customer reply"
      subtitle="WhatsApp replies. SMS replies. Side-by-side. Assigned to teammates. Tagged, archived, searchable. Stop juggling apps."
      accent="#0a0a0a"
      grad="linear-gradient(135deg, #18181b 0%, #3f3f46 55%, #a1a1aa 100%)"
      icon={<Inbox size={26} color="#fff" />}
      capabilities={[
        {
          title: "Unified conversation list",
          body: "WhatsApp and SMS threads in one stream, sorted by last activity. Filter by channel, unread, archived, or all.",
        },
        {
          title: "Threaded history",
          body: "Full message history per contact across every channel, with direction (inbound / outbound) and timestamps.",
        },
        {
          title: "Send media replies",
          body: "Drop images, documents, and audio into WhatsApp replies. SMS supports MMS where carriers allow.",
        },
        {
          title: "Quick replies",
          body: "Categorized library of short responses for fast handling. Trigger with a single click in any conversation.",
        },
        {
          title: "Canned messages",
          body: "Longer, reusable responses with media attachments. Shared across the project — every teammate sees the same library.",
        },
        {
          title: "Team assignment",
          body: "Assign conversations to specific teammates. Role-based access controls who sees and replies to what.",
        },
        {
          title: "Tags & filters",
          body: "Tag conversations to track intent (support, sales, abuse) and filter the inbox by tag.",
        },
        {
          title: "Archive & soft-delete",
          body: "Archive resolved threads to clear the inbox. Soft-delete with full audit trail — nothing is permanently lost.",
        },
        {
          title: "Working-hours queue",
          body: "Set business hours per timezone. Outbound replies park outside hours and auto-send when you're back online.",
        },
        {
          title: "Mark read / unread",
          body: "Visual unread counters per conversation. Mark read on click or in bulk.",
        },
        {
          title: "Search & history",
          body: "Search across all conversations by contact name, phone, or message content. Full history retained for the life of the project.",
        },
        {
          title: "Mobile-friendly",
          body: "Responsive layout works on phone, tablet, and desktop — your team can reply from anywhere.",
        },
      ]}
      highlights={[
        {
          heading: "Built for shared inboxes, not solo senders",
          body: "Your team handles dozens of conversations a day. SpeedIQ's inbox supports assignment, tagging, archive, and audit trails — so two people don't reply to the same customer, and resolved threads don't clutter the queue.",
          bullets: [
            "Owner / admin / editor / viewer roles",
            "Assign conversation to specific teammate",
            "Unread counter per conversation",
            "Archive without losing history",
            "Audit log of who replied (Business)",
          ],
        },
        {
          heading: "Reply faster with quick replies and canned messages",
          body: "Pre-written quick replies for one-liners. Longer canned messages with media for common scenarios. Everything project-wide, so onboarding a new teammate is instant.",
          bullets: [
            "Categorized quick reply library",
            "Slash-search in any conversation",
            "Canned messages with media attachments",
            "Variable interpolation in templates",
            "Signed-URL media storage",
          ],
        },
        {
          heading: "Never break the 24-hour rule by accident",
          body: "WhatsApp's session window is 24 hours after a customer reply. After that, you need a template. SpeedIQ knows where each conversation is in the window — and warns you (or auto-prompts a template) before you send a session message that would fail.",
          bullets: [
            "Real-time session-window status per chat",
            "Template suggestion when window expires",
            "Working-hours queue for after-hours sends",
            "Auto-handle STOP / opt-out keywords",
            "Quality rating alerts before you get throttled",
          ],
        },
      ]}
      faqs={[
        {
          q: "Can I reply to email in the inbox too?",
          a: "Email replies route to your existing email client today — we treat email as a broadcast channel for now. WhatsApp and SMS are the conversational channels in the unified inbox.",
        },
        {
          q: "Can I see who replied to a conversation?",
          a: "Yes. Every outbound message records the sending user. On the Business plan, you get a full audit log of replies, assignments, and conversation actions.",
        },
        {
          q: "What happens to old conversations?",
          a: "Conversations remain accessible for the life of the project. You can archive or soft-delete to clean up, but the data is retained for export at any time.",
        },
        {
          q: "Does the inbox work on mobile?",
          a: "Yes — the layout is responsive and works on phone, tablet, and desktop. Your team can reply from anywhere.",
        },
      ]}
    />
  );
}
