import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false }
});

const SEED_BLOG_POSTS = [
  {
    title: "10 WhatsApp Marketing Strategies for E-commerce in 2026",
    slug: "whatsapp-marketing-strategies-ecommerce",
    excerpt: "Discover how top e-commerce brands are achieving 45%+ open rates and driving sales using personalized WhatsApp campaigns.",
    content: `
# 10 WhatsApp Marketing Strategies for E-commerce in 2026

WhatsApp has quickly become the most direct and effective marketing channel for modern e-commerce brands. Unlike email, which can suffer from low open rates and spam filters, WhatsApp messages boast an average **open rate of over 95%** and response rates above 45%.

Here are 10 proven WhatsApp marketing strategies to scale your e-commerce store this year.

## 1. Abandoned Cart Recovery via WhatsApp
Instead of sending a standard cart recovery email, send a personalized WhatsApp template with a 1-click checkout button. 

## 2. Interactive Product Catalogs
Create interactive messages featuring lists or product grids so users can browse and buy directly within the chat window.

## 3. Post-Purchase Satisfaction Check-ins
Send a message 3 days after delivery asking for feedback. You can route happy customers to a review link and unhappy ones to a support agent.

## 4. Personalized Loyalty Rewards
Reward your best customers with exclusive discounts and early access to sales delivered straight to their WhatsApp inbox.
    `,
    cover_image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=60",
    author_name: "Neeraj Kumar",
    author_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=60",
    published: true,
    published_at: new Date().toISOString()
  },
  {
    title: "The Ultimate Guide to 10DLC SMS Compliance",
    slug: "guide-to-10dlc-sms-compliance",
    excerpt: "Everything you need to know about 10DLC registration, carrier fees, and avoiding spam filters in the US/Canada.",
    content: `
# The Ultimate Guide to 10DLC SMS Compliance

If you are sending marketing or transactional SMS to users in the United States or Canada, understanding 10DLC (10-Digit Long Code) compliance is critical to ensure your messages get delivered.

In this guide, we will break down the terminology, registration requirements, and best practices.

## What is 10DLC?
10DLC is the standard system supported by major US carriers (AT&T, T-Mobile, Verizon) for A2P (Application-to-Person) text messaging. It ensures that businesses are verified and messages are clean and compliant.

## How to Get Compliant
1. **Brand Registration**: Register your legal business details.
2. **Campaign Registration**: Describe what types of messages you will send (e.g. OTPs, marketing, support).
3. **Explicit Opt-in**: Always obtain explicit opt-in before sending your first message.
    `,
    cover_image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
    author_name: "SpeedIQ Compliance Team",
    published: true,
    published_at: new Date().toISOString()
  }
];

const SEED_CHANGELOG = [
  {
    title: "Sms sending, billing and template builder refinements",
    slug: "sms-sending-billing-and-templates",
    content: "We have fully rolled out SMS sending functionality integrated directly with Twilio. Additionally, you can now manage plans, top-up credit packs using Stripe and Razorpay, and sync WhatsApp template variations directly from the Meta Developer Suite.",
    version: "v1.2.0",
    published: true,
    published_at: new Date().toISOString()
  },
  {
    title: "Unified Live Inbox and Inbound Media Support",
    slug: "unified-inbox-media-support",
    content: "Our Live Inbox now supports inbound media! You can view images, PDF files, and audio messages sent by your WhatsApp subscribers directly within the dashboard chat viewport.",
    version: "v1.1.0",
    published: true,
    published_at: new Date().toISOString()
  }
];

const SEED_CUSTOMERS = [
  {
    title: "How FitLife Club Boosted Booking Rates by 65% with WhatsApp",
    slug: "fitlife-club-whatsapp",
    company_name: "FitLife Club",
    industry: "Health & Fitness",
    challenge: "FitLife was struggling with a 15% booking attendance rate from standard email reminders, leading to wasted trainer slots.",
    solution: "Switched to automated WhatsApp confirmations and dynamic reminder messages using SpeedIQ templates with interactive buttons.",
    result: "Booking attendance rates jumped to 80%, and trainer slot utilization increased by over 65% within the first 30 days.",
    testimonial_quote: "SpeedIQ transformed our client communications. The interactive templates let clients confirm or reschedule in one tap, which cut booking cancellations to near zero.",
    testimonial_author: "Sarah Jenkins",
    testimonial_role: "Operations Manager",
    logo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=60",
    published: true,
    published_at: new Date().toISOString()
  }
];

async function seed() {
  console.log("Seeding marketing content database tables...");

  // Seed Blog
  const { error: blogErr } = await supabase.from("blog_posts").upsert(SEED_BLOG_POSTS, { onConflict: "slug" });
  if (blogErr) console.error("Error seeding blog_posts:", blogErr.message);
  else console.log("✓ Blog posts seeded successfully.");

  // Seed Changelog
  const { error: changeErr } = await supabase.from("changelog_entries").upsert(SEED_CHANGELOG, { onConflict: "slug" });
  if (changeErr) console.error("Error seeding changelog_entries:", changeErr.message);
  else console.log("✓ Changelog entries seeded successfully.");

  // Seed Customers
  const { error: custErr } = await supabase.from("customer_stories").upsert(SEED_CUSTOMERS, { onConflict: "slug" });
  if (custErr) console.error("Error seeding customer_stories:", custErr.message);
  else console.log("✓ Customer stories seeded successfully.");

  console.log("Seeding complete!");
}

seed();
