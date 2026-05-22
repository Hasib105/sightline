"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, ClipboardList, Loader2 } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  KeyValueList,
  StatusBadge,
} from "@/components/dashboard/console";
import {
  ApiError,
  listCourses,
  listEnrollments,
  listExams,
} from "@/lib/dashboard-api";
import type { CourseEnrollment, ExamSessionSummary } from "@/lib/types";

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

function enrollmentTone(status: CourseEnrollment["status"]) {
  if (status === "active") {
    return "success";
  }
  if (status === "dropped") {
    return "danger";
  }
  return "muted";
}

export default function CourseDetailsPage() {
  const params = useParams<{ courseId?: string }>();
  const courseIdParam = params?.courseId;
  const courseId = typeof courseIdParam === "string" ? Number(courseIdParam) : Number.NaN;
  const isCourseIdValid = Number.isFinite(courseId);

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
    enabled: isCourseIdValid,
  });
  const enrollmentsQuery = useQuery({
    queryKey: ["enrollments"],
    queryFn: listEnrollments,
    enabled: isCourseIdValid,
  });
  const examsQuery = useQuery({
    queryKey: ["exams"],
    queryFn: listExams,
    enabled: isCourseIdValid,
  });

  const loading = coursesQuery.isLoading || enrollmentsQuery.isLoading || examsQuery.isLoading;
  const error = coursesQuery.error ?? enrollmentsQuery.error ?? examsQuery.error;

  const course = useMemo(
    () => coursesQuery.data?.find((item) => item.id === courseId) ?? null,
    [coursesQuery.data, courseId]
  );
  const courseEnrollments = useMemo(
    () => (enrollmentsQuery.data ?? []).filter((item) => item.course === courseId),
    [enrollmentsQuery.data, courseId]
  );
  const enrollment = courseEnrollments.length === 1 ? courseEnrollments[0] : null;
  const exams = useMemo(
    () => (examsQuery.data ?? []).filter((item) => item.course === courseId),
    [examsQuery.data, courseId]
  );

  const enrollmentStatValue = enrollment
    ? enrollment.status
    : courseEnrollments.length > 0
      ? `${courseEnrollments.length} students`
      : "not enrolled";
  const enrollmentStatDescription = enrollment
    ? "Your current status"
    : courseEnrollments.length > 0
      ? "Students enrolled in this course"
      : "No active enrollments";

  return (
    <ConsolePage
      eyebrow="Student"
      title={course ? `${course.code} details` : "Course details"}
      description="Review course information and exam sessions tied to this course."
      actions={
        <Link href="/dashboard/courses" className="dashboard-link-button">
          <ArrowLeft className="size-3.5" />
          Back to courses
        </Link>
      }
      meta={
        course ? (
          <>
            <span>{course.code}</span>
            <span>{course.semester_name}</span>
          </>
        ) : null
      }
    >
      {!isCourseIdValid ? (
        <p className="text-sm text-red-600">Invalid course id.</p>
      ) : loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : !course ? (
        <ConsoleEmptyState
          title="Course not found"
          description="Return to your course list and choose another course."
          icon={BookOpenCheck}
        />
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-3">
            <ConsoleStat
              label="Enrollment"
              value={enrollmentStatValue}
              description={enrollmentStatDescription}
            />
            <ConsoleStat
              label="Exam sessions"
              value={exams.length}
              description="Sessions tied to this course"
            />
            <ConsoleStat
              label="Teacher"
              value={course.teacher_username ?? "Unassigned"}
              description="Primary instructor"
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
            <ConsolePanel title="Course overview" description="Key course attributes.">
              <KeyValueList
                items={[
                  { label: "Course code", value: course.code },
                  { label: "Title", value: course.title },
                  { label: "Department", value: course.department_code },
                  { label: "Semester", value: course.semester_name },
                  { label: "Teacher", value: course.teacher_username ?? "Unassigned" },
                  {
                    label: enrollment ? "Enrollment status" : "Enrollment count",
                    value: enrollment ? (
                      <StatusBadge
                        label={enrollment.status}
                        tone={enrollmentTone(enrollment.status)}
                      />
                    ) : courseEnrollments.length > 0 ? (
                      `${courseEnrollments.length} students`
                    ) : (
                      "None"
                    ),
                  },
                ]}
              />
            </ConsolePanel>

            <ConsolePanel
              title="Enrollment detail"
              description={
                enrollment
                  ? "Your current enrollment record."
                  : courseEnrollments.length > 0
                    ? "Multiple enrollments are tied to this course."
                    : "No personal enrollment record found."
              }
              contentClassName="space-y-3"
            >
              {enrollment ? (
                <KeyValueList
                  items={[
                    { label: "Student", value: enrollment.student_name },
                    { label: "Student number", value: enrollment.student_number },
                    {
                      label: "Status",
                      value: (
                        <StatusBadge
                          label={enrollment.status}
                          tone={enrollmentTone(enrollment.status)}
                        />
                      ),
                    },
                    { label: "Enrolled", value: new Date(enrollment.created_at).toLocaleString() },
                  ]}
                />
              ) : courseEnrollments.length > 0 ? (
                <KeyValueList
                  items={[
                    { label: "Enrollments", value: `${courseEnrollments.length} students` },
                    {
                      label: "Most recent",
                      value: new Date(courseEnrollments[0].created_at).toLocaleString(),
                    },
                  ]}
                />
              ) : (
                <ConsoleEmptyState
                  title="No enrollment record"
                  description="Enroll in this course to see your enrollment details."
                  icon={BookOpenCheck}
                />
              )}
            </ConsolePanel>
          </div>

          <ConsolePanel
            title="Exam sessions"
            description="Sessions available for this course."
            contentClassName="space-y-2"
          >
            {exams.length === 0 ? (
              <ConsoleEmptyState
                title="No exams yet"
                description="Exam sessions will appear once they are scheduled."
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
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {exam.quiz_title || exam.course_code}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{exam.course_title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(exam.starts_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge label={exam.status} tone={examStatusTone(exam.status)} />
                  </div>
                </div>
              ))
            )}
          </ConsolePanel>
        </>
      )}
    </ConsolePage>
  );
}
