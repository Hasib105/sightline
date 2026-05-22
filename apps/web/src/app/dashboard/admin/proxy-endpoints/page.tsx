"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Loader2, Search, Shield, TimerReset } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  DataTable,
  FilterBar,
  KeyValueList,
  StatusBadge,
  Toolbar,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { ApiError, listProxyEndpoints } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

function proxyHealthTone(health: string) {
  const normalized = health.toLowerCase();
  if (normalized === "healthy") {
    return "success" as const;
  }
  if (normalized === "unhealthy") {
    return "danger" as const;
  }
  if (normalized === "cooling" || normalized === "cooldown") {
    return "warning" as const;
  }
  return "muted" as const;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

export default function ProxyEndpointsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: endpoints = [], isLoading, error } = useQuery({
    queryKey: ["admin-proxy-endpoints"],
    queryFn: listProxyEndpoints,
  });

  const filteredEndpoints = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return endpoints;
    }
    return endpoints.filter((endpoint) =>
      [endpoint.provider, endpoint.endpoint, endpoint.country, endpoint.health]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [endpoints, search]);

  const selectedEndpoint = useMemo(() => {
    const source = filteredEndpoints.length > 0 ? filteredEndpoints : endpoints;
    if (!source.length) {
      return null;
    }
    if (selectedId === null) {
      return source[0];
    }
    return source.find((endpoint) => endpoint.id === selectedId) ?? source[0];
  }, [endpoints, filteredEndpoints, selectedId]);

  const healthyCount = endpoints.filter((endpoint) => endpoint.health === "healthy").length;
  const coolingCount = endpoints.filter((endpoint) => endpoint.cool_until).length;
  const globalCount = endpoints.filter((endpoint) => !endpoint.country).length;

  return (
    <ConsolePage
      eyebrow="Admin"
      title="Proxy endpoints"
      description="Read-only inventory for provider-linked proxy endpoints, including health, cooldown state, and metadata visibility for operator triage."
      meta={
        <>
          <span>{endpoints.length} endpoints tracked</span>
          <span>{filteredEndpoints.length} visible in current filter</span>
        </>
      }
      actions={
        <Toolbar>
          <StatusBadge label="read only" tone="muted" />
        </Toolbar>
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Healthy" value={healthyCount} description="Endpoints currently marked healthy." icon={Shield} />
        <ConsoleStat label="Cooling" value={coolingCount} description="Endpoints with an active cooldown window." icon={TimerReset} />
        <ConsoleStat label="Global" value={globalCount} description="Endpoints without a country-specific assignment." icon={Globe2} />
      </div>

      <div className="space-y-3">
        <ConsolePanel
          title="Endpoint inventory"
          description="Select a row to inspect its endpoint, cooldown, and raw metadata."
          contentClassName="space-y-3"
        >
          <FilterBar>
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className={cn(consoleInputClass, "pl-8")}
                placeholder="Search provider, country, endpoint, or health"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </FilterBar>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-600">{(error as ApiError).message}</div>
          ) : filteredEndpoints.length === 0 ? (
            <ConsoleEmptyState
              title="No endpoints found"
              description="Adjust the search filter or wait for proxy inventory to be populated."
              icon={Globe2}
            />
          ) : (
            <DataTable containerClassName="max-h-[680px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Provider</th>
                  <th className={consoleTableHeaderCellClass}>Endpoint</th>
                  <th className={consoleTableHeaderCellClass}>Country</th>
                  <th className={consoleTableHeaderCellClass}>Health</th>
                  <th className={consoleTableHeaderCellClass}>Cooldown</th>
                </tr>
              </thead>
              <tbody>
                {filteredEndpoints.map((endpoint) => (
                  <tr
                    key={endpoint.id}
                    className={cn(
                      "cursor-pointer hover:bg-slate-50",
                      selectedEndpoint?.id === endpoint.id && "bg-slate-100"
                    )}
                    onClick={() => {
                      setSelectedId(endpoint.id);
                      setDrawerOpen(true);
                    }}
                  >
                    <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>
                      {endpoint.provider}
                    </td>
                    <td className={consoleTableCellClass}>
                      <div className="max-w-[360px] truncate font-mono text-[12px] text-slate-700">
                        {endpoint.endpoint}
                      </div>
                    </td>
                    <td className={consoleTableCellClass}>
                      {endpoint.country ? (
                        <StatusBadge label={endpoint.country} tone="muted" />
                      ) : (
                        <StatusBadge label="global" tone="muted" />
                      )}
                    </td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge
                        label={endpoint.health}
                        tone={proxyHealthTone(endpoint.health)}
                      />
                    </td>
                    <td className={cn(consoleTableCellClass, "text-slate-500")}>
                      {formatTimestamp(endpoint.cool_until)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </ConsolePanel>

        <InspectorDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={selectedEndpoint ? `${selectedEndpoint.provider} endpoint` : "Endpoint details"}
          description="This surface is intentionally read-only until canonical write APIs are available."
        >
          {selectedEndpoint ? (
            <>
              <KeyValueList
                items={[
                  { label: "Provider", value: selectedEndpoint.provider },
                  { label: "Country", value: selectedEndpoint.country || "GLOBAL" },
                  {
                    label: "Health",
                    value: (
                      <StatusBadge
                        label={selectedEndpoint.health}
                        tone={proxyHealthTone(selectedEndpoint.health)}
                      />
                    ),
                  },
                  { label: "Endpoint", value: <code>{selectedEndpoint.endpoint}</code> },
                  { label: "Created", value: formatTimestamp(selectedEndpoint.created_at) },
                  { label: "Updated", value: formatTimestamp(selectedEndpoint.updated_at) },
                  { label: "Cooldown", value: formatTimestamp(selectedEndpoint.cool_until) },
                ]}
              />
              <div className="space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Metadata
                </div>
                <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(selectedEndpoint.metadata, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">Select an endpoint row to inspect it here.</div>
          )}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
