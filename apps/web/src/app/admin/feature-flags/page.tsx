"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Loader2, Plus } from "lucide-react";

import {
  ConsolePanel,
  ConsolePage,
  DataTable,
  StatusBadge,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardSwitch } from "@/components/dashboard/form-controls";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import { ApiError, listFeatureFlags, upsertFeatureFlag } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagDescription, setNewFlagDescription] = useState("");

  const flagsQuery = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: listFeatureFlags,
  });

  const mutation = useMutation({
    mutationFn: ({ key, enabled, description }: { key: string; enabled: boolean; description?: string }) =>
      upsertFeatureFlag(key, { enabled, description }),
    onSuccess: () => {
      setNewFlagKey("");
      setNewFlagDescription("");
      void queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
    },
  });

  return (
    <ConsolePage
      eyebrow="System"
      title="Feature flags"
      description="Global product toggles in a dense inventory instead of isolated cards."
      actions={
        <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
          <Plus className="size-4" />
          Create flag
        </Button>
      }
    >
      <div className="space-y-3">
        <ConsolePanel title="Global flags">
          {flagsQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : flagsQuery.error ? (
            <div className="p-3 text-sm text-red-600">{(flagsQuery.error as ApiError).message}</div>
          ) : (
            <DataTable containerClassName="max-h-[640px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Key</th>
                  <th className={consoleTableHeaderCellClass}>Description</th>
                  <th className={consoleTableHeaderCellClass}>Scope</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {flagsQuery.data?.map((flag) => (
                  <tr key={flag.key} className="hover:bg-slate-50">
                    <td className={cn(consoleTableCellClass, "font-mono text-xs text-slate-800")}>{flag.key}</td>
                    <td className={cn(consoleTableCellClass, "text-slate-500")}>{flag.description || "No description"}</td>
                    <td className={consoleTableCellClass}>{flag.scope}</td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge label={flag.enabled ? "enabled" : "disabled"} tone={flag.enabled ? "success" : "muted"} />
                    </td>
                    <td className={consoleTableCellClass}>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <DashboardSwitch
                          checked={flag.enabled}
                          onCheckedChange={(checked) =>
                            mutation.mutate({
                              key: flag.key,
                              enabled: checked,
                              description: flag.description,
                            })
                          }
                          aria-label={`Toggle ${flag.key}`}
                        />
                        toggle
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
          title={
            <span className="flex items-center gap-2">
              <Flag className="size-4 text-slate-500" />
              Create flag
            </span>
          }
          description="Add a new global toggle."
        >
          <input
            className={consoleInputClass}
            placeholder="new_flag_key"
            value={newFlagKey}
            onChange={(event) => setNewFlagKey(event.target.value)}
          />
          <input
            className={consoleInputClass}
            placeholder="What this flag controls"
            value={newFlagDescription}
            onChange={(event) => setNewFlagDescription(event.target.value)}
          />
          <Button
            onClick={() => mutation.mutate({ key: newFlagKey, enabled: true, description: newFlagDescription })}
            className="w-full"
          >
            <Plus className="mr-2 size-4" />
            Create flag
          </Button>
          {mutation.error ? <p className="text-sm text-red-600">{(mutation.error as ApiError).message}</p> : null}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
