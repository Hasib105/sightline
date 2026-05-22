"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Sliders } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePanel,
  ConsolePage,
  DataTable,
  StatusBadge,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
  consoleTextareaClass,
} from "@/components/dashboard/console";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import { ApiError, listSystemSettings, upsertSystemSetting } from "@/lib/dashboard-api";
import { JsonValue } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const [parseError, setParseError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: settings = [], isLoading, error } = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: listSystemSettings,
  });

  const selectedSetting = useMemo(() => {
    const rows = settings ?? [];
    return rows.find((setting) => setting.key === (selectedKey ?? rows[0]?.key)) ?? rows[0] ?? null;
  }, [selectedKey, settings]);

  const upsertMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: JsonValue }) => upsertSystemSetting(key, value),
    onMutate: () => {
      setParseError("");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
    },
  });

  return (
    <ConsolePage
      eyebrow="System"
      title="System settings"
      description="Select a setting from the inventory and edit its JSON in the inspector."
      meta={<span>{settings.length} settings loaded</span>}
    >
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-red-600">
          {(error as ApiError).message}
        </div>
      ) : settings.length === 0 ? (
        <ConsoleEmptyState title="No settings found" description="System settings will appear here when available." icon={Sliders} />
      ) : (
        <div className="space-y-3">
          <ConsolePanel title="Setting inventory">
            <DataTable containerClassName="max-h-[640px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Key</th>
                  <th className={consoleTableHeaderCellClass}>Updated</th>
                  <th className={consoleTableHeaderCellClass}>State</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr
                    key={setting.id}
                    className={cn(
                      "cursor-pointer hover:bg-slate-50",
                      selectedSetting?.id === setting.id && "bg-slate-100"
                    )}
                    onClick={() => {
                      setSelectedKey(setting.key);
                      setEditorValue(JSON.stringify(setting.value, null, 2));
                      setDrawerOpen(true);
                    }}
                  >
                    <td className={cn(consoleTableCellClass, "font-mono text-xs text-slate-800")}>{setting.key}</td>
                    <td className={cn(consoleTableCellClass, "text-slate-500")}>
                      {new Date(setting.updated_at).toLocaleString()}
                    </td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge label="editable" tone="muted" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </ConsolePanel>

          <InspectorDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            title="JSON editor"
            description="Blur is no longer the save trigger; save intentionally after editing."
            actions={
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedSetting || upsertMutation.isPending}
                onClick={() => {
                  if (!selectedSetting) {
                    return;
                  }
                  try {
                    const value = JSON.parse(editorValue || JSON.stringify(selectedSetting.value)) as JsonValue;
                    upsertMutation.mutate({ key: selectedSetting.key, value });
                  } catch {
                    setParseError(`Invalid JSON for "${selectedSetting.key}".`);
                  }
                }}
              >
                {upsertMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Save
              </Button>
            }
          >
            {selectedSetting ? (
              <>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{selectedSetting.key}</div>
                <textarea
                  className={cn(consoleTextareaClass, "min-h-[420px] font-mono text-xs")}
                  value={editorValue || JSON.stringify(selectedSetting.value, null, 2)}
                  onChange={(event) => setEditorValue(event.target.value)}
                />
              </>
            ) : (
              <div className="text-sm text-slate-500">Select a setting row to edit it here.</div>
            )}
            {parseError ? <p className="text-sm text-red-600">{parseError}</p> : null}
            {upsertMutation.error ? (
              <p className="text-sm text-red-600">{(upsertMutation.error as ApiError).message}</p>
            ) : null}
          </InspectorDrawer>
        </div>
      )}
    </ConsolePage>
  );
}
