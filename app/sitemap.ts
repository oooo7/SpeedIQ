import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://speediq.app";

const STATIC_PATHS: { path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "features", changeFrequency: "weekly", priority: 0.9 },
  { path: "features/whatsapp", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/email", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/sms", changeFrequency: "weekly", priority: 0.8 },
  { path: "features/inbox", changeFrequency: "weekly", priority: 0.8 },
  { path: "pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "compare", changeFrequency: "monthly", priority: 0.7 },
  { path: "use-cases", changeFrequency: "monthly", priority: 0.7 },
  { path: "legal/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/refund", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/cookies", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/dpa", changeFrequency: "yearly", priority: 0.3 },
  { path: "legal/acceptable-use", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path ? `/${path}` : ""}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
