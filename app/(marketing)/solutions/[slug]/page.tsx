import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import {
  ShoppingBag,
  Home,
  GraduationCap,
  Briefcase,
  Activity,
  Cpu,
} from "lucide-react";

import { FeaturePageLayout } from "@/components/marketing/feature-page-layout";
import { INDUSTRIES } from "../solutions-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(INDUSTRIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = INDUSTRIES[slug];
  if (!industry) return {};

  return {
    title: `${industry.eyebrow} Solutions — SpeedIQ`,
    description: industry.subtitle,
    alternates: { canonical: `/solutions/${slug}` },
    openGraph: {
      title: `${industry.eyebrow} Solutions — SpeedIQ`,
      description: industry.subtitle,
      type: "website",
      url: `/solutions/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${industry.eyebrow} Solutions — SpeedIQ`,
      description: industry.subtitle,
    },
  };
}

function getIcon(slug: string) {
  const size = 26;
  const color = "#fff";
  switch (slug) {
    case "ecommerce":
      return <ShoppingBag size={size} color={color} />;
    case "real-estate":
      return <Home size={size} color={color} />;
    case "education":
      return <GraduationCap size={size} color={color} />;
    case "agencies":
      return <Briefcase size={size} color={color} />;
    case "healthcare":
      return <Activity size={size} color={color} />;
    case "saas":
      return <Cpu size={size} color={color} />;
    default:
      return <Cpu size={size} color={color} />;
  }
}

export default async function SolutionDetailsPage({ params }: Props) {
  const { slug } = await params;
  const industry = INDUSTRIES[slug];
  if (!industry) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${industry.eyebrow} Solutions - SpeedIQ`,
    "description": industry.subtitle,
    "url": `https://speediq.app/solutions/${slug}`
  };

  return (
    <>
      <Script
        id={`jsonld-solutions-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FeaturePageLayout
        slug={slug}
        eyebrow={industry.eyebrow}
        title={industry.title}
        subtitle={industry.subtitle}
        accent={industry.accent}
        grad={industry.grad}
        icon={getIcon(slug)}
        capabilities={industry.capabilities}
        highlights={industry.highlights}
        faqs={industry.faqs}
      />
    </>
  );
}
