import type { Metadata } from "next";
import { Users } from "lucide-react";

import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";

export const metadata: Metadata = {
  title: "Audience Segmentation & Contacts — SpeedIQ",
  description:
    "Organize your contacts, create dynamic segments using tags, map custom database fields, and run targeted broadcasts.",
  alternates: { canonical: "/features/contacts" },
};

export default function ContactsFeaturePage() {
  return (
    <FeaturePageLayout
      eyebrow="Contacts"
      title="Segments built with *precision.*"
      subtitle="Filter contacts by tags, custom fields, and engagement activity. Target the right users without complex database queries."
      accent="#3b82f6" // Blue-500
      grad="linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #93c5fd 100%)"
      icon={<Users size={26} color="#fff" />}
      capabilities={[
        {
          title: "Custom Fields Schema",
          body: "Map first names, registration dates, transaction values, or company details directly into contact profile fields.",
        },
        {
          title: "Tag-based Filtering",
          body: "Label contacts instantly during Excel imports or form submissions. Send targeted broadcasts using single tags.",
        },
        {
          title: "Dynamic Audiences",
          body: "Build segments that update in real time. Filter for contacts who were added in the last 7 days and haven't active tags.",
        },
        {
          title: "Import Mapping Wizard",
          body: "Upload CSV/Excel contact lists. Map columns to custom fields and validate formats before committing data.",
        },
        {
          title: "Opt-out Safeguards",
          body: "Automatic status tracking. SpeedIQ handles unsubscribed, bounced, or opted-out contacts to prevent spam sends.",
        },
        {
          title: "Audit Profile Timeline",
          body: "Inspect individual profiles. View previous email opens, WhatsApp chat history, and SMS sends in one timeline.",
        },
      ]}
      highlights={[
        {
          heading: "Map any variable for personalization",
          body: "Personalization boosts response rates. Import customized fields like account manager name or trial end date, and drop them dynamically into WhatsApp template variables.",
          bullets: [
            "Validate phone numbers automatically during import",
            "Auto-merge fields in campaign builders",
            "Export lists to CSV in seconds",
            "Identify and flag invalid email addresses",
          ],
        },
      ]}
      faqs={[
        {
          q: "How many custom fields can we map?",
          a: "You can create unlimited custom fields per project in the settings. Fields support Text, Number, and Boolean formats.",
        },
      ]}
    />
  );
}
