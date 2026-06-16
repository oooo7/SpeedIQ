import type { Metadata } from "next";

import { Container, SectionHead } from "@/components/marketing/atoms";
import { ContactForm } from "@/components/marketing/contact-form";
import { FinalCTA } from "@/components/marketing/landing-sections";

export const metadata: Metadata = {
  title: "Contact Sales & Support — SpeedIQ",
  description:
    "Get in touch with the SpeedIQ messaging team for custom enterprise plans, pricing inquiries, compliance setup support, or request a product demo.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Sales & Support — SpeedIQ",
    description: "Get in touch with the SpeedIQ messaging team.",
    type: "website",
    url: "/contact",
    siteName: "SpeedIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Sales & Support — SpeedIQ",
    description: "Get in touch with the SpeedIQ messaging team.",
  },
};

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "name": "Contact SpeedIQ",
    "description": "Get in touch with the SpeedIQ sales and support teams.",
    "url": "https://speediq.app/contact",
    "mainEntity": {
      "@type": "Organization",
      "name": "SpeedIQ",
      "url": "https://speediq.app",
      "logo": "https://speediq.app/icon.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@speediq.app"
      }
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* HERO */}
      <section style={{ paddingTop: 88, paddingBottom: 48 }}>
        <Container>
          <SectionHead
            as="h1"
            eyebrow="CONTACT US"
            title="Get in touch with *our team.*"
            lede="Have questions about custom plans, API limits, compliance, or want a personalized demo? Drop us a line below."
            align="center"
          />
        </Container>
      </section>

      {/* FORM */}
      <ContactForm />

      <FinalCTA />
    </>
  );
}
