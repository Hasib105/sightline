import { ExternalLink } from "lucide-react";

import { ConsolePage } from "@/components/dashboard/console";
import { ScalarDocs } from "@/components/dashboard/scalar-docs";

export default function DashboardDocsPage() {
  return (
    <ConsolePage
      eyebrow="Build"
      title="Developer docs"
      description="A themed Scalar reference for the live v1-compatible API."
      actions={
        <>
          <a
            href="/api/v1/openapi-public.json"
            className="dashboard-link-button"
            target="_blank"
            rel="noreferrer"
          >
            OpenAPI JSON
            <ExternalLink className="size-3.5" />
          </a>
        </>
      }
    >
      <section className="overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)]">
        <ScalarDocs />
      </section>
    </ConsolePage>
  );
}
