"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, ClipboardList, Loader2, PlusCircle, UsersRound } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
  consoleInputClass,
} from "@/components/dashboard/console";
import { Button } from "@/components/ui/button";
import { ApiError, createCourse, listCourses, listEnrollments, listExams } from "@/lib/dashboard-api";

export default function TeacherCoursesPage() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const enrollmentsQuery = useQuery({ queryKey: ["enrollments"], queryFn: listEnrollments });
  const examsQuery = useQuery({ queryKey: ["exams"], queryFn: listExams });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data]);
  const loading = coursesQuery.isLoading || enrollmentsQuery.isLoading || examsQuery.isLoading;
  const error = coursesQuery.error ?? enrollmentsQuery.error ?? examsQuery.error;

  const courseStats = useMemo(
    () =>
      courses.map((course) => ({
        course,
        enrollmentCount: enrollments.filter((item) => item.course === course.id).length,
        examCount: exams.filter((item) => item.course === course.id).length,
      })),
    [courses, enrollments, exams]
  );

  const createMutation = useMutation({
    mutationFn: () => {
      if (!code.trim() || !title.trim()) {
        throw new Error("Course code and title are required.");
      }
      return createCourse({ code: code.trim().toUpperCase(), title: title.trim() });
    },
    onSuccess: async () => {
      setMessage("Course created.");
      setCode("");
      setTitle("");
      await queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Unable to create course.");
    },
  });

  return (
    <ConsolePage
      eyebrow="Teacher"
      title="Courses"
      description="Create courses and review the enrolled students and exam sessions attached to them."
      meta={
        <>
          <span>{courses.length} assigned courses</span>
          <span>{enrollments.length} visible enrollments</span>
        </>
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Courses" value={courses.length} description="Assigned to you" icon={BookOpenCheck} />
        <ConsoleStat label="Students" value={enrollments.length} description="Visible enrollment records" icon={UsersRound} />
        <ConsoleStat label="Exams" value={exams.length} description="Sessions for your courses" icon={ClipboardList} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.42fr)]">
          <ConsolePanel title="My courses" description="Open a course to inspect students, materials, and exams." contentClassName="space-y-2">
            {courseStats.length === 0 ? (
              <ConsoleEmptyState title="No courses yet" description="Create your first course to start the teacher workflow." icon={BookOpenCheck} />
            ) : (
              courseStats.map(({ course, enrollmentCount, examCount }) => (
                <Link
                  key={course.id}
                  href={`/dashboard/courses/${course.id}`}
                  className="block rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 transition hover:border-[var(--dashboard-accent)] hover:bg-[var(--dashboard-panel)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-foreground">{course.code}</h2>
                        <StatusBadge label={course.department_code} tone="muted" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {course.semester_name} · {enrollmentCount} students · {examCount} exams
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </ConsolePanel>

          <ConsolePanel title="Create course" description="New courses are assigned to you automatically." contentClassName="space-y-3">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Code
              </label>
              <input className={consoleInputClass} value={code} onChange={(event) => setCode(event.target.value)} placeholder="CSE-410" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Title
              </label>
              <input className={consoleInputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Software Engineering" />
            </div>
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlusCircle className="size-3.5" />}
              Create course
            </Button>
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
