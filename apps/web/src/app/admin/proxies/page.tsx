"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, RefreshCw } from "lucide-react";

import {
  ConsolePanel,
  ConsolePage,
  DataTable,
  KeyValueList,
  StatusBadge,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardSelect, DashboardSwitch } from "@/components/dashboard/form-controls";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import { ApiError, listAdminRuntimeProxies, syncAdminRuntimeProxies, updateAdminRuntimeProxy } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

export default function AdminProxiesPage() {
  const queryClient = useQueryClient();
  const [selectedProxyId, setSelectedProxyId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const proxiesQuery = useQuery({
    queryKey: ["admin-runtime-proxies"],
    queryFn: listAdminRuntimeProxies,
  });

  const selectedProxy = useMemo(() => {
    const rows = proxiesQuery.data ?? [];
    return rows.find((row) => row.id === (selectedProxyId ?? rows[0]?.id)) ?? rows[0] ?? null;
  }, [proxiesQuery.data, selectedProxyId]);

  const syncMutation = useMutation({
    mutationFn: syncAdminRuntimeProxies,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-runtime-proxies"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-provider-health"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ proxyId, payload }: { proxyId: string; payload: Record<string, string | number | boolean> }) =>
      updateAdminRuntimeProxy(proxyId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-runtime-proxies"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-provider-health"] });
    },
  });

  return (
    <ConsolePage
      eyebrow="Search infra"
      title="Proxies"
      description="Runtime proxy inventory with row-level diagnostics."
      actions={
        <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
          Sync inventory
        </Button>
      }
    >
      <div className="space-y-3">
        <ConsolePanel title="Runtime proxies">
          {proxiesQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : proxiesQuery.error ? (
            <div className="p-3 text-sm text-red-600">{(proxiesQuery.error as ApiError).message}</div>
          ) : (
            <DataTable containerClassName="max-h-[640px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Label</th>
                  <th className={consoleTableHeaderCellClass}>Country</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Weight</th>
                  <th className={consoleTableHeaderCellClass}>Blocks</th>
                  <th className={consoleTableHeaderCellClass}>Captchas</th>
                </tr>
              </thead>
              <tbody>
                {proxiesQuery.data?.map((proxy) => (
                  <tr
                    key={proxy.id}
                    className={cn("cursor-pointer hover:bg-slate-50", selectedProxy?.id === proxy.id && "bg-slate-100")}
                    onClick={() => {
                      setSelectedProxyId(proxy.id);
                      setDrawerOpen(true);
                    }}
                  >
                    <td className={consoleTableCellClass}>
                      <div>
                        <div className="font-medium text-slate-900">{proxy.label}</div>
                        <div className="text-xs text-slate-500">{proxy.source}</div>
                      </div>
                    </td>
                    <td className={consoleTableCellClass}>{proxy.country || "GLOBAL"}</td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge
                        label={proxy.status}
                        tone={proxy.status === "healthy" ? "success" : "warning"}
                      />
                    </td>
                    <td className={consoleTableCellClass}>{proxy.weight}</td>
                    <td className={consoleTableCellClass}>{proxy.block_count}</td>
                    <td className={consoleTableCellClass}>{proxy.captcha_count}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </ConsolePanel>

        <InspectorDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={
            <span className="flex items-center gap-2">
              <Globe className="size-4 text-slate-500" />
              Selected proxy
            </span>
          }
          description="Edit the highlighted runtime proxy."
        >
          {selectedProxy ? (
            <>
              <KeyValueList
                items={[
                  { label: "Endpoint", value: selectedProxy.endpoint },
                  { label: "Assigned session", value: selectedProxy.assigned_session_id ?? "None" },
                  { label: "Last failure", value: selectedProxy.last_failure_reason ?? "None" },
                  { label: "Cooldown", value: selectedProxy.cooldown_until ?? "Not cooling down" },
                ]}
              />
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <DashboardSwitch
                  checked={selectedProxy.enabled}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ proxyId: selectedProxy.id, payload: { enabled: checked } })
                  }
                  aria-label="Enabled"
                />
                Enabled
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Status</span>
                <DashboardSelect
                  value={selectedProxy.status}
                  onValueChange={(status) =>
                    updateMutation.mutate({ proxyId: selectedProxy.id, payload: { status } })
                  }
                  options={["healthy", "degraded", "cooldown", "disabled", "unavailable"].map((status) => ({
                    value: status,
                    label: status,
                  }))}
                />
              </label>
              <KeyValueList
                items={[
                  { label: "Successes", value: String(selectedProxy.successes) },
                  { label: "Failures", value: String(selectedProxy.failures) },
                  { label: "Parse failures", value: String(selectedProxy.parse_failures) },
                  { label: "Seed failures", value: String(selectedProxy.session_seed_failures) },
                ]}
              />
            </>
          ) : (
            <div className="text-sm text-slate-500">Select a proxy row to inspect it here.</div>
          )}
          {syncMutation.error ? <p className="text-sm text-red-600">{(syncMutation.error as ApiError).message}</p> : null}
          {updateMutation.error ? <p className="text-sm text-red-600">{(updateMutation.error as ApiError).message}</p> : null}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
