"use client";

import { useQuery } from "@tanstack/react-query";
import { FileSearch, Loader2 } from "lucide-react";

import {
  ConsolePage,
  ConsolePanel,
  DataTable,
  EmptyTableState,
  FilterBar,
  StatusBadge,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { DashboardCheckbox } from "@/components/dashboard/form-controls";
import { Input } from "@/components/ui/input";
import { ApiError, listLogs } from "@/lib/dashboard-api";
import { useDashboardUiStore } from "@/lib/stores/dashboard-ui-store";
import { cn } from "@/lib/utils";

function logTone(status: string) {
  if (status === "success" || status === "ok") {
    return "success";
  }
  if (status === "warning" || status === "degraded") {
    return "warning";
  }
  if (status === "error" || status === "failed") {
    return "danger";
  }
  return "muted";
}

export default function LogsPage() {
  const logsCategory = useDashboardUiStore((state) => state.logsCategory);
  const includeAllUsersLogs = useDashboardUiStore((state) => state.includeAllUsersLogs);
  const setLogsCategory = useDashboardUiStore((state) => state.setLogsCategory);
  const setIncludeAllUsersLogs = useDashboardUiStore((state) => state.setIncludeAllUsersLogs);

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["logs", logsCategory, includeAllUsersLogs],
    queryFn: () =>
      listLogs({
        category: logsCategory || undefined,
        includeAllUsers: includeAllUsersLogs,
        limit: 200,
      }),
  });

  return (
    <ConsolePage
      eyebrow="Account"
      title="Logs"
      description="Audit events from API keys, playground, MCP, and admin actions."
      meta={<span>{logs.length} rows loaded</span>}
    >
      <ConsolePanel title="Audit trail" description="Filter and scan recent events." contentClassName="space-y-2">
        <FilterBar className="grid gap-2 md:grid-cols-[minmax(0,260px)_auto_1fr]">
          <Input
            placeholder="Filter category: api_keys, playground, admin"
            value={logsCategory}
            onChange={(event) => setLogsCategory(event.target.value)}
          />
          <label className="inline-flex h-7 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-600">
            <DashboardCheckbox
              checked={includeAllUsersLogs}
              onCheckedChange={setIncludeAllUsersLogs}
              aria-label="Include all users"
            />
            Include all users
          </label>
          <div className="self-center justify-self-end text-[11px] text-slate-500">
            Sticky headers enabled for dense review
          </div>
        </FilterBar>

        {isLoading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{(error as ApiError).message}</p>
        ) : logs.length === 0 ? (
          <EmptyTableState
            title="No logs found"
            description="Try clearing the category filter or enabling all-user view if you are an admin."
            icon={FileSearch}
          />
        ) : (
          <DataTable containerClassName="max-h-[560px]">
            <thead>
              <tr>
                <th className={consoleTableHeaderCellClass}>Time</th>
                <th className={consoleTableHeaderCellClass}>Category</th>
                <th className={consoleTableHeaderCellClass}>Action</th>
                <th className={consoleTableHeaderCellClass}>Status</th>
                <th className={consoleTableHeaderCellClass}>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className={consoleTableCellClass}>
                    <div className="whitespace-nowrap text-xs text-slate-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className={cn(consoleTableCellClass, "font-medium text-slate-800")}>{entry.category}</td>
                  <td className={cn(consoleTableCellClass, "text-slate-800")}>{entry.action}</td>
                  <td className={consoleTableCellClass}>
                    <StatusBadge label={entry.status} tone={logTone(entry.status)} />
                  </td>
                  <td className={cn(consoleTableCellClass, "max-w-[480px] text-slate-500")}>
                    <div className="truncate" title={entry.message || "-"}>
                      {entry.message || "-"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </ConsolePanel>
    </ConsolePage>
  );
}
