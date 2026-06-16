import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://speediq.app";

const STATIC_PATHS: { path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "features", changeFrequency: "weekly", priority: 0.9 },
  { path: "features/whatsapp", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/email", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/sms", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/inbox", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/automation", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/contacts", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/analytics", changeFrequency: "weekly", priority: 0.8 },
  
  { path: "solutions", changeFrequency: "weekly", priority: 0.9 },
  { path: "solutions/ecommerce", changeFrequency: "weekly", priority: 0.8 },
  { path: "solutions/real-estate", changeFrequency: "weekly", priority: 0.8 },
  { path: "solutions/education", changeFrequency: "weekly", priority: 0.8 },
  { path: "solutions/agencies", changeFrequency: "weekly", priority: 0.8 },
  { path: "solutions/healthcare", changeFrequency: "weekly", priority: 0.8 },
  { path: "solutions/saas", changeFrequency: "weekly", priority: 0.8 },

  { path: "about", changeFrequency: "monthly", priority: 0.6 },
  { path: "contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "security", changeFrequency: "monthly", priority: 0.6 },
  { path: "pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "compare", changeFrequency: "monthly", priority: 0.7 },
  
  { path: "blog", changeFrequency: "daily", priority: 0.8 },
  { path: "changelog", changeFrequency: "daily", priority: 0.8 },
  { path: "customers", changeFrequency: "weekly", priority: 0.8 },
  
  { path: "legal/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/refund", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/cookies", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/dpa", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/acceptable-use", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const sitemapEntries = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path ? `/${path}` : ""}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (url && anonKey) {
      const supabase = createClient(url, anonKey);

      // Fetch dynamic blog posts
      const { data: blogPosts } = await supabase
        .from("blog_posts")
        .select("slug, updated_at")
        .eq("published", true);

      if (blogPosts) {
        blogPosts.forEach((post) => {
          sitemapEntries.push({
            url: `${BASE_URL}/blog/${post.slug}`,
            lastModified: post.updated_at ? new Date(post.updated_at) : now,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          });
        });
      }

      // Fetch dynamic changelogs
      const { data: changelogEntries } = await supabase
        .from("changelog_entries")
        .select("slug, updated_at")
        .eq("published", true);

      if (changelogEntries) {
        changelogEntries.forEach((entry) => {
          sitemapEntries.push({
            url: `${BASE_URL}/changelog/${entry.slug}`,
            lastModified: entry.updated_at ? new Date(entry.updated_at) : now,
            changeFrequency: "weekly" as const,
            priority: 0.5,
          });
        });
      }

      // Fetch dynamic customer stories
      const { data: customerStories } = await supabase
        .from("customer_stories")
        .select("slug, updated_at")
        .eq("published", true);

      if (customerStories) {
        customerStories.forEach((story) => {
          sitemapEntries.push({
            url: `${BASE_URL}/customers/${story.slug}`,
            lastModified: story.updated_at ? new Date(story.updated_at) : now,
            changeFrequency: "monthly" as const,
            priority: 0.6,
          });
        });
      }
    }
  } catch (err) {
    console.warn("Sitemap: Failed to query dynamic paths from database, using static paths only.", err);
  }

  return sitemapEntries;
}
