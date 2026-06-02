"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, ClipboardList, Loader2 } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
} from "@/components/dashboard/console";
import {
  listEnrollments,
  listExamAttempts,
  listExams,
} from "@/lib/dashboard-api";
import type { CurrentUser, ExamSessionSummary } from "@/lib/types";

function examStatusTone(status: ExamSessionSummary["status"]) {
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

export function StudentDashboard({ user }: { user: CurrentUser }) {
  const enrollmentsQuery = useQuery({
    queryKey: ["enrollments"],
    queryFn: listEnrollments,
  });
  const examsQuery = useQuery({
    queryKey: ["exams"],
    queryFn: listExams,
  });
  const attemptsQuery = useQuery({
    queryKey: ["exam-attempts"],
    queryFn: listExamAttempts,
  });

  const enrollments = enrollmentsQuery.data ?? [];
  const exams = examsQuery.data ?? [];
  const attempts = attemptsQuery.data ?? [];
  const activeEnrollments = enrollments.filter((enrollment) => enrollment.status === "active");
  const submittedExamIds = new Set(attempts.map((attempt) => attempt.exam_session));
  const loading = enrollmentsQuery.isLoading || examsQuery.isLoading || attemptsQuery.isLoading;

  return (
    <ConsolePage
      eyebrow="Student"
      title="Student dashboard"
      description="Your enrolled courses and available exams."
      meta={
        <>
          <span>
            Signed in as <span className="font-medium text-slate-700">{user.username}</span>
          </span>
          <span>Role: {user.role}</span>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <ConsoleStat label="Enrolled courses" value={activeEnrollments.length} description="Active course enrollments" />
        <ConsoleStat label="Available exams" value={exams.length} description="From enrolled courses" />
        <ConsoleStat label="Submitted" value={submittedExamIds.size} description="Completed attempts" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.48fr)]">
          <ConsolePanel
            title="Enrolled courses"
            description="All courses attached to your student profile."
            actions={
              <Link href="/dashboard/courses" className="dashboard-link-button">
                <BookOpenCheck className="size-3.5" />
                Manage
              </Link>
            }
            contentClassName="space-y-2"
          >
            {activeEnrollments.length === 0 ? (
              <ConsoleEmptyState
                title="No enrolled courses"
                description="Enroll in a course to make its exams available."
                icon={BookOpenCheck}
              />
            ) : (
              activeEnrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/dashboard/courses/${enrollment.course}`}
                  className="block rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 transition hover:border-[var(--dashboard-accent)] hover:bg-[var(--dashboard-panel)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">{enrollment.course_code}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{enrollment.course_title}</p>
                    </div>
                    <StatusBadge label={enrollment.status} tone="success" />
                  </div>
                </Link>
              ))
            )}
          </ConsolePanel>

          <ConsolePanel
            title="Exams"
            description="Open an exam to start the monitored attempt."
            actions={
              <Link href="/dashboard/exams" className="dashboard-link-button">
                <ClipboardList className="size-3.5" />
                Open
              </Link>
            }
            contentClassName="space-y-2"
          >
            {exams.length === 0 ? (
              <ConsoleEmptyState
                title="No exams yet"
                description="Exam sessions from enrolled courses will appear here."
                icon={ClipboardList}
              />
            ) : (
              exams.map((exam) => (
                <div
                  key={exam.id}
                  className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">{exam.quiz_title || exam.course_code}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{exam.course_title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(exam.starts_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge
                      label={submittedExamIds.has(exam.id) ? "submitted" : exam.status}
                      tone={submittedExamIds.has(exam.id) ? "success" : examStatusTone(exam.status)}
                    />
                  </div>
                </div>
              ))
            )}
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
