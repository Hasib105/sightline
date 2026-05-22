"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Loader2, PlusCircle } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
} from "@/components/dashboard/console";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  enrollCourse,
  listCourses,
  listEnrollments,
} from "@/lib/dashboard-api";

export default function StudentCoursesPage() {
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });
  const enrollmentsQuery = useQuery({
    queryKey: ["enrollments"],
    queryFn: listEnrollments,
  });
  const enrollMutation = useMutation({
    mutationFn: enrollCourse,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["exams"] });
    },
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const activeCourseIds = useMemo(
    () =>
      new Set(
        enrollments
          .filter((enrollment) => enrollment.status === "active")
          .map((enrollment) => enrollment.course)
      ),
    [enrollments]
  );
  const availableCourses = courses.filter((course) => !activeCourseIds.has(course.id));
  const loading = coursesQuery.isLoading || enrollmentsQuery.isLoading;
  const error = coursesQuery.error ?? enrollmentsQuery.error;

  return (
    <ConsolePage
      eyebrow="Student"
      title="Course enrollment"
      description="Enroll in available courses so their exam sessions appear in your exam workspace."
      meta={
        <>
          <span>{enrollments.length} enrollment records</span>
          <span>{availableCourses.length} courses available</span>
        </>
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Enrolled" value={activeCourseIds.size} description="Active course enrollments" />
        <ConsoleStat label="Available" value={availableCourses.length} description="Courses open to join" />
        <ConsoleStat label="Completed" value={enrollments.filter((item) => item.status === "completed").length} description="Finished enrollment records" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
          <ConsolePanel
            title="Available courses"
            description="Join a course before attempting its exams."
            contentClassName="space-y-2"
          >
            {availableCourses.length === 0 ? (
              <ConsoleEmptyState
                title="No new courses"
                description="Every visible course is already in your enrollment list."
                icon={BookOpenCheck}
              />
            ) : (
              availableCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col gap-3 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground">{course.code}</h2>
                      <StatusBadge label={course.department_code} tone="muted" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {course.semester_name} · Teacher {course.teacher_username ?? "unassigned"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={enrollMutation.isPending}
                    onClick={() => enrollMutation.mutate(course.id)}
                  >
                    {enrollMutation.isPending && enrollMutation.variables === course.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <PlusCircle className="size-3.5" />
                    )}
                    Enroll
                  </Button>
                </div>
              ))
            )}
            {enrollMutation.error ? (
              <p className="text-sm text-red-600">{(enrollMutation.error as ApiError).message}</p>
            ) : null}
          </ConsolePanel>

          <ConsolePanel
            title="My courses"
            description="Active enrollments control which exams you can take."
            contentClassName="space-y-2"
          >
            {enrollments.length === 0 ? (
              <ConsoleEmptyState
                title="Nothing enrolled yet"
                description="Choose a course from the available list to begin."
                icon={BookOpenCheck}
              />
            ) : (
              enrollments.map((enrollment) => (
                <Link
                  key={enrollment.id}
                  href={`/dashboard/courses/${enrollment.course}`}
                  className="block rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 transition hover:border-[var(--dashboard-accent)] hover:bg-[var(--dashboard-panel)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {enrollment.course_code}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{enrollment.course_title}</p>
                    </div>
                    <StatusBadge
                      label={enrollment.status}
                      tone={enrollment.status === "active" ? "success" : "muted"}
                    />
                  </div>
                </Link>
              ))
            )}
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
