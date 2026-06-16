import type { Metadata } from "next";
import Link from "next/link";

import { Container, SectionHead, Eyebrow, Avatar } from "@/components/marketing/atoms";
import { createClient } from "@/lib/supabase/server";
import { FinalCTA } from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "Blog & Marketing Insights — SpeedIQ",
  description:
    "Explore case studies, design guidelines, compliance insights, and multi-channel growth hacks from the SpeedIQ messaging team.",
  alternates: { canonical: "/blog" },
};

const MOCK_POSTS = [
  {
    id: "1",
    title: "10 WhatsApp Marketing Strategies for E-commerce in 2026",
    slug: "whatsapp-marketing-strategies-ecommerce",
    excerpt: "Discover how top e-commerce brands are achieving 45%+ open rates and driving sales using personalized WhatsApp campaigns.",
    cover_image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=60",
    author_name: "Neeraj Kumar",
    published_at: new Date().toISOString(),
  },
  {
    id: "2",
    title: "The Ultimate Guide to 10DLC SMS Compliance",
    slug: "guide-to-10dlc-sms-compliance",
    excerpt: "Everything you need to know about 10DLC registration, carrier fees, and avoiding spam filters in the US/Canada.",
    cover_image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
    author_name: "SpeedIQ Compliance Team",
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default async function BlogIndexPage() {
  let posts = MOCK_POSTS;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (!error && data && data.length > 0) {
      posts = data.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        cover_image: post.cover_image || "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=60",
        author_name: post.author_name || "SpeedIQ Team",
        published_at: post.published_at || post.created_at,
      }));
    }
  } catch (err) {
    console.warn("Failed to fetch blog posts from database, falling back to mock data.", err);
  }

  return (
    <>
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            eyebrow="BLOG"
            title="Insights & *growth guides.*"
            lede="Read the latest insights from our engineering and marketing experts on scale, compliance, and multi-channel strategies."
            align="center"
          />
        </Container>
      </section>

      <section style={{ paddingBottom: "var(--section-y)" }}>
        <Container>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 32,
              marginTop: 16,
            }}
          >
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                style={{
                  textDecoration: "none",
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                className="blog-card"
              >
                <div style={{ position: "relative", width: "100%", height: 200, overflow: "hidden" }}>
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.3s ease",
                    }}
                    className="blog-image"
                  />
                </div>
                <div style={{ padding: 24, display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11.5,
                      color: "var(--fg-3)",
                    }}
                  >
                    {new Date(post.published_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 20,
                      fontWeight: 500,
                      lineHeight: 1.25,
                      letterSpacing: "-0.015em",
                      margin: 0,
                      color: "var(--fg)",
                    }}
                  >
                    {post.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--fg-3)" }}>
                    {post.excerpt}
                  </p>
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, paddingTop: 12 }}>
                    <Avatar name={post.author_name} size={24} />
                    <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{post.author_name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <FinalCTA />

      <style>{`
        .blog-card:hover {
          transform: translateY(-4px);
          border-color: var(--line-2) !important;
          box-shadow: 0 12px 30px -10px rgba(0,0,0,.25);
        }
        .blog-card:hover .blog-image {
          transform: scale(1.04);
        }
      `}</style>
    </>
  );
}
