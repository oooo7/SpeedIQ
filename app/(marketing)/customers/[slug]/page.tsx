import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Container, Avatar } from "@/components/marketing/atoms";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

const MOCK_STORIES_DATA: Record<string, {
  title: string;
  company_name: string;
  industry: string;
  challenge: string;
  solution: string;
  result: string;
  testimonial_quote: string;
  testimonial_author: string;
  testimonial_role: string;
}> = {
  "fitlife-club-whatsapp": {
    title: "How FitLife Club Boosted Booking Attendance by 65% with WhatsApp",
    company_name: "FitLife Club",
    industry: "Health & Fitness",
    challenge: "FitLife was struggling with a 15% booking attendance rate from standard email reminders, leading to empty slots and trainer frustration.",
    solution: "By utilizing SpeedIQ's official Meta WhatsApp integration, they automated tour and appointment confirmations. They designed template variations containing quick-reply options (e.g. 'Confirm' or 'Reschedule') that trigger instant booking status updates.",
    result: "Booking attendance rates jumped to 80% within the first 30 days, representing a 65% increase in trainer resource efficiency.",
    testimonial_quote: "SpeedIQ transformed our client communications. The interactive templates let clients confirm or reschedule in one tap, which cut booking cancellations to near zero.",
    testimonial_author: "Sarah Jenkins",
    testimonial_role: "Operations Manager",
  },
};

export async function generateStaticParams() {
  return Object.keys(MOCK_STORIES_DATA).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let story = MOCK_STORIES_DATA[slug];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("customer_stories")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (data) {
      story = {
        title: data.title,
        company_name: data.company_name,
        industry: data.industry || "",
        challenge: data.challenge || "",
        solution: data.solution || "",
        result: data.result || "",
        testimonial_quote: data.testimonial_quote || "",
        testimonial_author: data.testimonial_author || "",
        testimonial_role: data.testimonial_role || "",
      };
    }
  } catch {}

  if (!story) return {};
  return {
    title: `${story.company_name} Case Study — SpeedIQ`,
    description: story.title,
    alternates: { canonical: `/customers/${slug}` },
  };
}

export default async function CustomerStoryPage({ params }: Props) {
  const { slug } = await params;
  let story = MOCK_STORIES_DATA[slug];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("customer_stories")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (data) {
      story = {
        title: data.title,
        company_name: data.company_name,
        industry: data.industry || "",
        challenge: data.challenge || "",
        solution: data.solution || "",
        result: data.result || "",
        testimonial_quote: data.testimonial_quote || "",
        testimonial_author: data.testimonial_author || "",
        testimonial_role: data.testimonial_role || "",
      };
    }
  } catch {}

  if (!story) {
    notFound();
  }

  return (
    <article style={{ paddingBottom: "var(--section-y)" }}>
      {/* HEADER HERO */}
      <section style={{ paddingTop: 88, paddingBottom: 32 }}>
        <Container narrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Link
              href="/customers"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--fg-3)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← Back to customer stories
            </Link>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(30px, 4vw, 44px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                fontWeight: 500,
                margin: 0,
                color: "var(--fg)",
              }}
            >
              {story.title}
            </h1>
          </div>
        </Container>
      </section>

      {/* THREE COLUMN SUMMARY SECTION */}
      <section style={{ paddingBottom: 48 }}>
        <Container narrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 20,
            }}
          >
            <div
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-lg)",
                padding: "24px 20px",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                Challenge
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--fg-2)" }}>{story.challenge}</p>
            </div>

            <div
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-lg)",
                padding: "24px 20px",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                Solution
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--fg-2)" }}>{story.solution}</p>
            </div>

            <div
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-lg)",
                padding: "24px 20px",
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 6 }}>
                Result
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--fg-2)" }}>{story.result}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* TESTIMONIAL BLOCK */}
      <section>
        <Container narrow>
          <div
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--radius-lg)",
              padding: "48px 40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            <span style={{ fontSize: 48, lineHeight: 1, fontFamily: "var(--font-display)", color: "var(--accent)" }}>&ldquo;</span>
            <blockquote
              style={{
                margin: 0,
                fontSize: 18,
                lineHeight: 1.6,
                fontStyle: "italic",
                color: "var(--fg-2)",
                fontWeight: 450,
                letterSpacing: "-0.005em",
              }}
            >
              {story.testimonial_quote}
            </blockquote>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <Avatar name={story.testimonial_author} size={32} />
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>{story.testimonial_author}</div>
              <div style={{ fontSize: 12, color: "var(--fg-3)" }}>{story.testimonial_role} at {story.company_name}</div>
            </div>
          </div>
        </Container>
      </section>
    </article>
  );
}
