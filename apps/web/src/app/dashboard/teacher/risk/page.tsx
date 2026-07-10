"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Loader2, PlayCircle, Trash2, Upload } from "lucide-react";

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
  listAcademicImports,
  listAtRiskScores,
  listCourses,
  listEnrollments,
  resetRiskAnalysis,
  runAtRiskAnalysis,
} from "@/lib/dashboard-api";
import { readRiskCsvFile } from "@/lib/risk-csv";
import { RISK_SAMPLE_CSVS } from "@/lib/risk-samples";
import type { AtRiskInputRow, StudentRiskScore } from "@/lib/types";

function riskTone(level: StudentRiskScore["risk_level"]) {
  if (level === "high") {
    return "danger";
  }
  if (level === "medium") {
    return "warning";
  }
  return "success";
}

export default function TeacherRiskPage() {
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const enrollmentsQuery = useQuery({ queryKey: ["enrollments"], queryFn: listEnrollments });
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);

  const [selectedCourseIdState, setSelectedCourseId] = useState<number | null>(null);
  const selectedCourseId = selectedCourseIdState ?? courses[0]?.id ?? null;
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );

  const scoresQuery = useQuery({
    queryKey: ["at-risk", selectedCourseId],
    queryFn: () => listAtRiskScores(selectedCourseId ?? undefined),
    enabled: Boolean(selectedCourseId),
  });
  const scores = useMemo(() => scoresQuery.data ?? [], [scoresQuery.data]);

  const [inputMode, setInputMode] = useState<"upload" | "existing">("upload");
  const [selectedImportId, setSelectedImportId] = useState<string>("");
  const [csvRows, setCsvRows] = useState<AtRiskInputRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const importsQuery = useQuery({
    queryKey: ["academic-imports", selectedCourseId],
    queryFn: () => listAcademicImports(selectedCourseId ?? undefined),
    enabled: Boolean(selectedCourseId),
  });
  const imports = useMemo(() => importsQuery.data ?? [], [importsQuery.data]);

  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: `${course.code} · ${course.title}`,
  }));
  const importOptions = imports.map((item) => ({
    value: String(item.id),
    label: `${item.source_name} (${item.imported_rows} rows)`,
  }));
  const courseEnrollments = enrollments.filter((item) => item.course === selectedCourseId);
  const highRiskCount = scores.filter((score) => score.risk_level === "high").length;
  const canClearCourseData = scores.length > 0 || imports.length > 0 || csvRows.length > 0;
  const loading = coursesQuery.isLoading || enrollmentsQuery.isLoading || scoresQuery.isLoading;
  const error = coursesQuery.error ?? enrollmentsQuery.error ?? scoresQuery.error;

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
      setMessage(`Risk analysis completed for ${result.scores.length} students.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["at-risk"] }),
        queryClient.invalidateQueries({ queryKey: ["academic-imports"] }),
        queryClient.invalidateQueries({ queryKey: ["risk-ranking"] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : "Unable to run risk analysis.");
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
      setMessage(result.message);
      setCsvRows([]);
      setCsvFileName("");
      setSelectedImportId("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["at-risk"] }),
        queryClient.invalidateQueries({ queryKey: ["academic-imports"] }),
        queryClient.invalidateQueries({ queryKey: ["risk-ranking"] }),
      ]);
    },
    onError: (mutationError) => {
      setMessage(mutationError instanceof Error ? mutationError.message : "Unable to clear risk data.");
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
      setMessage(`${parsed.rows.length} students loaded from ${parsed.sourceName}.`);
    } catch (uploadError) {
      setCsvRows([]);
      setCsvFileName("");
      setMessage(uploadError instanceof Error ? uploadError.message : "Invalid CSV file.");
    }
  }

  return (
    <ConsolePage
      eyebrow="Teacher"
      title="At-risk students"
      description="Select a course, upload CSV or clear results to run fresh analysis."
      meta={
        selectedCourse ? (
          <>
            <span>{selectedCourse.code}</span>
            <span>{scores.length} risk outputs</span>
          </>
        ) : null
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Students" value={courseEnrollments.length} description="Enrolled in this course" />
        <ConsoleStat label="Risk outputs" value={scores.length} description={`Saved for ${selectedCourse?.code ?? "course"}`} />
        <ConsoleStat label="High risk" value={highRiskCount} description="Needs early intervention review" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.5fr)]">
          <ConsolePanel title="Risk outputs" description={selectedCourse ? `Scores for ${selectedCourse.code}.` : "Select a course."} contentClassName="space-y-2">
            {scores.length === 0 ? (
              <ConsoleEmptyState
                title="No risk data yet"
                description="Upload a CSV and run analysis to generate scores."
                icon={AlertTriangle}
              />
            ) : (
              scores.map((score) => (
                <div key={score.id} className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">{score.student_name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {score.student_number} · Score {score.risk_score}/100
                      </p>
                    </div>
                    <StatusBadge label={score.risk_level} tone={riskTone(score.risk_level)} />
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {score.contributing_factors.map((factor, index) => (
                      <li key={`${score.id}-${index}`}>{String(factor)}</li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </ConsolePanel>

          <ConsolePanel
            title="Run analysis"
            description={selectedCourse ? `Course: ${selectedCourse.code}` : "Select a course first."}
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
            <div className="flex gap-2">
              <Button size="sm" variant={inputMode === "upload" ? "default" : "outline"} onClick={() => setInputMode("upload")}>
                <Upload className="size-3.5" />
                Upload CSV
              </Button>
              <Button size="sm" variant={inputMode === "existing" ? "default" : "outline"} onClick={() => setInputMode("existing")}>
                Use saved
              </Button>
            </div>
            {inputMode === "upload" ? (
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-[var(--dashboard-border)] file:bg-card file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                  onChange={(event) => void handleCsvUpload(event.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  student_number, attended, total, score, max_score
                  {csvRows.length > 0 ? ` · ${csvRows.length} rows ready` : ""}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RISK_SAMPLE_CSVS.map((sample) => (
                    <a
                      key={sample.href}
                      href={sample.href}
                      download
                      className="inline-flex items-center gap-1 rounded border border-[var(--dashboard-border)] px-1.5 py-0.5 text-[11px] text-foreground hover:bg-[var(--dashboard-accent-soft)]"
                    >
                      <Download className="size-2.5" />
                      {sample.name}
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <DashboardSelect
                value={selectedImportId}
                onValueChange={setSelectedImportId}
                options={importOptions}
                placeholder="Select a prior upload"
                disabled={importOptions.length === 0}
              />
            )}
            {message ? (
              <p
                className={`text-xs ${
                  message.toLowerCase().includes("unable") ||
                  message.toLowerCase().includes("invalid") ||
                  message.toLowerCase().includes("mvp endpoint") ||
                  message.toLowerCase().includes("select ")
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {message}
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
        </div>
      )}
    </ConsolePage>
  );
}
