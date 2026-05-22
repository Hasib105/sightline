"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

import {
  ConsolePanel,
  ConsolePage,
  DataTable,
  FilterBar,
  KeyValueList,
  StatusBadge,
  consoleInputClass,
  consoleTextareaClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardSwitch } from "@/components/dashboard/form-controls";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  getAdminProviderRouting,
  listAdminProviderHealth,
  updateAdminProviderRouting,
} from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

export default function ProviderRoutingPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [routingDraft, setRoutingDraft] = useState<{
    inhouse_order: string;
    external_order: string;
    proxy_cooldown_seconds: string;
    proxy_block_cooldown_seconds: string;
    max_inhouse_proxies_per_request: string;
  } | null>(null);

  const routingQuery = useQuery({
    queryKey: ["admin-provider-routing"],
    queryFn: getAdminProviderRouting,
  });
  const healthQuery = useQuery({
    queryKey: ["admin-provider-health"],
    queryFn: listAdminProviderHealth,
  });

  const effectiveDraft = useMemo(() => {
    const data = routingQuery.data;
    if (!data) {
      return null;
    }
    return routingDraft ?? {
      inhouse_order: data.inhouse_order.join(", "),
      external_order: data.external_order.join(", "),
      proxy_cooldown_seconds: String(data.proxy_cooldown_seconds),
      proxy_block_cooldown_seconds: String(data.proxy_block_cooldown_seconds),
      max_inhouse_proxies_per_request: String(data.max_inhouse_proxies_per_request),
    };
  }, [routingDraft, routingQuery.data]);

  const updateMutation = useMutation({
    mutationFn: updateAdminProviderRouting,
    onSuccess: () => {
      setRoutingDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-provider-routing"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-provider-health"] });
    },
  });

  const toggleProvider = (provider: string, enabled: boolean) => {
    const current = routingQuery.data;
    if (!current) {
      return;
    }
    updateMutation.mutate({
      enabled_providers: {
        ...current.enabled_providers,
        [provider]: enabled,
      },
    });
  };

  const saveRouting = () => {
    if (!effectiveDraft) {
      return;
    }
    updateMutation.mutate({
      inhouse_order: effectiveDraft.inhouse_order.split(",").map((item) => item.trim()).filter(Boolean),
      external_order: effectiveDraft.external_order.split(",").map((item) => item.trim()).filter(Boolean),
      proxy_cooldown_seconds: Number(effectiveDraft.proxy_cooldown_seconds) || 0,
      proxy_block_cooldown_seconds: Number(effectiveDraft.proxy_block_cooldown_seconds) || 0,
      max_inhouse_proxies_per_request: Number(effectiveDraft.max_inhouse_proxies_per_request) || 1,
    });
  };

  return (
    <ConsolePage
      eyebrow="Search infra"
      title="Provider routing"
      description="Provider queue first, routing editor second."
      actions={
        <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
          <Save className="size-4" />
          Routing editor
        </Button>
      }
    >
      <div className="space-y-3">
        <ConsolePanel title="Provider readiness queue">
          <div className="p-3">
            <FilterBar className="justify-between">
              <div className="text-[11px] text-slate-500">Enable or disable providers inline, then tune routing in the inspector.</div>
              <div className="text-[11px] text-slate-500">Readiness, sessions, and proxy health stay visible in one table.</div>
            </FilterBar>
          </div>
          {healthQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : healthQuery.error ? (
            <div className="p-3 text-sm text-red-600">{(healthQuery.error as ApiError).message}</div>
          ) : (
            <DataTable containerClassName="max-h-[620px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Provider</th>
                  <th className={consoleTableHeaderCellClass}>Tier</th>
                  <th className={consoleTableHeaderCellClass}>Readiness</th>
                  <th className={consoleTableHeaderCellClass}>Credentials</th>
                  <th className={consoleTableHeaderCellClass}>Sessions</th>
                  <th className={consoleTableHeaderCellClass}>Proxies</th>
                  <th className={consoleTableHeaderCellClass}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {healthQuery.data?.map((provider) => (
                  <tr key={provider.provider} className="hover:bg-slate-50">
                    <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>{provider.provider}</td>
                    <td className={consoleTableCellClass}>{provider.tier}</td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge
                        label={provider.readiness}
                        tone={provider.readiness === "ready" ? "success" : "warning"}
                      />
                    </td>
                    <td className={consoleTableCellClass}>{provider.healthy_credentials}/{provider.credential_count}</td>
                    <td className={consoleTableCellClass}>{provider.healthy_sessions}/{provider.session_count}</td>
                    <td className={consoleTableCellClass}>{provider.healthy_proxies}/{provider.proxy_count}</td>
                    <td className={consoleTableCellClass}>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <DashboardSwitch
                          checked={provider.enabled}
                          onCheckedChange={(checked) => toggleProvider(provider.provider, checked)}
                          aria-label={`Toggle ${provider.provider}`}
                        />
                        enabled
                      </label>
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
          title="Routing editor"
          description="Fallback order and cooldown controls."
          actions={
            <Button onClick={saveRouting} size="sm" disabled={updateMutation.isPending || !effectiveDraft}>
              {updateMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save routing
            </Button>
          }
        >
          {routingQuery.isLoading || !effectiveDraft ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : routingQuery.error ? (
            <p className="text-sm text-red-600">{(routingQuery.error as ApiError).message}</p>
          ) : (
            <>
              <KeyValueList
                items={[
                  { label: "Diagnostic mode", value: routingQuery.data?.local_diagnostic_enabled ? "Enabled" : "Disabled" },
                  { label: "In-house count", value: String(routingQuery.data?.inhouse_order.length ?? 0) },
                  { label: "External count", value: String(routingQuery.data?.external_order.length ?? 0) },
                ]}
              />
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">In-house order</span>
                <textarea
                  className={consoleTextareaClass}
                  value={effectiveDraft.inhouse_order}
                  onChange={(event) =>
                    setRoutingDraft((current) => ({ ...(current ?? effectiveDraft), inhouse_order: event.target.value }))
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">External order</span>
                <textarea
                  className={consoleTextareaClass}
                  value={effectiveDraft.external_order}
                  onChange={(event) =>
                    setRoutingDraft((current) => ({ ...(current ?? effectiveDraft), external_order: event.target.value }))
                  }
                />
              </label>
              <div className="grid gap-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Proxy cooldown seconds</span>
                  <input
                    type="number"
                    className={consoleInputClass}
                    value={effectiveDraft.proxy_cooldown_seconds}
                    onChange={(event) =>
                      setRoutingDraft((current) => ({
                        ...(current ?? effectiveDraft),
                        proxy_cooldown_seconds: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Block cooldown seconds</span>
                  <input
                    type="number"
                    className={consoleInputClass}
                    value={effectiveDraft.proxy_block_cooldown_seconds}
                    onChange={(event) =>
                      setRoutingDraft((current) => ({
                        ...(current ?? effectiveDraft),
                        proxy_block_cooldown_seconds: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Max in-house proxies per request</span>
                  <input
                    type="number"
                    className={consoleInputClass}
                    value={effectiveDraft.max_inhouse_proxies_per_request}
                    onChange={(event) =>
                      setRoutingDraft((current) => ({
                        ...(current ?? effectiveDraft),
                        max_inhouse_proxies_per_request: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </>
          )}
          {updateMutation.error ? <p className="text-sm text-red-600">{(updateMutation.error as ApiError).message}</p> : null}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
