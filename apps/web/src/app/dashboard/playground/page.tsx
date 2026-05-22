"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FlaskConical, Loader2, Play } from "lucide-react";

import {
  ConsolePage,
  DataTable,
  FilterBar,
  InspectorPane,
  KeyValueList,
  SectionTabs,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardSelect, DashboardSwitch } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApiError,
  getBillingSummary,
  listPlaygroundApiKeys,
  listUserSettings,
  PlaygroundSearchResult,
  runPlaygroundSearch,
} from "@/lib/dashboard-api";
import { useDashboardUiStore } from "@/lib/stores/dashboard-ui-store";
import { SearchIntelligenceResponse, SearchResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

type ResultView = "results" | "raw";

function hasOrganicResults(payload: PlaygroundSearchResult["payload"]): payload is SearchResponse {
  return Array.isArray((payload as SearchResponse).organic);
}

function hasIntelligenceResults(
  payload: PlaygroundSearchResult["payload"]
): payload is SearchIntelligenceResponse {
  return Array.isArray((payload as SearchIntelligenceResponse).results);
}

export default function PlaygroundPage() {
  const [query, setQuery] = useState("");
  const [num, setNum] = useState("10");
  const [gl, setGl] = useState("");
  const [hl, setHl] = useState("");
  const [latestResult, setLatestResult] = useState<PlaygroundSearchResult | null>(null);
  const [resultView, setResultView] = useState<ResultView>("results");
  const [engine, setEngine] = useState("sail");
  const [responseFormat, setResponseFormat] = useState("workflow");
  const [searchMode, setSearchMode] = useState("basic");
  const [compression, setCompression] = useState("");
  const [scrapeMarkdown, setScrapeMarkdown] = useState(false);
  const appliedStoredDefaultsRef = useRef(false);

  const selectedPlaygroundApiKeyId = useDashboardUiStore((state) => state.selectedPlaygroundApiKeyId);
  const setSelectedPlaygroundApiKeyId = useDashboardUiStore(
    (state) => state.setSelectedPlaygroundApiKeyId
  );
  const playgroundAsyncMode = useDashboardUiStore((state) => state.playgroundAsyncMode);
  const setPlaygroundAsyncMode = useDashboardUiStore((state) => state.setPlaygroundAsyncMode);

  const {
    data: apiKeys = [],
    isLoading: loadingKeys,
    error: apiKeysError,
  } = useQuery({
    queryKey: ["playground-api-keys"],
    queryFn: listPlaygroundApiKeys,
  });

  const { data: userSettings = [] } = useQuery({
    queryKey: ["user-settings"],
    queryFn: listUserSettings,
  });
  const { data: billingSummary } = useQuery({
    queryKey: ["billing-summary"],
    queryFn: getBillingSummary,
  });

  useEffect(() => {
    if (!selectedPlaygroundApiKeyId && apiKeys.length > 0) {
      setSelectedPlaygroundApiKeyId(apiKeys[0].id);
    }
  }, [apiKeys, selectedPlaygroundApiKeyId, setSelectedPlaygroundApiKeyId]);

  useEffect(() => {
    if (appliedStoredDefaultsRef.current || userSettings.length === 0) {
      return;
    }

    const asyncSetting = userSettings.find((entry) => entry.key === "dashboard.async_default")?.value;

    if (typeof asyncSetting === "boolean") {
      setPlaygroundAsyncMode(asyncSetting);
    }
    appliedStoredDefaultsRef.current = true;
  }, [setPlaygroundAsyncMode, userSettings]);

  const searchMutation = useMutation({
    mutationFn: runPlaygroundSearch,
    onSuccess: (result) => {
      setLatestResult(result);
      setResultView(hasOrganicResults(result.payload) ? "results" : "raw");
    },
  });

  const selectedApiKeyLabel = useMemo(() => {
    if (!selectedPlaygroundApiKeyId) {
      return "No key selected";
    }
    const found = apiKeys.find((key) => key.id === selectedPlaygroundApiKeyId);
    return found ? `${found.name} (${found.key_prefix}...)` : "No key selected";
  }, [apiKeys, selectedPlaygroundApiKeyId]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }
    const parsedNum = Number(num);

    searchMutation.mutate({
      q: trimmedQuery,
      num: Number.isFinite(parsedNum) && parsedNum > 0 ? parsedNum : 10,
      gl: gl.trim() || undefined,
      hl: hl.trim() || undefined,
      engine: billingSummary?.custom_engines_enabled ? engine : "sail",
      format: responseFormat,
      mode: searchMode,
      fetch: scrapeMarkdown ? { enabled: true, limit: 3, render_js: false } : undefined,
      scrape: scrapeMarkdown ? { enabled: true, limit: 3, render_js: false } : undefined,
      compression: compression || undefined,
      async: playgroundAsyncMode,
      api_key_id: selectedPlaygroundApiKeyId ?? undefined,
    });
  };

  const resultRows = latestResult
    ? hasOrganicResults(latestResult.payload)
      ? latestResult.payload.organic.map((row) => ({
          position: row.position,
          title: row.title,
          snippet: row.snippet,
          link: row.link,
        }))
      : hasIntelligenceResults(latestResult.payload)
        ? latestResult.payload.results.map((row) => ({
            position: row.position,
            title: row.title,
            snippet: row.snippet,
            link: row.url,
          }))
        : []
    : [];

  return (
    <ConsolePage
      eyebrow="Build"
      title="Playground"
      description="Run search requests and inspect the response without leaving the first viewport."
      meta={<span>Using {selectedApiKeyLabel}</span>}
    >
      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <InspectorPane
          title="Request"
          description="Compact request editor for live test searches."
          contentClassName="space-y-3"
        >
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="space-y-1 text-sm">
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Search query
              </span>
              <Input
                className={consoleInputClass}
                placeholder="Search query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                API key
              </span>
              <DashboardSelect
                value={selectedPlaygroundApiKeyId ? String(selectedPlaygroundApiKeyId) : ""}
                onValueChange={(value) => setSelectedPlaygroundApiKeyId(Number(value) || null)}
                disabled={loadingKeys || apiKeys.length === 0}
                placeholder="Select key"
                options={[
                  { value: "", label: "Select key" },
                  ...apiKeys.map((key) => ({
                    value: String(key.id),
                    label: `${key.name} (${key.key_prefix}...)`,
                  })),
                ]}
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <label className="space-y-1 text-sm">
                <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Results
                </span>
                <Input
                  className={consoleInputClass}
                  placeholder="10"
                  value={num}
                  onChange={(event) => setNum(event.target.value)}
                  type="number"
                  min={1}
                  max={100}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Country
                </span>
                <Input
                  className={consoleInputClass}
                  placeholder="gl"
                  value={gl}
                  onChange={(event) => setGl(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Language
                </span>
                <Input
                  className={consoleInputClass}
                  placeholder="hl"
                  value={hl}
                  onChange={(event) => setHl(event.target.value)}
                />
              </label>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <DashboardSwitch
                checked={playgroundAsyncMode}
                onCheckedChange={setPlaygroundAsyncMode}
                aria-label="Run asynchronously"
              />
              Run asynchronously
            </label>

            <div className="space-y-2 border-t border-slate-200 pt-3">
              <DashboardSelect
                value={responseFormat}
                onValueChange={setResponseFormat}
                placeholder="Response format"
                options={[
                  { value: "workflow", label: "Sightline workflow" },
                  { value: "ai", label: "AI-native" },
                ]}
              />
              <DashboardSelect
                value={searchMode}
                onValueChange={setSearchMode}
                placeholder="Search mode"
                options={[
                  { value: "basic", label: "Basic search" },
                  { value: "deep", label: "Deep search" },
                ]}
              />
              <DashboardSelect
                value={compression}
                onValueChange={setCompression}
                placeholder="Compression"
                options={[
                  { value: "", label: "No compression" },
                  { value: "compact", label: "Compact" },
                  { value: "caveman", label: "Caveman" },
                ]}
              />
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <DashboardSwitch
                  checked={scrapeMarkdown}
                  onCheckedChange={setScrapeMarkdown}
                  aria-label="Fetch Markdown for top results"
                />
                Markdown fetch
              </label>
              {billingSummary?.custom_engines_enabled ? (
                <DashboardSelect
                  value={engine}
                  onValueChange={setEngine}
                  placeholder="Sail Engine"
                  options={(billingSummary.allowed_engines.length
                    ? billingSummary.allowed_engines
                    : ["sail"]
                  ).map((item) => ({
                    value: item,
                    label: item === "sail" ? "Sail Engine" : item,
                  }))}
                />
              ) : null}
            </div>

            <Button type="submit" size="sm" disabled={searchMutation.isPending || loadingKeys} className="w-full">
              {searchMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run query
            </Button>
          </form>

          <FilterBar className="grid gap-2">
            <KeyValueList
              items={[
                { label: "Selected key", value: selectedApiKeyLabel },
                {
                  label: "Engine",
                  value: billingSummary?.custom_engines_enabled ? engine : "Sail Engine",
                },
                { label: "Format", value: responseFormat === "ai" ? "AI-native" : "Sightline workflow" },
                { label: "Mode", value: playgroundAsyncMode ? "Async job mode" : "Sync response" },
                { label: "HTTP", value: latestResult ? String(latestResult.statusCode) : "Waiting" },
              ]}
            />
          </FilterBar>

          {apiKeysError ? (
            <p className="text-sm text-red-600">{(apiKeysError as ApiError).message}</p>
          ) : null}
          {searchMutation.error ? (
            <p className="text-sm text-red-600">{(searchMutation.error as ApiError).message}</p>
          ) : null}
        </InspectorPane>

        <InspectorPane
          title={
            <span className="flex items-center gap-2">
              <FlaskConical className="size-4 text-slate-500" />
              Response
            </span>
          }
          description={latestResult ? `HTTP ${latestResult.statusCode}` : "Run a request to inspect results."}
          actions={
            <SectionTabs
              value={resultView}
              onChange={setResultView}
              options={[
                { value: "results", label: "Results" },
                { value: "raw", label: "Raw JSON" },
              ]}
            />
          }
          contentClassName="space-y-2"
        >
          <FilterBar className="justify-between">
            <div className="text-[11px] text-slate-500">
              {resultRows.length > 0
                ? `${resultRows.length} organic results loaded`
                : "No structured organic results yet"}
            </div>
            <div className="text-[11px] text-slate-500">
              Fixed-height surface for side-by-side operator use
            </div>
          </FilterBar>

          {resultView === "results" && resultRows.length > 0 ? (
            <DataTable containerClassName="h-[540px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>#</th>
                  <th className={consoleTableHeaderCellClass}>Title</th>
                  <th className={consoleTableHeaderCellClass}>Snippet</th>
                  <th className={consoleTableHeaderCellClass}>Link</th>
                </tr>
              </thead>
              <tbody>
                {resultRows.map((row) => (
                  <tr key={row.link} className="hover:bg-slate-50">
                    <td className={consoleTableCellClass}>{row.position}</td>
                    <td className={cn(consoleTableCellClass, "min-w-[260px] font-medium text-slate-900")}>
                      {row.title}
                    </td>
                    <td className={cn(consoleTableCellClass, "max-w-[360px] text-slate-500")}>
                      <div className="line-clamp-3">{row.snippet}</div>
                    </td>
                    <td className={cn(consoleTableCellClass, "min-w-[220px] text-xs text-slate-500")}>
                      <a href={row.link} target="_blank" rel="noreferrer" className="truncate text-blue-600 hover:underline">
                        {row.link}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <pre className="h-[540px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              {latestResult ? JSON.stringify(latestResult.payload, null, 2) : "{}"}
            </pre>
          )}
        </InspectorPane>
      </div>
    </ConsolePage>
  );
}
