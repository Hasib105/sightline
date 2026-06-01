"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, ClipboardList, FileText, Loader2, MessageSquare, Plus, Send } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  KeyValueList,
  StatusBadge,
} from "@/components/dashboard/console";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import {
  ApiError,
  createCourseChatThread,
  getCurrentUserClient,
  listCourseChatThreads,
  listCourseMaterials,
  listCourses,
  listCourseUnits,
  listEnrollments,
  listExams,
  sendCourseChatMessage,
} from "@/lib/dashboard-api";
import type { CourseChatThread, CourseEnrollment, CourseMaterial, ExamSessionSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { consoleTextareaClass } from "@/components/dashboard/console";

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
  const queryClient = useQueryClient();
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
  const userQuery = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentUserClient,
    enabled: isCourseIdValid,
  });
  const materialsQuery = useQuery({
    queryKey: ["course-materials", courseId],
    queryFn: () => listCourseMaterials(courseId),
    enabled: isCourseIdValid,
  });
  const unitsQuery = useQuery({
    queryKey: ["course-units", courseId],
    queryFn: () => listCourseUnits(courseId),
    enabled: isCourseIdValid,
  });
  const chatThreadsQuery = useQuery({
    queryKey: ["course-chat-threads", courseId],
    queryFn: () => listCourseChatThreads(courseId),
    enabled: isCourseIdValid,
  });

  const [selectedContentUnitId, setSelectedContentUnitId] = useState<number | null>(null);
  const [selectedChatUnitId, setSelectedChatUnitId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessage, setChatMessage] = useState<string | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

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
  const materials: CourseMaterial[] = useMemo(
    () => materialsQuery.data ?? [],
    [materialsQuery.data]
  );
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const visibleMaterials = selectedContentUnitId
    ? materials.filter((item) => item.unit === selectedContentUnitId)
    : materials;
  const chatThreads: CourseChatThread[] = chatThreadsQuery.data ?? [];
  const scopedChatThreads = chatThreads.filter((thread) => thread.unit === selectedChatUnitId);
  const selectedThread =
    chatThreads.find((thread) => thread.id === selectedThreadId) ??
    scopedChatThreads[0] ??
    (selectedChatUnitId === null ? chatThreads[0] : null) ??
    null;

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
  const materialsLoading = materialsQuery.isLoading;
  const materialsError = materialsQuery.error as ApiError | null;
  const canManageMaterials =
    userQuery.data?.role === "teacher" || userQuery.data?.role === "admin" || userQuery.data?.is_superuser;
  const unitOptions = [
    { value: "", label: "Whole course" },
    ...units.map((unit) => ({ value: String(unit.id), label: `Unit ${unit.order} · ${unit.title}` })),
  ];
  const threadOptions = scopedChatThreads.map((thread) => ({
    value: String(thread.id),
    label: thread.title,
  }));

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      if (!course) {
        throw new Error("Course is not loaded yet.");
      }
      return createCourseChatThread({
        course: course.id,
        unit: selectedChatUnitId,
        title: `${course.code} ${selectedChatUnitId ? "unit" : "course"} chat ${scopedChatThreads.length + 1}`,
      });
    },
    onSuccess: async (thread) => {
      setSelectedThreadId(thread.id);
      setChatMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["course-chat-threads", courseId] });
    },
    onError: (error) => setChatMessage(error instanceof Error ? error.message : "Unable to create a thread."),
  });

  const askMutation = useMutation({
    mutationFn: async () => {
      if (!course) {
        throw new Error("Course is not loaded yet.");
      }
      const question = chatInput.trim();
      if (!question) {
        throw new Error("Write a question first.");
      }
      let thread = selectedThread;
      if (!thread || thread.unit !== selectedChatUnitId) {
        thread = await createCourseChatThread({
          course: course.id,
          unit: selectedChatUnitId,
          title: selectedChatUnitId
            ? `${course.code} unit chat`
            : `${course.code} course chat`,
        });
        setSelectedThreadId(thread.id);
      }
      return sendCourseChatMessage(thread.id, question);
    },
    onSuccess: async (thread) => {
      setChatInput("");
      setSelectedThreadId(thread.id);
      setChatMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["course-chat-threads", courseId] });
    },
    onError: (error) => setChatMessage(error instanceof Error ? error.message : "Unable to ask right now."),
  });

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
              label="Units"
              value={units.length}
              description="Content sections"
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
                  className="rounded-md border border-(--dashboard-border) bg-(--dashboard-panel-muted) p-3"
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

          <ConsolePanel
            title="Course materials"
            description="Unit-wise slides, videos, documents, text, and links shared for this course."
            actions={
              canManageMaterials ? (
                <Link href="/dashboard/teacher/materials" className="dashboard-link-button">
                  Manage materials
                </Link>
              ) : null
            }
            contentClassName="space-y-2"
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-md border px-2.5 py-1 text-xs ${selectedContentUnitId === null ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]" : "border-(--dashboard-border)"}`}
                onClick={() => setSelectedContentUnitId(null)}
              >
                Whole course
              </button>
              {units.map((unit) => (
                <button
                  type="button"
                  key={unit.id}
                  className={`rounded-md border px-2.5 py-1 text-xs ${selectedContentUnitId === unit.id ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]" : "border-(--dashboard-border)"}`}
                  onClick={() => setSelectedContentUnitId(unit.id)}
                >
                  Unit {unit.order}: {unit.title}
                </button>
              ))}
            </div>
            {units.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {units.map((unit) => (
                  <div key={unit.id} className="rounded-md border border-(--dashboard-border) bg-(--dashboard-panel-muted) p-3">
                    <div className="text-sm font-semibold text-foreground">Unit {unit.order}: {unit.title}</div>
                    {unit.summary ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{unit.summary}</p> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">{unit.material_count} materials</p>
                  </div>
                ))}
              </div>
            ) : null}
            {materialsLoading || unitsQuery.isLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : materialsError ? (
              <p className="text-sm text-red-600">{materialsError.message}</p>
            ) : visibleMaterials.length === 0 ? (
              <ConsoleEmptyState
                title="No materials yet"
                description="Teachers can upload slides, videos, or URLs for this course."
                icon={FileText}
              />
            ) : (
              visibleMaterials.map((material) => (
                <div
                  key={material.id}
                  className="rounded-md border border-(--dashboard-border) bg-(--dashboard-panel-muted) p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-foreground">
                        {material.title}
                      </h2>
                      {material.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{material.description}</p>
                      ) : null}
                      {material.content_text ? (
                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{material.content_text}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {material.unit_title ? `Unit ${material.unit_order} · ${material.unit_title}` : "Course-level"} · Added by {material.uploaded_by_username ?? "Teacher"}
                      </p>
                    </div>
                    <StatusBadge label={material.kind} tone="muted" />
                  </div>
                  {material.uri ? <div className="mt-2 text-xs text-muted-foreground">
                    <a href={material.uri} target="_blank" rel="noreferrer" className="underline">
                      {material.original_filename || material.uri}
                    </a>
                  </div> : null}
                </div>
              ))
            )}
          </ConsolePanel>

          <button
            type="button"
            className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--dashboard-accent)_38%,var(--dashboard-border))] bg-[var(--dashboard-accent)] px-4 py-3 text-sm font-semibold text-[var(--dashboard-accent-foreground)] shadow-2xl shadow-black/20 transition hover:translate-y-[-1px]"
            onClick={() => setChatDrawerOpen(true)}
          >
            <MessageSquare className="size-4" />
            Course chat
          </button>

          <InspectorDrawer
            open={chatDrawerOpen}
            onOpenChange={setChatDrawerOpen}
            title="Course chat"
            description="Ask about the whole course or a single unit."
            className="w-[min(30rem,calc(100vw-1rem))]"
            bodyClassName="flex h-full min-h-0 flex-col gap-3"
          >
            <div className="grid gap-3">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Scope</label>
                <DashboardSelect
                  value={selectedChatUnitId ? String(selectedChatUnitId) : ""}
                  onValueChange={(value) => {
                    const nextUnitId = value ? Number(value) : null;
                    setSelectedChatUnitId(nextUnitId);
                    const nextThread = chatThreads.find((thread) => thread.unit === nextUnitId) ?? null;
                    setSelectedThreadId(nextThread?.id ?? null);
                  }}
                  options={unitOptions}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Thread</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createThreadMutation.mutate()}
                    disabled={createThreadMutation.isPending}
                  >
                    {createThreadMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    New thread
                  </Button>
                </div>
                <DashboardSelect
                  value={selectedThread ? String(selectedThread.id) : ""}
                  onValueChange={(value) => setSelectedThreadId(value ? Number(value) : null)}
                  options={threadOptions}
                  placeholder="No thread yet"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {chatMessage ? <p className="mb-2 text-xs text-red-600">{chatMessage}</p> : null}
              {chatThreadsQuery.isLoading ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : !selectedThread || selectedThread.messages.length === 0 ? (
                <ConsoleEmptyState title="No chat yet" description="Ask the first question about this content." icon={MessageSquare} />
              ) : (
                <div className="space-y-2">
                  {selectedThread.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-md border p-3 ${message.role === "user" ? "ml-8 border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]" : "mr-8 border-(--dashboard-border) bg-(--dashboard-panel-muted)"}`}
                    >
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {message.role === "user" ? "You" : "Sightline chat"}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{message.content}</p>
                      {message.citations.length > 0 ? (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Sources: {message.citations.map((item) => item.title as string).filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[var(--dashboard-border)] pt-3">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Question</label>
              <div className="mt-2 flex gap-2">
                <textarea
                  className={`${consoleTextareaClass} min-h-16 flex-1`}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask about this unit..."
                />
                <Button size="icon" onClick={() => askMutation.mutate()} disabled={askMutation.isPending} aria-label="Ask question">
                  {askMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            </div>
          </InspectorDrawer>
        </>
      )}
    </ConsolePage>
  );
}
