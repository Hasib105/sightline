import type { Metadata } from "next";

import { siteBaseUrl } from "@/lib/site";

const SITE_NAME = "Sightline";
const DEFAULT_SOCIAL_IMAGE = "/brand/sailor-icon-512.png";

const baseKeywords = [
  "Sightline",
  "academic integrity platform",
  "exam monitoring",
  "AI-assisted proctoring",
  "invigilator alert review",
  "student risk analytics",
  "exam schedules",
  "Django academic operations",
  "CCTV exam supervision",
];

type MetadataOptions = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  type?: "website" | "article";
  image?: string;
  noIndex?: boolean;
};

export function absoluteUrl(path = "/"): string {
  const baseUrl = siteBaseUrl();
  if (!path || path === "/") {
    return baseUrl;
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  type = "website",
  image = DEFAULT_SOCIAL_IMAGE,
  noIndex = false,
}: MetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const mergedKeywords = Array.from(new Set([...baseKeywords, ...keywords]));

  return {
    metadataBase: new URL(siteBaseUrl()),
    title,
    description,
    applicationName: SITE_NAME,
    keywords: mergedKeywords,
    alternates: {
      canonical: url,
    },
    authors: [{ name: SITE_NAME, url: absoluteUrl("/about") }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "technology",
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type,
      images: [
        {
          url: imageUrl,
          width: 512,
          height: 512,
          alt: `${SITE_NAME} brand mark`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/sailor-icon-512.png"),
    email: "operators@sightline.local",
    description:
      "Sightline is an AI-assisted academic integrity and academic operations platform.",
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description:
      "Sightline helps exam supervisors review suspicious behavior, faculty identify risk, and students track schedules.",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

export function softwareApplicationJsonLd({
  description,
  path = "/",
  featureList = [],
  offers = [],
}: {
  description: string;
  path?: string;
  featureList?: string[];
  offers?: Record<string, unknown>[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl(path),
    description,
    featureList,
    ...(offers.length > 0 ? { offers } : {}),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

export function faqPageJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function breadcrumbJsonLd(
  items: Array<{
    name: string;
    path: string;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
