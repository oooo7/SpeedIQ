export interface IndustrySolution {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  accent: string;
  grad: string;
  capabilities: { title: string; body: string }[];
  highlights: { heading: string; body: string; bullets: string[] }[];
  faqs: { q: string; a: string }[];
}

export const INDUSTRIES: Record<string, IndustrySolution> = {
  ecommerce: {
    slug: "ecommerce",
    eyebrow: "E-Commerce",
    title: "Double your sales with *WhatsApp & Email.*",
    subtitle: "Recover 40%+ of abandoned carts, send automated order status updates, and broadcast marketing campaigns that land directly in the inbox.",
    accent: "#e11d48", // Rose-600
    grad: "linear-gradient(135deg, #be123c 0%, #e11d48 55%, #fda4af 100%)",
    capabilities: [
      {
        title: "Cart Recovery Webhooks",
        body: "Connect your Shopify or custom cart and automatically fire a WhatsApp reminder with a 1-click checkout button.",
      },
      {
        title: "Order Alerts & Shipping",
        body: "Keep customers informed with real-time order confirmation, package tracking, and delivery notices on WhatsApp.",
      },
      {
        title: "Promo broadcasts",
        body: "Run bulk marketing campaigns. Segment your list by purchase history to send highly personalized coupon codes.",
      },
      {
        title: "Quick-Reply Live Chat",
        body: "Respond to customer product questions in real time. Use canned responses to resolve questions instantly.",
      },
      {
        title: "Multi-language Support",
        body: "Localize your campaign templates. Dynamically select Spanish, Hindi, or French templates based on customer profile.",
      },
      {
        title: "Flexible Credit Billing",
        body: "Low margins? Pay 1 credit for emails and simple flat credit costs for WhatsApp. No hidden markups.",
      },
    ],
    highlights: [
      {
        heading: "Turn abandoned carts into revenue",
        body: "Typical cart abandonment emails achieve a 10% open rate. By switching to verified WhatsApp Business templates, you can send automated, rich cart reminders that yield over 45% recovery.",
        bullets: [
          "Auto-triggered reminders from cart webhooks",
          "Include dynamic discount codes and product images",
          "Rich interactive CTA buttons for instant purchase",
          "2-click checkouts directly from the phone screen",
        ],
      },
      {
        heading: "Build long-term customer relationships",
        body: "Coordinate your newsletters and promotions. Send beautiful, high-deliverability emails using your own domain via Resend, and follow up with high-impact WhatsApp announcements for VIP sales.",
        bullets: [
          "Verified sender domain support",
          "Detailed email open & bounce metrics",
          "One-click unsubscribe links automatically included",
          "Multi-channel drip automations based on subscriber tags",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I connect my Shopify store to SpeedIQ?",
        a: "Yes. You can use our webhook endpoints to automatically listen to cart events in Shopify or WooCommerce and trigger campaigns.",
      },
      {
        q: "Whose number is used for sending the updates?",
        a: "You connect your own Meta WhatsApp Business number. This ensures that your brand name and verified green badge stay yours.",
      },
    ],
  },
  "real-estate": {
    slug: "real-estate",
    eyebrow: "Real Estate",
    title: "Close deals faster with *instant alerts.*",
    subtitle: "Deliver new property listings, automate lead follow-ups, and coordinate site visits instantly on WhatsApp, Email and SMS.",
    accent: "#3b82f6", // Blue-500
    grad: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 55%, #93c5fd 100%)",
    capabilities: [
      {
        title: "Listing Alerts via SMS",
        body: "Send immediate text notifications to active buyers the second a new listing matches their filter criteria.",
      },
      {
        title: "WhatsApp Tour Scheduler",
        body: "Send tour booking confirmations with location map attachments and structured calendar add links.",
      },
      {
        title: "Dynamic Lead Ingestion",
        body: "Capture buyer leads from portal forms and organize them using automated interest tag profiles.",
      },
      {
        title: "Shared Team Inbox",
        body: "Enable multiple agents to manage customer inquiries. Assign chats and track agent response metrics.",
      },
      {
        title: "Automatic Opt-Out",
        body: "Ensure compliance with real estate texting regulations. Auto-unsubscribe buyers who reply with 'STOP'.",
      },
      {
        title: "Drip Nurture Flows",
        body: "Nurture cold buyers over weeks with weekly email digests showing market price trends and open house listings.",
      },
    ],
    highlights: [
      {
        heading: "Automate listing distributions",
        body: "Real estate is all about speed. Send listing updates automatically via SMS or WhatsApp, prompting buyers to book a viewing with a single click before the listing gets taken.",
        bullets: [
          "Trigger messages as soon as database listings update",
          "Embed deep links to virtual tours or high-res galleries",
          "Follow up via email with comprehensive brochures",
          "Maintain absolute sender reputation using verified business IDs",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the SMS numbers compliant with US carrier rules?",
        a: "Yes, we support 10DLC brand and campaign registration for all real estate outbound messaging to ensure high delivery.",
      },
    ],
  },
  education: {
    slug: "education",
    eyebrow: "Education",
    title: "Improve student *engagement & admissions.*",
    subtitle: "Send admissions updates, coordinate event reminders, and broadcast emergency announcements directly to students and parents.",
    accent: "#8b5cf6", // Violet-500
    grad: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 55%, #c4b5fd 100%)",
    capabilities: [
      {
        title: "Admissions Reminders",
        body: "Send automated alerts to applicants when application deadlines approach or document uploads are missing.",
      },
      {
        title: "Parent Notifications",
        body: "Keep parents informed with student attendance notices, progress reports, and fee schedule updates.",
      },
      {
        title: "Emergency Broadcasts",
        body: "Send instant SMS alerts to all students and staff during weather closures or campus updates.",
      },
      {
        title: "Unified Live Support",
        body: "Allow enrollment advisors to resolve applicant questions from WhatsApp and email inside a shared inbox.",
      },
      {
        title: "Custom Subscriber Fields",
        body: "Store enrollment years, course preferences, and graduation statuses to customize broadcast variables.",
      },
      {
        title: "Campaign Scheduling",
        body: "Draft course onboarding sequences and schedule them to send at optimal times based on user timezones.",
      },
    ],
    highlights: [
      {
        heading: "Boost applicant conversion rates",
        body: "Manual enrollment outreach takes too long. Automate the applicant checklist using WhatsApp campaigns to follow up on pending fees, transcript uploads, and orientation bookings.",
        bullets: [
          "Interactive buttons for parents to confirm fee schedules",
          "Integrate directly with university application forms",
          "Maintain clear communication records on the student history logs",
          "Optimize campaign success using precise deliverability reports",
        ],
      },
    ],
    faqs: [
      {
        q: "Can we segment notifications by grade or class?",
        a: "Yes. Using SpeedIQ contact tags and custom fields, you can filter your list to send target messages to specific grades or departments.",
      },
    ],
  },
  agencies: {
    slug: "agencies",
    eyebrow: "Agencies",
    title: "Manage messaging *for all your clients.*",
    subtitle: "Organize individual client numbers, coordinate custom templates, and generate comprehensive multi-channel reports from one workspace.",
    accent: "#f59e0b", // Amber-500
    grad: "linear-gradient(135deg, #d97706 0%, #f59e0b 55%, #fde68a 100%)",
    capabilities: [
      {
        title: "Multi-Client Profiles",
        body: "Configure separate WhatsApp numbers, email servers, and Twilio credentials for each brand you manage.",
      },
      {
        title: "Campaign Scheduling",
        body: "Coordinate social promotions and newsletter calendars ahead of time. Schedule launches for maximum impact.",
      },
      {
        title: "White-labeled Delivery",
        body: "Send messages using your client's own domains, WhatsApp IDs, and SMS headers to maintain client trust.",
      },
      {
        title: "Detailed Audit Logs",
        body: "Track every message sent and credit charged per project to easily bill clients for their usage volume.",
      },
      {
        title: "Client Role Isolation",
        body: "Invite client employees as 'Viewers' so they can inspect live chat replies without modifying campaign configurations.",
      },
      {
        title: "CSV Export Wizard",
        body: "Export delivery records, conversion rates, and chat logs to present to clients in monthly sync meetings.",
      },
    ],
    highlights: [
      {
        heading: "Scale client communication services",
        body: "Deliver WhatsApp marketing campaigns for local brands. Build templates, get them approved by Meta, and charge clients based on the clear, audit-proof credit logs generated automatically.",
        bullets: [
          "Manage multiple client projects under one account",
          "No per-user licensing fees—invite client teams for free",
          "Clean interface for agents to manage active support chats",
          "Verify and monitor deliverability metrics per project",
        ],
      },
    ],
    faqs: [
      {
        q: "Do my clients see each other's data?",
        a: "No. Projects in SpeedIQ are fully isolated. Client team members invited to Project A have no visibility into Project B.",
      },
    ],
  },
  healthcare: {
    slug: "healthcare",
    eyebrow: "Healthcare",
    title: "Reduce missed visits *with auto reminders.*",
    subtitle: "Automate patient appointment confirmations, send pre-visit checklists, and gather patient feedback securely.",
    accent: "#10b981", // Emerald-500
    grad: "linear-gradient(135deg, #059669 0%, #10b981 55%, #a7f3d0 100%)",
    capabilities: [
      {
        title: "Appointment Reminders",
        body: "Send auto WhatsApp messages 24 hours prior to visits. Include 'Confirm' and 'Reschedule' buttons.",
      },
      {
        title: "Pre-Visit Instructions",
        body: "Send detailed checklists, maps, and intake forms via secure PDF attachments on WhatsApp.",
      },
      {
        title: "Follow-up Feedback",
        body: "Automatically prompt patients for feedback or reviews 2 hours after their scheduled appointment time.",
      },
      {
        title: "Staff Notifications",
        body: "Send emergency alert SMS messages to practitioners regarding clinic status or schedule changes.",
      },
      {
        title: "Restricted Data Access",
        body: "Enforce security settings. Hide patient details from unauthorized viewers using team permission scopes.",
      },
      {
        title: "Timezone-aware Sends",
        body: "Schedule communications according to patient location to prevent waking patients up with late-night alerts.",
      },
    ],
    highlights: [
      {
        heading: "Eliminate empty time slots",
        body: "No-shows cost clinics thousands of dollars. Automated WhatsApp reminders allow patients to reschedule in one tap, letting you re-allocate the open slot to waitlisted patients instantly.",
        bullets: [
          "Increase attendance rates by over 50%",
          "Include links to electronic intake documents",
          "Route reschedule requests to your front-desk live chat",
          "Maintain absolute HIPAA compliance boundaries",
        ],
      },
    ],
    faqs: [
      {
        q: "Can patients text back to cancel?",
        a: "Yes. Replies are received in the Live Chat inbox, and button clicks (like 'Cancel') can trigger automated flow updates.",
      },
    ],
  },
  saas: {
    slug: "saas",
    eyebrow: "SaaS",
    title: "Increase trial *activation & retention.*",
    subtitle: "Send trial onboarding tips, automated renewal alerts, and feature updates across WhatsApp, Email and SMS.",
    accent: "#06b6d4", // Cyan-500
    grad: "linear-gradient(135deg, #0891b2 0%, #06b6d4 55%, #a5f3fc 100%)",
    capabilities: [
      {
        title: "Onboarding Sequences",
        body: "Deliver product tips via email over the trial duration. Trigger WhatsApp checks when users get stuck.",
      },
      {
        title: "Usage Milestone Alerts",
        body: "Send high-priority SMS notifications when accounts hit 80% usage limits or API quota caps.",
      },
      {
        title: "Renewal Reminders",
        body: "Alert billing owners about upcoming card charges or failed invoice retries on WhatsApp and Email.",
      },
      {
        title: "Feature Release Notes",
        body: "Send rich media templates showcasing new dashboard features and links to dynamic changelogs.",
      },
      {
        title: "Webhook Campaign Feeds",
        body: "Trigger instant user sequences when trial accounts are created, subscriptions status changes, or actions fail.",
      },
      {
        title: "Smart User Segmentation",
        body: "Filter accounts by plan types, payment currencies, and login frequencies to send targeted alerts.",
      },
    ],
    highlights: [
      {
        heading: "Actively guide trial users",
        body: "Most trial sign-ups go cold because users get confused. Guide them through your key features by sending short video tutorials on WhatsApp and coordinate longer-form email guides simultaneously.",
        bullets: [
          "Integrate directly with user authentication actions",
          "Deliver video walk-throughs in native WhatsApp chat",
          "Convert trial users with automated, dynamic discounts",
          "Track exactly which campaigns yield high subscription conversion",
        ],
      },
    ],
    faqs: [
      {
        q: "Can we connect trial events to trigger campaigns?",
        a: "Yes. You can use our webhook API to ingest event data (e.g. 'trial_signed_up') and execute target campaigns automatically.",
      },
    ],
  },
};
