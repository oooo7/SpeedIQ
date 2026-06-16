import type { Metadata } from "next";

import { Container, SectionHead, Eyebrow } from "@/components/marketing/atoms";
import { createClient } from "@/lib/supabase/server";
import { FinalCTA } from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "Product Changelog — SpeedIQ",
  description:
    "Stay up to date with the latest features, improvements, and bug fixes added to the SpeedIQ multi-channel marketing platform.",
  alternates: { canonical: "/changelog" },
};

// Fallback data if tables do not exist or are empty
const MOCK_CHANGELOG = [
  {
    id: "1",
    title: "SMS Sending, Billing, and Template Refinements",
    content: "We have fully rolled out SMS sending functionality integrated directly with Twilio. Additionally, you can now manage plans, purchase top-up credit packs using Stripe and Razorpay, and sync WhatsApp template variations directly from the Meta Developer Suite.",
    version: "v1.2.0",
    published_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Unified Live Inbox & Inbound Media Support",
    content: "Our Live Inbox now supports inbound media! You can view images, PDF files, and audio messages sent by your WhatsApp subscribers directly within the dashboard chat viewport. We've also optimized scroll anchoring so new messages load without shifting your viewport.",
    version: "v1.1.0",
    published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default async function ChangelogPage() {
  let entries = MOCK_CHANGELOG;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("changelog_entries")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (!error && data && data.length > 0) {
      entries = data.map((entry) => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        version: entry.version || "",
        published_at: entry.published_at || entry.created_at,
      }));
    }
  } catch (err) {
    console.warn("Failed to fetch changelog from database, falling back to mock data.", err);
  }

  return (
    <>
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="CHANGELOG"
            title="Product *changelog.*"
            lede="Follow along for latest feature releases, improvements, and updates shipped weekly to SpeedIQ."
            align="center"
          />
        </Container>
      </section>

      <section style={{ paddingBottom: "var(--section-y)" }}>
        <Container narrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
            {entries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 32,
                  borderTop: "1px solid var(--line)",
                  paddingTop: 32,
                }}
                className="changelog-row"
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--fg-3)",
                      marginBottom: 8,
                    }}
                  >
                    {new Date(entry.published_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {entry.version && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "var(--bg-sunken)",
                        border: "1px solid var(--line-2)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--accent)",
                      }}
                    >
                      {entry.version}
                    </span>
                  )}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 500,
                      margin: "0 0 16px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {entry.title}
                  </h3>
                  <div
                    style={{
                      fontSize: 15.5,
                      lineHeight: 1.6,
                      color: "var(--fg-2)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {entry.content}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <FinalCTA />

      <style>{`
        @media (max-width: 640px) {
          .changelog-row {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
