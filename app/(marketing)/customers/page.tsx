import type { Metadata } from "next";
import Link from "next/link";

import { Container, SectionHead, Eyebrow, Avatar } from "@/components/marketing/atoms";
import { createClient } from "@/lib/supabase/server";
import { FinalCTA } from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "Customer Stories & Case Studies — SpeedIQ",
  description:
    "Discover how fast-growing businesses scale their booking rates, marketing conversion, and messaging operations using SpeedIQ.",
  alternates: { canonical: "/customers" },
};

const MOCK_STORIES = [
  {
    id: "1",
    title: "How FitLife Club Boosted Booking Attendance by 65% with WhatsApp",
    slug: "fitlife-club-whatsapp",
    company_name: "FitLife Club",
    industry: "Health & Fitness",
    result: "65% booking attendance rate increase",
    testimonial_quote: "SpeedIQ transformed our client communications. The interactive templates let clients confirm or reschedule in one tap, which cut booking cancellations to near zero.",
    testimonial_author: "Sarah Jenkins",
    testimonial_role: "Operations Manager",
  },
];

export default async function CustomersPage() {
  let stories = MOCK_STORIES;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_stories")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (!error && data && data.length > 0) {
      stories = data.map((story) => ({
        id: story.id,
        title: story.title,
        slug: story.slug,
        company_name: story.company_name,
        industry: story.industry || "",
        result: story.result || "",
        testimonial_quote: story.testimonial_quote || "",
        testimonial_author: story.testimonial_author || "",
        testimonial_role: story.testimonial_role || "",
      }));
    }
  } catch (err) {
    console.warn("Failed to fetch customer stories from database, falling back to mock data.", err);
  }

  return (
    <>
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="CASE STUDIES"
            title="Stories of *customer success.*"
            lede="Read how fast-growing brands leverage SpeedIQ to reach subscribers, automate reminders, and capture revenue."
            align="center"
          />
        </Container>
      </section>

      <section style={{ paddingBottom: "var(--section-y)" }}>
        <Container narrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {stories.map((story) => (
              <Link
                key={story.id}
                href={`/customers/${story.slug}`}
                style={{
                  textDecoration: "none",
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "40px 32px",
                  display: "grid",
                  gridTemplateColumns: "1fr 300px",
                  gap: 48,
                  alignItems: "center",
                  transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                className="customer-card"
              >
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "var(--bg-sunken)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: ".04em",
                        color: "var(--accent)",
                        textTransform: "uppercase",
                      }}
                    >
                      {story.industry}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{story.company_name}</span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 500,
                      lineHeight: 1.25,
                      letterSpacing: "-0.015em",
                      margin: "0 0 16px",
                      color: "var(--fg)",
                    }}
                  >
                    {story.title}
                  </h3>
                  <blockquote
                    style={{
                      margin: "0 0 20px",
                      paddingLeft: 16,
                      borderLeft: "2px solid var(--line-2)",
                      fontSize: 14.5,
                      lineHeight: 1.5,
                      fontStyle: "italic",
                      color: "var(--fg-3)",
                    }}
                  >
                    &ldquo;{story.testimonial_quote}&rdquo;
                  </blockquote>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={story.testimonial_author} size={24} />
                    <span style={{ fontSize: 13, color: "var(--fg-2)" }}>
                      {story.testimonial_author} &middot; <span style={{ color: "var(--fg-3)" }}>{story.testimonial_role}</span>
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    background: "var(--bg-sunken)",
                    borderRadius: "var(--radius)",
                    padding: 24,
                    textAlign: "center",
                    border: "1px solid var(--line-2)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 8,
                    height: "100%",
                  }}
                  className="result-box"
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      color: "var(--fg-3)",
                    }}
                  >
                    KEY OUTCOME
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      lineHeight: 1.1,
                      color: "var(--accent)",
                    }}
                  >
                    {story.result.split(" ")[0]}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.3 }}>
                    {story.result.split(" ").slice(1).join(" ")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <FinalCTA />

      <style>{`
        .customer-card:hover {
          transform: translateY(-4px);
          border-color: var(--line-2) !important;
          box-shadow: 0 12px 30px -10px rgba(0,0,0,.25);
        }
        .customer-card:hover .result-box {
          border-color: var(--line) !important;
        }
        @media (max-width: 768px) {
          .customer-card {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .result-box {
            padding: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
