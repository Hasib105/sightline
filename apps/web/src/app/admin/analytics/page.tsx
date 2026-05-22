"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Loader2 } from "lucide-react";

import {
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  DataTable,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { ApiError, getAdminAnalytics } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

export default function AdminAnalyticsPage() {
  const query = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: getAdminAnalytics,
  });

  return (
    <ConsolePage
      eyebrow="Operations"
      title="Analytics & BI"
      description="Operational and business visibility with tabular breakdowns instead of stat cards only."
    >
      {query.isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-7 animate-spin text-slate-400" />
        </div>
      ) : query.error ? (
        <ConsolePanel>
          <p className="text-sm text-red-600">{(query.error as ApiError).message}</p>
        </ConsolePanel>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {query.data?.cards.map((card) => (
              <ConsoleStat
                key={card.key}
                label={card.label}
                value={
                  <>
                    {card.value}
                    {card.unit ? <span className="ml-1 text-sm font-medium text-slate-500">{card.unit}</span> : null}
                  </>
                }
              />
            ))}
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {[
              { title: "Plan distribution", rows: query.data?.plan_distribution ?? [] },
              { title: "Provider breakdown", rows: query.data?.provider_breakdown ?? [] },
              { title: "Top failures", rows: query.data?.top_failures ?? [] },
            ].map((group) => (
              <ConsolePanel key={group.title} title={group.title}>
                <DataTable chrome="compact" containerClassName="max-h-[260px]">
                  <thead>
                    <tr>
                      <th className={consoleTableHeaderCellClass}>Label</th>
                      <th className={consoleTableHeaderCellClass}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.label} className="hover:bg-slate-50">
                        <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>{row.label}</td>
                        <td className={consoleTableCellClass}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </ConsolePanel>
            ))}
          </div>

          <ConsolePanel
            title={
              <span className="flex items-center gap-2 text-sm">
                <Activity className="size-4 text-slate-500" />
                Recent activity
              </span>
            }
          >
            <DataTable chrome="compact" containerClassName="max-h-[300px]">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Time</th>
                  <th className={consoleTableHeaderCellClass}>Category</th>
                  <th className={consoleTableHeaderCellClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {query.data?.recent_activity.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className={cn(consoleTableCellClass, "whitespace-nowrap text-xs text-slate-500")}>
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className={consoleTableCellClass}>{item.category}</td>
                    <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>
                      {item.action.replaceAll(".", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </ConsolePanel>
        </>
      )}
    </ConsolePage>
  );
}
