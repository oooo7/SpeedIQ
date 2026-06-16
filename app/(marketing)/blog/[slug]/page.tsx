import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Container, Avatar } from "@/components/marketing/atoms";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

const MOCK_POSTS_DATA: Record<string, {
  title: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_name: string;
  published_at: string;
}> = {
  "whatsapp-marketing-strategies-ecommerce": {
    title: "10 WhatsApp Marketing Strategies for E-commerce in 2026",
    excerpt: "Discover how top e-commerce brands are achieving 45%+ open rates and driving sales using personalized WhatsApp campaigns.",
    cover_image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=60",
    author_name: "Neeraj Kumar",
    published_at: new Date().toISOString(),
    content: `
WhatsApp has quickly become the most direct and effective marketing channel for modern e-commerce brands. Unlike email, which can suffer from low open rates and spam filters, WhatsApp messages boast an average open rate of over 95% and response rates above 45%.

Here are 4 key WhatsApp marketing strategies to scale your e-commerce store this year.

### 1. Abandoned Cart Recovery via WhatsApp
Instead of sending a standard cart recovery email, send a personalized WhatsApp template with a 1-click checkout button. 

### 2. Interactive Product Catalogs
Create interactive messages featuring lists or product grids so users can browse and buy directly within the chat window.

### 3. Post-Purchase Satisfaction Check-ins
Send a message 3 days after delivery asking for feedback. You can route happy customers to a review link and unhappy ones to a support agent.

### 4. Personalized Loyalty Rewards
Reward your best customers with exclusive discounts and early access to sales delivered straight to their WhatsApp inbox.
    `,
  },
  "guide-to-10dlc-sms-compliance": {
    title: "The Ultimate Guide to 10DLC SMS Compliance",
    excerpt: "Everything you need to know about 10DLC registration, carrier fees, and avoiding spam filters in the US/Canada.",
    cover_image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
    author_name: "SpeedIQ Compliance Team",
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    content: `
If you are sending marketing or transactional SMS to users in the United States or Canada, understanding 10DLC (10-Digit Long Code) compliance is critical to ensure your messages get delivered.

In this guide, we will break down the terminology, registration requirements, and best practices.

### What is 10DLC?
10DLC is the standard system supported by major US carriers (AT&T, T-Mobile, Verizon) for A2P (Application-to-Person) text messaging. It ensures that businesses are verified and messages are clean and compliant.

### How to Get Compliant
1. **Brand Registration**: Register your legal business details.
2. **Campaign Registration**: Describe what types of messages you will send (e.g. OTPs, marketing, support).
3. **Explicit Opt-in**: Always obtain explicit opt-in before sending your first message.
    `,
  },
};

export async function generateStaticParams() {
  // Try to generate static pages for static fallbacks to avoid build time crashes
  return Object.keys(MOCK_POSTS_DATA).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let post = MOCK_POSTS_DATA[slug];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (data) {
      post = {
        title: data.title,
        excerpt: data.excerpt || "",
        content: data.content,
        cover_image: data.cover_image || "",
        author_name: data.author_name || "SpeedIQ Team",
        published_at: data.published_at || data.created_at,
      };
    }
  } catch {}

  if (!post) return {};
  return {
    title: `${post.title} — SpeedIQ Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  let post = MOCK_POSTS_DATA[slug];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (data) {
      post = {
        title: data.title,
        excerpt: data.excerpt || "",
        content: data.content,
        cover_image: data.cover_image || "",
        author_name: data.author_name || "SpeedIQ Team",
        published_at: data.published_at || data.created_at,
      };
    }
  } catch {}

  if (!post) {
    notFound();
  }

  return (
    <article style={{ paddingBottom: "var(--section-y)" }}>
      {/* HEADER HERO */}
      <section style={{ paddingTop: 88, paddingBottom: 32 }}>
        <Container narrow>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Link
              href="/blog"
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
              ← Back to blog
            </Link>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-3)",
              }}
            >
              {new Date(post.published_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(30px, 4vw, 48px)",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
                fontWeight: 500,
                margin: 0,
                color: "var(--fg)",
              }}
            >
              {post.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={post.author_name} size={28} />
              <span style={{ fontSize: 14, color: "var(--fg-2)" }}>Written by {post.author_name}</span>
            </div>
          </div>
        </Container>
      </section>

      {/* COVER IMAGE */}
      {post.cover_image && (
        <section style={{ paddingBottom: 48 }}>
          <Container narrow>
            <div
              style={{
                width: "100%",
                height: 400,
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                border: "1px solid var(--line)",
              }}
            >
              <img
                src={post.cover_image}
                alt={post.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          </Container>
        </section>
      )}

      {/* CONTENT BODY */}
      <section>
        <Container narrow>
          <div
            style={{
              fontSize: 16.5,
              lineHeight: 1.7,
              color: "var(--fg-2)",
              maxWidth: 720,
              margin: "0 auto",
              whiteSpace: "pre-wrap",
            }}
            className="blog-content"
          >
            {post.content}
          </div>
        </Container>
      </section>

      <style>{`
        .blog-content h2, .blog-content h3 {
          font-family: var(--font-display);
          color: var(--fg);
          margin-top: 36px;
          margin-bottom: 16px;
          font-weight: 500;
          letter-spacing: -0.015em;
        }
        .blog-content h2 { font-size: 24px; }
        .blog-content h3 { font-size: 20px; }
        .blog-content p {
          margin-bottom: 20px;
        }
        .blog-content ul {
          margin-bottom: 20px;
          padding-left: 20px;
        }
        .blog-content li {
          margin-bottom: 8px;
        }
      `}</style>
    </article>
  );
}
