import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildMetadata, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Sightline | Exam video review MVP",
    description:
      "Sightline helps exam teams upload videos, analyze suspicious moments, and review evidence-backed alerts.",
    keywords: [
      "academic integrity",
      "exam video analysis",
      "invigilator dashboard",
      "teacher video upload",
      "ProcBot",
    ],
  }),
  icons: {
    icon: [
      { url: "/brand/sailor-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/sailor-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/sailor-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

const globalStructuredData = [organizationJsonLd(), websiteJsonLd()];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <StructuredData id="sightline-global-jsonld" data={globalStructuredData} />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

