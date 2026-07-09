"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Loader2, Users } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import {
  ApiError,
  getFeatureImportance,
  getRiskHeatmap,
  getRiskRanking,
} from "@/lib/dashboard-api";
import type { StudentRiskScore } from "@/lib/types";

function riskTone(level: StudentRiskScore["risk_level"]) {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "success";
}

function heatCell(count: number, total: number) {
  const ratio = total > 0 ? count / total : 0;
  // ponytail: inline HSL heat instead of a color scale lib.
  const alpha = 0.15 + ratio * 0.75;
  return `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
}

export default function StudentAnalyticsPage() {
  const [level, setLevel] = useState<string>("");

  const heatmapQuery = useQuery({ queryKey: ["risk-heatmap"], queryFn: getRiskHeatmap });
  const importanceQuery = useQuery({ queryKey: ["feature-importance"], queryFn: () => getFeatureImportance() });
  const rankingQuery = useQuery({
    queryKey: ["risk-ranking", level],
    queryFn: () => getRiskRanking(level ? { level } : {}),
  });

  const departments = heatmapQuery.data?.departments ?? [];
  const importance = importanceQuery.data;
  const ranking = useMemo(() => rankingQuery.data ?? [], [rankingQuery.data]);
  const maxWeight = Math.max(0.0001, ...(importance?.features.map((f) => f.weight) ?? [0]));

  const highRisk = ranking.filter((score) => score.risk_level === "high").length;
  const loading = heatmapQuery.isLoading || importanceQuery.isLoading || rankingQuery.isLoading;
  const error = heatmapQuery.error ?? importanceQuery.error ?? rankingQuery.error;

  return (
    <ConsolePage
      eyebrow="Faculty"
      title="Student analytics"
      description="ML failure prediction: department risk heatmap, feature importance, and student ranking by risk."
      meta={importance ? <span>{importance.model}</span> : null}
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Students scored" value={ranking.length} description="Latest run per course" icon={Users} />
        <ConsoleStat label="High risk" value={highRisk} description="Need early intervention" icon={AlertTriangle} />
        <ConsoleStat label="Departments" value={departments.length} description="With risk data" icon={BarChart3} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          <ConsolePanel title="Department risk heatmap" description="Risk mix per department." contentClassName="space-y-2">
            {departments.length === 0 ? (
              <ConsoleEmptyState title="No risk data" description="Run risk analysis to populate the heatmap." icon={BarChart3} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1 pr-3">Department</th>
                      <th className="py-1 pr-3">High</th>
                      <th className="py-1 pr-3">Medium</th>
                      <th className="py-1 pr-3">Low</th>
                      <th className="py-1 pr-3">Avg risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((row) => (
                      <tr key={row.department} className="border-t border-[var(--dashboard-border)]">
                        <td className="py-1.5 pr-3 font-semibold text-foreground">{row.department}</td>
                        {(["high", "medium", "low"] as const).map((key) => (
                          <td key={key} className="py-1.5 pr-3">
                            <span
                              className="inline-flex min-w-7 justify-center rounded px-1.5 py-0.5 text-foreground"
                              style={{ backgroundColor: heatCell(row[key], row.count) }}
                            >
                              {row[key]}
                            </span>
                          </td>
                        ))}
                        <td className="py-1.5 pr-3 font-mono">{row.avgRisk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConsolePanel>

          <ConsolePanel title="Feature importance" description="What the model weighs most." contentClassName="space-y-2">
            {!importance || importance.features.length === 0 ? (
              <ConsoleEmptyState title="No model yet" description="Feature importance appears after the first run." icon={BarChart3} />
            ) : (
              importance.features.map((feature) => (
                <div key={feature.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground">{feature.label}</span>
                    <span className="font-mono text-muted-foreground">{(feature.weight * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded bg-[var(--dashboard-panel-muted)]">
                    <div
                      className="h-2 rounded bg-blue-500"
                      style={{ width: `${(feature.weight / maxWeight) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </ConsolePanel>

          <ConsolePanel
            title="Student ranking by risk"
            description="Highest risk first. Click a student for detail."
            className="xl:col-span-2"
            contentClassName="space-y-2"
            actions={
              <div className="w-40">
                <DashboardSelect
                  value={level}
                  onValueChange={setLevel}
                  options={[
                    { value: "", label: "All levels" },
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                  placeholder="Filter by risk"
                />
              </div>
            }
          >
            {ranking.length === 0 ? (
              <ConsoleEmptyState title="No students" description="No risk scores match this filter." icon={Users} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1 pr-3">#</th>
                      <th className="py-1 pr-3">Student</th>
                      <th className="py-1 pr-3">Course</th>
                      <th className="py-1 pr-3">Score</th>
                      <th className="py-1 pr-3">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((score, index) => (
                      <tr key={score.id} className="border-t border-[var(--dashboard-border)] hover:bg-[var(--dashboard-panel-muted)]">
                        <td className="py-1.5 pr-3 font-mono text-muted-foreground">{index + 1}</td>
                        <td className="py-1.5 pr-3">
                          <Link href={`/dashboard/teacher/analytics/${score.student}`} className="font-semibold text-foreground hover:underline">
                            {score.student_name}
                          </Link>
                          <span className="ml-1 text-muted-foreground">{score.student_number}</span>
                        </td>
                        <td className="py-1.5 pr-3">{score.course_code}</td>
                        <td className="py-1.5 pr-3 font-mono">{score.risk_score}/100</td>
                        <td className="py-1.5 pr-3">
                          <StatusBadge label={score.risk_level} tone={riskTone(score.risk_level)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
