"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus } from "lucide-react";

import {
  ConsolePanel,
  ConsolePage,
  DataTable,
  StatusBadge,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardSelect, DashboardSwitch } from "@/components/dashboard/form-controls";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createAdminProviderCredential,
  listAdminProviderCredentials,
  updateAdminProviderCredential,
} from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

const emptyForm = {
  provider: "workflow",
  label: "",
  secret: "",
  admin_rank: "100",
  quota_remaining: "",
  cost_weight: "100",
};

export default function ProviderCredentialsPage() {
  const queryClient = useQueryClient();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);

  const credentialsQuery = useQuery({
    queryKey: ["admin-provider-credentials"],
    queryFn: listAdminProviderCredentials,
  });

  const selectedCredential = useMemo(() => {
    const rows = credentialsQuery.data ?? [];
    return rows.find((row) => row.id === (selectedCredentialId ?? rows[0]?.id)) ?? rows[0] ?? null;
  }, [credentialsQuery.data, selectedCredentialId]);

  const createMutation = useMutation({
    mutationFn: createAdminProviderCredential,
    onSuccess: () => {
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: ["admin-provider-credentials"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ credentialId, payload }: { credentialId: string; payload: Record<string, string | number | boolean | null> }) =>
      updateAdminProviderCredential(credentialId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-provider-credentials"] });
    },
  });

  return (
    <ConsolePage
      eyebrow="Search infra"
      title="Provider credentials"
      description="Credential pool in a compact table with row-driven editing."
      actions={
        <Button variant="outline" size="sm" onClick={() => setDrawerMode("create")}>
          <Plus className="size-4" />
          Add credential
        </Button>
      }
    >
      <div className="space-y-3">
        <ConsolePanel title="Credential pool">
          {credentialsQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : credentialsQuery.error ? (
            <div className="p-3 text-sm text-red-600">{(credentialsQuery.error as ApiError).message}</div>
          ) : (
            <DataTable containerClassName="max-h-[640px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Label</th>
                  <th className={consoleTableHeaderCellClass}>Provider</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Rank</th>
                  <th className={consoleTableHeaderCellClass}>Quota</th>
                  <th className={consoleTableHeaderCellClass}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {credentialsQuery.data?.map((credential) => (
                  <tr
                    key={credential.id}
                    className={cn(
                      "cursor-pointer hover:bg-slate-50",
                      selectedCredential?.id === credential.id && "bg-slate-100"
                    )}
                    onClick={() => {
                      setSelectedCredentialId(credential.id);
                      setDrawerMode("edit");
                    }}
                  >
                    <td className={consoleTableCellClass}>
                      <div>
                        <div className="font-medium text-slate-900">{credential.label}</div>
                        <div className="text-xs text-slate-500">{credential.masked_secret}</div>
                      </div>
                    </td>
                    <td className={consoleTableCellClass}>{credential.provider}</td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge
                        label={credential.status}
                        tone={credential.status === "healthy" ? "success" : "warning"}
                      />
                    </td>
                    <td className={consoleTableCellClass}>{credential.admin_rank}</td>
                    <td className={consoleTableCellClass}>{credential.quota_remaining ?? "unlimited"}</td>
                    <td className={consoleTableCellClass}>{credential.average_latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </ConsolePanel>

        <InspectorDrawer
          open={drawerMode !== null}
          onOpenChange={(open) => setDrawerMode(open ? drawerMode ?? "edit" : null)}
          title={
            drawerMode === "create" ? (
              <span className="flex items-center gap-2">
                <Plus className="size-4 text-muted-foreground" />
                Add credential
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                Selected credential
              </span>
            )
          }
          description={drawerMode === "create" ? "Create a new external provider credential." : "Edit the highlighted credential."}
        >
          {drawerMode === "create" ? (
            <>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Provider</span>
              <DashboardSelect
                value={form.provider}
                onValueChange={(provider) => setForm((current) => ({ ...current, provider }))}
                options={["workflow", "tavily", "brave_api", "exa"].map((provider) => ({
                  value: provider,
                  label: provider,
                }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Label</span>
              <input
                className={consoleInputClass}
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Secret</span>
              <input
                className={consoleInputClass}
                value={form.secret}
                onChange={(event) => setForm((current) => ({ ...current, secret: event.target.value }))}
              />
            </label>
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
              <input
                type="number"
                className={consoleInputClass}
                value={form.admin_rank}
                onChange={(event) => setForm((current) => ({ ...current, admin_rank: event.target.value }))}
                placeholder="Rank"
              />
              <input
                type="number"
                className={consoleInputClass}
                value={form.quota_remaining}
                onChange={(event) => setForm((current) => ({ ...current, quota_remaining: event.target.value }))}
                placeholder="Quota"
              />
              <input
                type="number"
                className={consoleInputClass}
                value={form.cost_weight}
                onChange={(event) => setForm((current) => ({ ...current, cost_weight: event.target.value }))}
                placeholder="Cost weight"
              />
            </div>
            <Button
              onClick={() =>
                createMutation.mutate({
                  provider: form.provider,
                  label: form.label,
                  secret: form.secret,
                  admin_rank: Number(form.admin_rank) || 100,
                  quota_remaining: form.quota_remaining ? Number(form.quota_remaining) : null,
                  cost_weight: Number(form.cost_weight) || 100,
                })
              }
              disabled={createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              Create credential
            </Button>
            </>
          ) : (
            <>
            {selectedCredential ? (
              <>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <DashboardSwitch
                    checked={selectedCredential.enabled}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({
                        credentialId: selectedCredential.id,
                        payload: { enabled: checked },
                      })
                    }
                    aria-label="Enabled"
                  />
                  Enabled
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Status</span>
                  <DashboardSelect
                    value={selectedCredential.status}
                    onValueChange={(status) =>
                      updateMutation.mutate({
                        credentialId: selectedCredential.id,
                        payload: { status },
                      })
                    }
                    options={["healthy", "degraded", "cooldown", "disabled", "unavailable"].map((status) => ({
                      value: status,
                      label: status,
                    }))}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Rank</span>
                  <input
                    type="number"
                    className={consoleInputClass}
                    defaultValue={selectedCredential.admin_rank}
                    onBlur={(event) =>
                      updateMutation.mutate({
                        credentialId: selectedCredential.id,
                        payload: { admin_rank: Number(event.target.value) || 0 },
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Quota remaining</span>
                  <input
                    type="number"
                    className={consoleInputClass}
                    defaultValue={selectedCredential.quota_remaining ?? ""}
                    onBlur={(event) =>
                      updateMutation.mutate({
                        credentialId: selectedCredential.id,
                        payload: { quota_remaining: Number(event.target.value) || 0 },
                      })
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Cost weight</span>
                  <input
                    type="number"
                    className={consoleInputClass}
                    defaultValue={selectedCredential.cost_weight}
                    onBlur={(event) =>
                      updateMutation.mutate({
                        credentialId: selectedCredential.id,
                        payload: { cost_weight: Number(event.target.value) || 100 },
                      })
                    }
                  />
                </label>
              </>
            ) : (
              <div className="text-sm text-slate-500">Select a credential row to edit it here.</div>
            )}
            </>
          )}
            {createMutation.error ? <p className="text-sm text-red-600">{(createMutation.error as ApiError).message}</p> : null}
            {updateMutation.error ? <p className="text-sm text-red-600">{(updateMutation.error as ApiError).message}</p> : null}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
