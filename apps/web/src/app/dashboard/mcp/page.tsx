"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Loader2, PlugZap } from "lucide-react";

import {
  ConsolePage,
  ConsolePanel,
  DataTable,
  KeyValueList,
  StatusBadge,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, getMcpConfig, listApiKeys } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

function stringifyConfig(endpointUrl: string, rawKey: string): string {
  const token = rawKey.trim() || "<your_sightline_api_key>";
  return JSON.stringify(
    {
      mcpServers: {
        sightline: {
          transport: {
            type: "streamable_http",
            url: endpointUrl,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        },
      },
    },
    null,
    2
  );
}

export default function McpPage() {
  const [rawKey, setRawKey] = useState("");
  const [copiedValue, setCopiedValue] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const configQuery = useQuery({
    queryKey: ["mcp-config"],
    queryFn: getMcpConfig,
  });

  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const configSnippet = useMemo(() => {
    return stringifyConfig(configQuery.data?.endpoint_url ?? "/api/v1/mcp", rawKey);
  }, [configQuery.data?.endpoint_url, rawKey]);

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedValue(label);
    window.setTimeout(() => setCopiedValue(""), 2000);
  };

  return (
    <ConsolePage
      eyebrow="Build"
      title="MCP"
      description="Connect MCP clients to Sightline using the same workspace keys and credits."
      meta={<span>{keysQuery.data?.filter((key) => key.is_active).length ?? 0} active keys available</span>}
      actions={
        <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
          Connection notes
        </Button>
      }
    >
      {configQuery.isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : configQuery.error ? (
        <ConsolePanel>
          <p className="text-sm text-red-600">{(configQuery.error as ApiError).message}</p>
        </ConsolePanel>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3">
            <ConsolePanel
              title={
                <span className="flex items-center gap-2">
                  <PlugZap className="size-4 text-slate-500" />
                  Client config
                </span>
              }
              description="Paste a raw API key to preview a ready-to-use client config."
              actions={
                <Button size="xs" onClick={() => copyValue("config", configSnippet)}>
                  {copiedValue === "config" ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
                  Copy config
                </Button>
              }
              contentClassName="space-y-2"
            >
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
                <Input readOnly value={configQuery.data?.endpoint_url ?? ""} className="font-mono text-xs" />
                <Input
                  type="password"
                  value={rawKey}
                  onChange={(event) => setRawKey(event.target.value)}
                  placeholder="Paste raw API key"
                  className="font-mono"
                />
              </div>
              <pre className="h-[360px] overflow-auto rounded-md border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                <code>{configSnippet}</code>
              </pre>
            </ConsolePanel>

            <ConsolePanel title="Available tools" description="Capabilities exposed by the Sightline MCP server.">
              <DataTable chrome="compact">
                <thead>
                  <tr>
                    <th className={consoleTableHeaderCellClass}>Tool</th>
                    <th className={consoleTableHeaderCellClass}>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {(configQuery.data?.tools ?? []).map((tool) => (
                    <tr key={tool} className="hover:bg-slate-50">
                      <td className={cn(consoleTableCellClass, "font-mono text-xs text-slate-800")}>{tool}</td>
                      <td className={consoleTableCellClass}>
                        <StatusBadge label="enabled" tone="success" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </ConsolePanel>
          </div>

          <div className="grid gap-3">
            <InspectorDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              title="Connection notes"
              description="Operator view of the MCP setup."
            >
              <KeyValueList
                items={[
                  { label: "Transport", value: "Streamable HTTP" },
                  { label: "Endpoint", value: configQuery.data?.endpoint_url ?? "/api/v1/mcp" },
                  { label: "Auth", value: "Bearer token using a Sightline API key" },
                  { label: "Credit use", value: "Consumes the same balance as normal API searches" },
                ]}
              />
            </InspectorDrawer>

            <ConsolePanel title="Active API keys" description="Only prefixes are visible after creation.">
              {keysQuery.isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : keysQuery.error ? (
                <p className="text-sm text-red-600">{(keysQuery.error as ApiError).message}</p>
              ) : (
                <DataTable chrome="compact" containerClassName="max-h-[260px]">
                  <thead>
                    <tr>
                      <th className={consoleTableHeaderCellClass}>Name</th>
                      <th className={consoleTableHeaderCellClass}>Prefix</th>
                      <th className={consoleTableHeaderCellClass}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keysQuery.data?.map((key) => (
                      <tr key={key.id} className="hover:bg-slate-50">
                        <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>{key.name}</td>
                        <td className={cn(consoleTableCellClass, "font-mono text-xs text-slate-500")}>
                          {key.key_prefix}...
                        </td>
                        <td className={consoleTableCellClass}>
                          <StatusBadge label={key.is_active ? "active" : "revoked"} tone={key.is_active ? "success" : "muted"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </ConsolePanel>
          </div>
        </div>
      )}
    </ConsolePage>
  );
}
