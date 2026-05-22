"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, Loader2, Plus, Save, Trash2 } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  DataTable,
  FilterBar,
  KeyValueList,
  StatusBadge,
  Toolbar,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
  consoleTextareaClass,
} from "@/components/dashboard/console";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createAdminModelRecord,
  deleteAdminModelRecord,
  listAdminModelRecords,
  listAdminModels,
  updateAdminModelRecord,
} from "@/lib/dashboard-api";
import { JsonValue } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatValue(value: JsonValue | undefined): string {
  if (value === undefined || value === null) {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export default function AdminModelsPage() {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [recordLimit, setRecordLimit] = useState("100");
  const [editorValue, setEditorValue] = useState("{}");
  const [parseError, setParseError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const modelsQuery = useQuery({
    queryKey: ["admin-models"],
    queryFn: listAdminModels,
  });

  const activeModel = selectedModel || modelsQuery.data?.[0]?.model || "";

  const recordsQuery = useQuery({
    queryKey: ["admin-model-records", activeModel, recordLimit],
    queryFn: () => listAdminModelRecords(activeModel, Number(recordLimit) || 100),
    enabled: Boolean(activeModel),
  });

  const activeModelInfo = useMemo(
    () => modelsQuery.data?.find((item) => item.model === activeModel) ?? null,
    [activeModel, modelsQuery.data]
  );

  const records = useMemo(() => recordsQuery.data?.records ?? [], [recordsQuery.data?.records]);

  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) {
      return null;
    }
    return records.find((record) => Number(record.id) === selectedRecordId) ?? null;
  }, [records, selectedRecordId]);

  const recordColumns = useMemo(() => {
    if (activeModelInfo?.columns.length) {
      return activeModelInfo.columns;
    }
    const firstRecord = records[0];
    return firstRecord ? Object.keys(firstRecord) : ["id"];
  }, [activeModelInfo, records]);

  const createMutation = useMutation({
    mutationFn: ({ model, data }: { model: string; data: Record<string, JsonValue> }) =>
      createAdminModelRecord(model, data),
    onSuccess: () => {
      setParseError("");
      setEditorValue("{}");
      setSelectedRecordId(null);
      void queryClient.invalidateQueries({
        queryKey: ["admin-model-records", activeModel, recordLimit],
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      model,
      recordId,
      data,
    }: {
      model: string;
      recordId: number;
      data: Record<string, JsonValue>;
    }) => updateAdminModelRecord(model, recordId, data),
    onSuccess: () => {
      setParseError("");
      void queryClient.invalidateQueries({
        queryKey: ["admin-model-records", activeModel, recordLimit],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ model, recordId }: { model: string; recordId: number }) =>
      deleteAdminModelRecord(model, recordId),
    onSuccess: () => {
      setSelectedRecordId(null);
      setEditorValue("{}");
      void queryClient.invalidateQueries({
        queryKey: ["admin-model-records", activeModel, recordLimit],
      });
    },
  });

  const saveRecord = (mode: "create" | "update") => {
    if (!activeModel) {
      return;
    }

    try {
      const parsed = JSON.parse(editorValue) as JsonValue;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setParseError("JSON payload must be an object.");
        return;
      }
      setParseError("");
      if (mode === "create") {
        createMutation.mutate({ model: activeModel, data: parsed as Record<string, JsonValue> });
        return;
      }
      if (!selectedRecordId) {
        setParseError("Select a record before updating.");
        return;
      }
      updateMutation.mutate({
        model: activeModel,
        recordId: selectedRecordId,
        data: parsed as Record<string, JsonValue>,
      });
    } catch {
      setParseError("Invalid JSON payload.");
    }
  };

  const resetForCreate = () => {
    setSelectedRecordId(null);
    setParseError("");
    setEditorValue("{}");
    setDrawerOpen(true);
  };

  return (
    <ConsolePage
      eyebrow="Admin"
      title="Model admin"
      description="Use the canonical CRUD inventory to inspect records, load one into the editor, and push controlled updates without leaving the dashboard."
      meta={
        <>
          <span>{modelsQuery.data?.length ?? 0} models available</span>
          <span>{records.length} records loaded</span>
        </>
      }
      actions={
        <Toolbar>
          <Button variant="outline" size="sm" onClick={resetForCreate} disabled={!activeModel}>
            <Plus className="mr-2 size-4" />
            New record
          </Button>
        </Toolbar>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
        <ConsolePanel
          title="Models"
          description="Switch the backing table without leaving the editor context."
          contentClassName="space-y-1.5"
        >
          {modelsQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-slate-400" />
            </div>
          ) : modelsQuery.error ? (
            <div className="text-sm text-red-600">{(modelsQuery.error as ApiError).message}</div>
          ) : (
            (modelsQuery.data ?? []).map((model) => (
              <button
                key={model.model}
                type="button"
                onClick={() => {
                  setSelectedModel(model.model);
                  setSelectedRecordId(null);
                  setEditorValue("{}");
                  setParseError("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left transition",
                  activeModel === model.model
                    ? "border-slate-900 bg-slate-100 text-slate-950"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                )}
              >
                <span className="truncate text-sm font-medium">{model.model}</span>
                <StatusBadge
                  label={model.update_enabled ? "rw" : "ro"}
                  tone={model.update_enabled ? "success" : "muted"}
                />
              </button>
            ))
          )}
        </ConsolePanel>

        <ConsolePanel
          title={activeModel || "Record inventory"}
          description="Select a row to load it into the inspector. Table headers stay pinned for longer inventories."
          contentClassName="space-y-3"
        >
          <FilterBar>
            <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
              Limit
            </label>
            <input
              className={cn(consoleInputClass, "w-20")}
              type="number"
              min={1}
              max={500}
              value={recordLimit}
              onChange={(event) => setRecordLimit(event.target.value)}
            />
            {activeModelInfo ? (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={activeModelInfo.create_enabled ? "create" : "no-create"}
                  tone={activeModelInfo.create_enabled ? "success" : "muted"}
                />
                <StatusBadge
                  label={activeModelInfo.update_enabled ? "update" : "no-update"}
                  tone={activeModelInfo.update_enabled ? "success" : "muted"}
                />
                <StatusBadge
                  label={activeModelInfo.delete_enabled ? "delete" : "no-delete"}
                  tone={activeModelInfo.delete_enabled ? "warning" : "muted"}
                />
              </div>
            ) : null}
          </FilterBar>

          {recordsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-slate-400" />
            </div>
          ) : recordsQuery.error ? (
            <div className="text-sm text-red-600">{(recordsQuery.error as ApiError).message}</div>
          ) : records.length === 0 ? (
            <ConsoleEmptyState
              title="No records loaded"
              description="This model currently has no rows, or the selected limit returned an empty slice."
              icon={Database}
            />
          ) : (
            <DataTable containerClassName="max-h-[680px]">
              <thead>
                <tr>
                  {recordColumns.map((column) => (
                    <th key={column} className={consoleTableHeaderCellClass}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const numericId = Number(record.id);
                  const isSelected =
                    selectedRecordId !== null &&
                    !Number.isNaN(numericId) &&
                    numericId === selectedRecordId;

                  return (
                    <tr
                      key={`${activeModel}-${index}`}
                      className={cn(
                        "cursor-pointer hover:bg-slate-50",
                        isSelected && "bg-slate-100"
                      )}
                      onClick={() => {
                        if (!Number.isNaN(numericId)) {
                          setSelectedRecordId(numericId);
                        }
                        setParseError("");
                        setEditorValue(JSON.stringify(record, null, 2));
                        setDrawerOpen(true);
                      }}
                    >
                      {recordColumns.map((column) => (
                        <td key={column} className={cn(consoleTableCellClass, "max-w-[220px]")}>
                          <div className="truncate font-mono text-[12px] text-slate-700">
                            {formatValue(record[column])}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </ConsolePanel>

        <InspectorDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={selectedRecordId ? `Record #${selectedRecordId}` : "Create record"}
          description={
            selectedRecordId
              ? "Edit the loaded JSON directly, then save or delete the selected record."
              : "Use the JSON editor to create a new record in the selected model."
          }
          actions={
            <Toolbar>
              <Button
                size="sm"
                onClick={() => saveRecord(selectedRecordId ? "update" : "create")}
                disabled={
                  !activeModel ||
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  (selectedRecordId ? !activeModelInfo?.update_enabled : !activeModelInfo?.create_enabled)
                }
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {selectedRecordId ? "Save" : "Create"}
              </Button>
              {selectedRecordId ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!activeModelInfo?.delete_enabled || deleteMutation.isPending}
                  onClick={() => {
                    if (!selectedRecordId) {
                      return;
                    }
                    deleteMutation.mutate({ model: activeModel, recordId: selectedRecordId });
                  }}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 size-4" />
                  )}
                  Delete
                </Button>
              ) : null}
            </Toolbar>
          }
        >
          {activeModelInfo ? (
            <KeyValueList
              items={[
                { label: "Model", value: activeModelInfo.model },
                { label: "Table", value: activeModelInfo.table },
                { label: "Columns", value: activeModelInfo.columns.join(", ") || "-" },
              ]}
            />
          ) : null}

          <textarea
            className={cn(consoleTextareaClass, "min-h-[420px] font-mono text-xs")}
            value={editorValue}
            onChange={(event) => setEditorValue(event.target.value)}
            spellCheck={false}
          />

          {selectedRecord ? (
            <div className="text-[11px] text-slate-500">
              Selected record loaded. Remove immutable fields manually if the backend rejects an update.
            </div>
          ) : null}

          {parseError ? <div className="text-sm text-red-600">{parseError}</div> : null}
          {createMutation.error ? (
            <div className="text-sm text-red-600">{(createMutation.error as ApiError).message}</div>
          ) : null}
          {updateMutation.error ? (
            <div className="text-sm text-red-600">{(updateMutation.error as ApiError).message}</div>
          ) : null}
          {deleteMutation.error ? (
            <div className="text-sm text-red-600">{(deleteMutation.error as ApiError).message}</div>
          ) : null}
        </InspectorDrawer>
      </div>
    </ConsolePage>
  );
}
