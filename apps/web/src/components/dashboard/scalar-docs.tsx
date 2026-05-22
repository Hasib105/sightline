"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import "@scalar/api-reference-react/style.css";

type OpenApiDocument = Record<string, unknown>;

function useEffectiveTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function ScalarDocs({
  openApiPath = "/api/v1/openapi-public.json",
  docsPath = "/api/v1/openapi-public.json",
}: {
  openApiPath?: string;
  docsPath?: string;
}) {
  const theme = useEffectiveTheme();
  const [document, setDocument] = useState<OpenApiDocument | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(openApiPath, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`OpenAPI request failed with HTTP ${response.status}`);
        }
        return (await response.json()) as OpenApiDocument;
      })
      .then((payload) => setDocument(payload))
      .catch((fetchError: unknown) => {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : "OpenAPI document could not be loaded.");
        }
      });

    return () => controller.abort();
  }, [openApiPath]);

  if (error) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="inline-flex size-10 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] text-amber-500">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">API reference could not load</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <a href={openApiPath} className="dashboard-link-button" target="_blank" rel="noreferrer">
            OpenAPI JSON
          </a>
          <a href={docsPath} className="dashboard-link-button" target="_blank" rel="noreferrer">
            API docs
          </a>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-[420px] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-[var(--dashboard-accent)]" />
        Loading API reference...
      </div>
    );
  }

  return (
    <div className="sightline-scalar-reference" key={theme}>
      <ApiReferenceReact
        configuration={{
          content: document,
          theme: "none",
          layout: "modern",
          showSidebar: true,
          hideClientButton: true,
          darkMode: theme === "dark",
          withDefaultFonts: false,
          operationTitleSource: "summary",
          agent: { disabled: true },
        }}
      />
    </div>
  );
}
