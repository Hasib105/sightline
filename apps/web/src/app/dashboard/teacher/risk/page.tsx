"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, PlayCircle } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
  consoleInputClass,
  consoleTextareaClass,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  listAtRiskScores,
  listCourses,
  listEnrollments,
  runAtRiskAnalysis,
} from "@/lib/dashboard-api";
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

function parseRows(value: string): AtRiskInputRow[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [studentNumber, attended, total, score, maxScore] = line.split(",").map((part) => part.trim());
      if (!studentNumber || !attended || !total || !score || !maxScore) {
        throw new Error("Each row must be student_number,attended,total,score,max_score.");
      }
      const numericValues = [attended, total, score, maxScore].map(Number);
      if (numericValues.some((item) => !Number.isFinite(item))) {
        throw new Error("Attendance and assessment values must be numbers.");
      }
      return {
        student_number: studentNumber,
        attended: numericValues[0],
        total: numericValues[1],
        score: numericValues[2],
        max_score: numericValues[3],
        label: "Teacher risk input",
      };
    });
}

export default function TeacherRiskPage() {
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const enrollmentsQuery = useQuery({ queryKey: ["enrollments"], queryFn: listEnrollments });
  const scoresQuery = useQuery({ queryKey: ["at-risk"], queryFn: listAtRiskScores });
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const scores = useMemo(() => scoresQuery.data ?? [], [scoresQuery.data]);

  const [selectedCourseIdState, setSelectedCourseId] = useState<number | null>(null);
  const selectedCourseId = selectedCourseIdState ?? courses[0]?.id ?? null;
  const [sourceName, setSourceName] = useState("teacher-risk-input.csv");
  const [rowsText, setRowsText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: `${course.code} · ${course.title}`,
  }));
  const courseEnrollments = enrollments.filter((item) => item.course === selectedCourseId);
  const courseScores = scores.filter((score) => score.course === selectedCourseId);
  const highRiskCount = courseScores.filter((score) => score.risk_level === "high").length;
  const loading = coursesQuery.isLoading || enrollmentsQuery.isLoading || scoresQuery.isLoading;
  const error = coursesQuery.error ?? enrollmentsQuery.error ?? scoresQuery.error;

  const runMutation = useMutation({
    mutationFn: () => {
      if (!selectedCourseId) {
        throw new Error("Select a course before running risk analysis.");
      }
      const rows = parseRows(rowsText);
      if (rows.length === 0) {
        throw new Error("Add at least one student row.");
      }
      return runAtRiskAnalysis({
        course: selectedCourseId,
        source_name: sourceName.trim() || "teacher-risk-input.csv",
        rows,
      });
    },
    onSuccess: async (result) => {
      setMessage(`Risk analysis completed for ${result.scores.length} students.`);
      await queryClient.invalidateQueries({ queryKey: ["at-risk"] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Unable to run risk analysis.");
    },
  });

  async function handleCsvFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const chunks: string[] = [];
    for (const file of Array.from(files)) {
      const lines = (await file.text())
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      // Drop a header row: a data row's 2nd column (attended) is numeric; a header's is not.
      if (lines.length > 0 && /[a-zA-Z]/.test(lines[0].split(",")[1] ?? "")) {
        lines.shift();
      }
      chunks.push(lines.join("\n"));
    }
    setRowsText((prev) => [prev.trim(), ...chunks].filter(Boolean).join("\n"));
    setSourceName(files.length === 1 ? files[0].name : `${files.length} csv files`);
    setMessage(`Loaded ${files.length} CSV file(s). Review the rows below, then run analysis.`);
  }

  return (
    <ConsolePage
      eyebrow="Teacher"
      title="At-risk students"
      description="Run student-level risk analysis for a course and review interpretable contributing factors."
      meta={
        selectedCourse ? (
          <>
            <span>{selectedCourse.code}</span>
            <span>{courseScores.length} risk outputs</span>
          </>
        ) : null
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Students" value={courseEnrollments.length} description="Visible enrollments" />
        <ConsoleStat label="Risk outputs" value={courseScores.length} description="Generated score records" />
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
          <ConsolePanel title="Risk outputs" description="Scores for the selected course." contentClassName="space-y-2">
            {courseScores.length === 0 ? (
              <ConsoleEmptyState
                title="No risk data yet"
                description="Run analysis after attendance and assessment data is available."
                icon={AlertTriangle}
              />
            ) : (
              courseScores.map((score) => (
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

          <ConsolePanel title="Run analysis" description="Paste one row per student." contentClassName="space-y-3">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Course</label>
              <DashboardSelect
                value={selectedCourseId ? String(selectedCourseId) : ""}
                onValueChange={(value) => {
                  setSelectedCourseId(Number(value));
                  setRowsText("");
                }}
                options={courseOptions}
                placeholder="Select a course"
                disabled={courseOptions.length === 0}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Source name</label>
              <input className={consoleInputClass} value={sourceName} onChange={(event) => setSourceName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Upload CSV (one or more)</label>
              <input
                type="file"
                accept=".csv,text/csv"
                multiple
                className={`${consoleInputClass} cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-[var(--dashboard-panel-muted)] file:px-2 file:py-1 file:text-xs`}
                onChange={(event) => handleCsvFiles(event.target.files)}
              />
              <p className="text-[11px] text-muted-foreground">
                Columns: student_number, attended, total, score, max_score. A header row is optional and detected automatically.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rows</label>
              <textarea
                className={`${consoleTextareaClass} min-h-48 font-mono text-xs`}
                value={rowsText}
                onChange={(event) => setRowsText(event.target.value)}
                placeholder="S-1001,18,24,72,100"
              />
            </div>
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Button size="sm" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
              {runMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlayCircle className="size-3.5" />}
              Run analysis
            </Button>
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
