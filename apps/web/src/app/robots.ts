import type { MetadataRoute } from "next";

import { siteBaseUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin/", "/operator/", "/login", "/register"],
      },
    ],
    host: baseUrl,
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
