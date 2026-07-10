"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Download, Loader2, PlayCircle, Trash2, Upload, Users } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  getFeatureImportance,
  getRiskHeatmap,
  getRiskRanking,
  listAcademicImports,
  listCourses,
  resetRiskAnalysis,
  runAtRiskAnalysis,
} from "@/lib/dashboard-api";
import { readRiskCsvFile } from "@/lib/risk-csv";
import { RISK_SAMPLE_CSVS } from "@/lib/risk-samples";
import type { AtRiskInputRow, StudentRiskScore } from "@/lib/types";

function riskTone(level: StudentRiskScore["risk_level"]) {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "success";
}

function heatCell(count: number, total: number) {
  const ratio = total > 0 ? count / total : 0;
  const alpha = 0.15 + ratio * 0.75;
  return `rgba(239, 68, 68, ${alpha.toFixed(2)})`;
}

export default function StudentAnalyticsPage() {
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<string>("");
  const [inputMode, setInputMode] = useState<"upload" | "existing">("upload");
  const [selectedImportId, setSelectedImportId] = useState<string>("");
  const [csvRows, setCsvRows] = useState<AtRiskInputRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [selectedCourseIdState, setSelectedCourseId] = useState<number | null>(null);

  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const selectedCourseId = selectedCourseIdState ?? courses[0]?.id ?? null;
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: `${course.code} · ${course.title}`,
  }));

  const importsQuery = useQuery({
    queryKey: ["academic-imports", selectedCourseId],
    queryFn: () => listAcademicImports(selectedCourseId ?? undefined),
    enabled: Boolean(selectedCourseId),
  });
  const imports = useMemo(() => importsQuery.data ?? [], [importsQuery.data]);

  const heatmapQuery = useQuery({ queryKey: ["risk-heatmap"], queryFn: getRiskHeatmap });
  const importanceQuery = useQuery({
    queryKey: ["feature-importance", selectedCourseId],
    queryFn: () => getFeatureImportance(selectedCourseId ?? undefined),
    enabled: Boolean(selectedCourseId),
  });
  const rankingQuery = useQuery({
    queryKey: ["risk-ranking", level, selectedCourseId],
    queryFn: () =>
      getRiskRanking({
        ...(level ? { level } : {}),
        ...(selectedCourseId ? { course: selectedCourseId } : {}),
      }),
    enabled: Boolean(selectedCourseId),
  });

  const importOptions = imports.map((item) => ({
    value: String(item.id),
    label: `${item.source_name} (${item.imported_rows} rows · ${new Date(item.created_at).toLocaleDateString()})`,
  }));

  const departments = heatmapQuery.data?.departments ?? [];
  const importance = importanceQuery.data;
  const ranking = useMemo(() => rankingQuery.data ?? [], [rankingQuery.data]);
  const maxWeight = Math.max(0.0001, ...(importance?.features.map((f) => f.weight) ?? [0]));
  const highRisk = ranking.filter((score) => score.risk_level === "high").length;
  const canClearCourseData = ranking.length > 0 || imports.length > 0 || csvRows.length > 0;
  const loading = heatmapQuery.isLoading || importanceQuery.isLoading || rankingQuery.isLoading;
  const error = heatmapQuery.error ?? importanceQuery.error ?? rankingQuery.error;

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) {
        throw new Error("Select a course first.");
      }
      if (inputMode === "existing") {
        if (!selectedImportId) {
          throw new Error("Select an existing import.");
        }
        return runAtRiskAnalysis({ course: selectedCourseId, import_id: Number(selectedImportId) });
      }
      if (csvRows.length === 0) {
        throw new Error("Upload a CSV file with student rows.");
      }
      return runAtRiskAnalysis({
        course: selectedCourseId,
        source_name: csvFileName || "teacher-upload.csv",
        rows: csvRows,
      });
    },
    onSuccess: async (result) => {
      setRunMessage(`Analysis complete — ${result.scores.length} students scored for ${result.course_code ?? "your course"}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["risk-heatmap"] }),
        queryClient.invalidateQueries({ queryKey: ["feature-importance"] }),
        queryClient.invalidateQueries({ queryKey: ["risk-ranking"] }),
        queryClient.invalidateQueries({ queryKey: ["academic-imports"] }),
        queryClient.invalidateQueries({ queryKey: ["at-risk"] }),
      ]);
    },
    onError: (mutationError) => {
      setRunMessage(mutationError instanceof Error ? mutationError.message : "Unable to run analysis.");
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!selectedCourseId) {
        throw new Error("Select a course first.");
      }
      return resetRiskAnalysis(selectedCourseId);
    },
    onSuccess: async (result) => {
      setRunMessage(result.message);
      setCsvRows([]);
      setCsvFileName("");
      setSelectedImportId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["risk-heatmap"] }),
        queryClient.invalidateQueries({ queryKey: ["feature-importance"] }),
        queryClient.invalidateQueries({ queryKey: ["risk-ranking"] }),
        queryClient.invalidateQueries({ queryKey: ["academic-imports"] }),
        queryClient.invalidateQueries({ queryKey: ["at-risk"] }),
      ]);
    },
    onError: (mutationError) => {
      setRunMessage(mutationError instanceof Error ? mutationError.message : "Unable to clear risk data.");
    },
  });

  async function handleCsvUpload(file: File | null) {
    if (!file) {
      return;
    }
    try {
      const parsed = await readRiskCsvFile(file);
      setCsvRows(parsed.rows);
      setCsvFileName(parsed.sourceName);
      setRunMessage(`${parsed.rows.length} students loaded from ${parsed.sourceName}.`);
    } catch (uploadError) {
      setCsvRows([]);
      setCsvFileName("");
      setRunMessage(uploadError instanceof Error ? uploadError.message : "Invalid CSV file.");
    }
  }

  return (
    <ConsolePage
      eyebrow="Faculty"
      title="Student analytics"
      description="Select a course, upload CSV or reuse a saved import, then review ML risk rankings."
      meta={selectedCourse ? <span>{selectedCourse.code} · {selectedCourse.title}</span> : importance ? <span>{importance.model}</span> : null}
    >
      <ConsolePanel
        title="Run risk analysis"
        description={selectedCourse ? `Active course: ${selectedCourse.code}` : "Select a course to begin."}
        contentClassName="space-y-3"
      >
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Course</label>
          <DashboardSelect
            value={selectedCourseId ? String(selectedCourseId) : ""}
            onValueChange={(value) => {
              setSelectedCourseId(Number(value));
              setSelectedImportId("");
              setCsvRows([]);
              setCsvFileName("");
            }}
            options={courseOptions}
            placeholder="Select a course"
            disabled={courseOptions.length === 0}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={inputMode === "upload" ? "default" : "outline"} onClick={() => setInputMode("upload")}>
            <Upload className="size-3.5" />
            Upload CSV
          </Button>
          <Button size="sm" variant={inputMode === "existing" ? "default" : "outline"} onClick={() => setInputMode("existing")}>
            Use saved import
          </Button>
        </div>

        {inputMode === "upload" ? (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">CSV file</label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-[var(--dashboard-border)] file:bg-card file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              onChange={(event) => void handleCsvUpload(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Format: student_number, attended, total, score, max_score
              {csvRows.length > 0 ? ` · ${csvRows.length} rows ready` : ""}
            </p>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sample CSVs (35 students each)</p>
              <div className="flex flex-wrap gap-2">
                {RISK_SAMPLE_CSVS.map((sample) => (
                  <a
                    key={sample.href}
                    href={sample.href}
                    download
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-2 py-1 text-xs text-foreground hover:bg-[var(--dashboard-accent-soft)]"
                  >
                    <Download className="size-3" />
                    {sample.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Saved import</label>
            <DashboardSelect
              value={selectedImportId}
              onValueChange={setSelectedImportId}
              options={importOptions}
              placeholder={importsQuery.isLoading ? "Loading imports..." : "Select a prior upload"}
              disabled={importOptions.length === 0}
            />
            {importOptions.length === 0 && !importsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">No saved imports yet. Upload a CSV first.</p>
            ) : null}
          </div>
        )}

        {runMessage ? (
          <p
            className={`text-xs ${
              runMessage.toLowerCase().includes("unable") ||
              runMessage.toLowerCase().includes("invalid") ||
              runMessage.toLowerCase().includes("mvp endpoint") ||
              runMessage.toLowerCase().includes("select ")
                ? "text-red-600"
                : "text-muted-foreground"
            }`}
          >
            {runMessage}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => runMutation.mutate()} disabled={runMutation.isPending || !selectedCourseId}>
            {runMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
            Run analysis
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending || !selectedCourseId || !canClearCourseData}
          >
            {resetMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Clear & re-upload
          </Button>
        </div>
      </ConsolePanel>

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
