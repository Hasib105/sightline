"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

import {
  ConsolePage,
  ConsolePanel,
  DataTable,
  KeyValueList,
  StatusBadge,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import { ApiError, listAdminRuntimeProxies, listAdminSessions, seedAdminSession } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

export default function AdminSessionsPage() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"seed" | "details" | null>(null);
  const [seedProvider, setSeedProvider] = useState("google");
  const [seedProxyId, setSeedProxyId] = useState("");

  const sessionsQuery = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: listAdminSessions,
  });
  const proxiesQuery = useQuery({
    queryKey: ["admin-runtime-proxies"],
    queryFn: listAdminRuntimeProxies,
  });

  const selectedSession = useMemo(() => {
    const rows = sessionsQuery.data ?? [];
    return rows.find((row) => row.id === (selectedSessionId ?? rows[0]?.id)) ?? rows[0] ?? null;
  }, [selectedSessionId, sessionsQuery.data]);

  const seedMutation = useMutation({
    mutationFn: ({ provider, proxyId }: { provider: string; proxyId?: string }) => seedAdminSession(provider, proxyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-runtime-proxies"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-provider-health"] });
    },
  });

  return (
    <ConsolePage
      eyebrow="Search infra"
      title="Sessions"
      description="Seed and inspect browser-authenticated session bundles from one table-first screen."
      actions={
        <Button variant="outline" size="sm" onClick={() => setDrawerMode("seed")}>
          <RefreshCw className="size-4" />
          Seed session
        </Button>
      }
    >
      <div className="space-y-3">
        <ConsolePanel title="Session inventory">
          {sessionsQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : sessionsQuery.error ? (
            <div className="p-3 text-sm text-red-600">{(sessionsQuery.error as ApiError).message}</div>
          ) : (
            <DataTable containerClassName="max-h-[640px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Provider</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Quality</th>
                  <th className={consoleTableHeaderCellClass}>Requests</th>
                  <th className={consoleTableHeaderCellClass}>Successes</th>
                  <th className={consoleTableHeaderCellClass}>Proxy</th>
                </tr>
              </thead>
              <tbody>
                {sessionsQuery.data?.map((session) => (
                  <tr
                    key={session.id}
                    className={cn("cursor-pointer hover:bg-slate-50", selectedSession?.id === session.id && "bg-slate-100")}
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setDrawerMode("details");
                    }}
                  >
                    <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>{session.provider}</td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge
                        label={session.status}
                        tone={session.status === "healthy" ? "success" : "warning"}
                      />
                    </td>
                    <td className={consoleTableCellClass}>{session.quality_score}</td>
                    <td className={consoleTableCellClass}>{session.request_count}</td>
                    <td className={consoleTableCellClass}>{session.success_count}</td>
                    <td className={cn(consoleTableCellClass, "text-slate-500")}>{session.proxy_id ?? "none"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </ConsolePanel>

        <InspectorDrawer
          open={drawerMode !== null}
          onOpenChange={(open) => setDrawerMode(open ? drawerMode ?? "details" : null)}
          title={drawerMode === "seed" ? "Seed session" : "Selected session"}
          description={
            drawerMode === "seed"
              ? "Create a fresh browser-authenticated session."
              : "Details for the highlighted session bundle."
          }
        >
          {drawerMode === "seed" ? (
            <>
              <DashboardSelect
                value={seedProvider}
                onValueChange={setSeedProvider}
                options={["google", "bing", "brave", "duckduckgo"].map((provider) => ({
                  value: provider,
                  label: provider,
                }))}
              />
              <DashboardSelect
                value={seedProxyId}
                onValueChange={setSeedProxyId}
                options={[
                  { value: "", label: "Auto-pick proxy" },
                  ...(proxiesQuery.data?.map((proxy) => ({
                    value: proxy.id,
                    label: `${proxy.label} (${proxy.country || "GLOBAL"})`,
                  })) ?? []),
                ]}
              />
              <Button
                onClick={() => seedMutation.mutate({ provider: seedProvider, proxyId: seedProxyId || undefined })}
                disabled={seedMutation.isPending}
                className="w-full"
              >
                {seedMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                Seed session
              </Button>
            </>
          ) : (
            <>
            {selectedSession ? (
              <KeyValueList
                items={[
                  { label: "Session id", value: selectedSession.id },
                  { label: "Seeded via", value: selectedSession.seeded_via },
                  { label: "Trusted source", value: selectedSession.trusted_source ? "Yes" : "No" },
                  { label: "Captchas", value: String(selectedSession.captcha_hits) },
                  { label: "Parse failures", value: String(selectedSession.parse_failures) },
                  { label: "Last failure", value: selectedSession.last_failure_reason ?? "None" },
                ]}
              />
            ) : (
              <div className="text-sm text-slate-500">Select a session row to inspect it here.</div>
            )}
            {seedMutation.error ? <p className="text-sm text-red-600">{(seedMutation.error as ApiError).message}</p> : null}
            </>
          )}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
