"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, PlusCircle } from "lucide-react";

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
import { ApiError, createExam, listCourses, listExams } from "@/lib/dashboard-api";
import type { ExamCreatePayload, ExamSessionSummary, JsonValue } from "@/lib/types";

const examStatuses: Array<{ value: ExamSessionSummary["status"]; label: string }> = [
  { value: "scheduled", label: "Scheduled" },
  { value: "prepared", label: "Prepared" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function toLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function statusTone(status: ExamSessionSummary["status"]) {
  if (status === "live" || status === "prepared") {
    return "success";
  }
  if (status === "scheduled") {
    return "warning";
  }
  if (status === "completed") {
    return "muted";
  }
  return "danger";
}

export default function TeacherExamsPage() {
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const examsQuery = useQuery({ queryKey: ["exams"], queryFn: listExams });
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data]);

  const [selectedCourseIdState, setSelectedCourseId] = useState<number | null>(null);
  const selectedCourseId = selectedCourseIdState ?? courses[0]?.id ?? null;
  const [status, setStatus] = useState<ExamSessionSummary["status"]>("prepared");
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [endsAt, setEndsAt] = useState(() => toLocalInputValue(new Date(Date.now() + 26 * 60 * 60 * 1000)));
  const [quizTitle, setQuizTitle] = useState("");
  const [quizInstructions, setQuizInstructions] = useState("");
  const [questionsJson, setQuestionsJson] = useState(
    JSON.stringify(
      [
        {
          id: "q1",
          kind: "short_answer",
          prompt: "Explain the key idea in this lesson.",
        },
      ],
      null,
      2
    )
  );
  const [message, setMessage] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: `${course.code} · ${course.title}`,
  }));
  const selectedCourseExams = exams.filter((exam) => exam.course === selectedCourseId);
  const loading = coursesQuery.isLoading || examsQuery.isLoading;
  const error = coursesQuery.error ?? examsQuery.error;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedCourseId) {
        throw new Error("Select a course before creating an exam.");
      }
      let quizQuestions: JsonValue[] = [];
      if (questionsJson.trim()) {
        const parsed = JSON.parse(questionsJson) as JsonValue;
        if (!Array.isArray(parsed)) {
          throw new Error("Questions must be a JSON array.");
        }
        quizQuestions = parsed as JsonValue[];
      }
      const payload: ExamCreatePayload = {
        course: selectedCourseId,
        status,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        quiz_title: quizTitle.trim(),
        quiz_instructions: quizInstructions.trim(),
        quiz_questions: quizQuestions,
      };
      return createExam(payload);
    },
    onSuccess: async () => {
      setMessage("Exam created.");
      setQuizTitle("");
      setQuizInstructions("");
      await queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Unable to create exam.");
    },
  });

  return (
    <ConsolePage
      eyebrow="Teacher"
      title="Exams"
      description="Create exam sessions for your courses and keep quiz questions ready for students."
      meta={
        selectedCourse ? (
          <>
            <span>{selectedCourse.code}</span>
            <span>{selectedCourseExams.length} exams</span>
          </>
        ) : null
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Courses" value={courses.length} description="Available for exam setup" />
        <ConsoleStat label="Exams" value={exams.length} description="Visible sessions" />
        <ConsoleStat label="Selected" value={selectedCourseExams.length} description={selectedCourse?.title ?? "No course selected"} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.5fr)]">
          <ConsolePanel title="Course exams" description="Sessions scoped to the selected course." contentClassName="space-y-2">
            {selectedCourseExams.length === 0 ? (
              <ConsoleEmptyState title="No exams yet" description="Create an exam session for the selected course." icon={ClipboardList} />
            ) : (
              selectedCourseExams.map((exam) => (
                <div key={exam.id} className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {exam.quiz_title || `${exam.course_code} exam`}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{exam.course_title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(exam.starts_at).toLocaleString()} · {exam.quiz_questions.length} questions
                      </p>
                    </div>
                    <StatusBadge label={exam.status} tone={statusTone(exam.status)} />
                  </div>
                </div>
              ))
            )}
          </ConsolePanel>

          <ConsolePanel title="Create exam" description="Hall assignment uses the MVP default hall." contentClassName="space-y-3">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Course</label>
              <DashboardSelect
                value={selectedCourseId ? String(selectedCourseId) : ""}
                onValueChange={(value) => setSelectedCourseId(Number(value))}
                options={courseOptions}
                placeholder="Select a course"
                disabled={courseOptions.length === 0}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Starts</label>
                <input className={consoleInputClass} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ends</label>
                <input className={consoleInputClass} type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</label>
              <DashboardSelect value={status} onValueChange={(value) => setStatus(value as ExamSessionSummary["status"])} options={examStatuses} />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quiz title</label>
              <input className={consoleInputClass} value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} placeholder="Midterm practice quiz" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Instructions</label>
              <textarea className={consoleTextareaClass} value={quizInstructions} onChange={(event) => setQuizInstructions(event.target.value)} placeholder="Answer all questions." />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Questions JSON</label>
              <textarea className={`${consoleTextareaClass} min-h-40 font-mono text-xs`} value={questionsJson} onChange={(event) => setQuestionsJson(event.target.value)} />
            </div>
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlusCircle className="size-3.5" />}
              Create exam
            </Button>
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
