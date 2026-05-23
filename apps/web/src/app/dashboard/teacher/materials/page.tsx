"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, PlusCircle } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  consoleInputClass,
  consoleTextareaClass,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createCourseMaterial,
  listCourseMaterials,
  listCourses,
} from "@/lib/dashboard-api";
import type { CourseMaterial } from "@/lib/types";

const materialKinds = [
  { value: "video", label: "Video" },
  { value: "slide", label: "Slide" },
  { value: "url", label: "URL" },
] satisfies Array<{ value: MaterialKind; label: string }>;

type MaterialKind = "video" | "slide" | "url";

export default function TeacherMaterialsPage() {
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const [selectedCourseIdState, setSelectedCourseId] = useState<number | null>(null);
  const selectedCourseId = selectedCourseIdState ?? courses[0]?.id ?? null;
  const [kind, setKind] = useState<MaterialKind>("slide");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uri, setUri] = useState("");
  const [originalFilename, setOriginalFilename] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const materialsQuery = useQuery({
    queryKey: ["course-materials", selectedCourseId],
    queryFn: () => listCourseMaterials(selectedCourseId ?? 0),
    enabled: typeof selectedCourseId === "number",
  });

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const materials: CourseMaterial[] = materialsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) {
        throw new Error("Select a course before uploading materials.");
      }
      if (!title.trim() || !uri.trim()) {
        throw new Error("Title and URI are required.");
      }
      return createCourseMaterial(selectedCourseId, {
        kind,
        title: title.trim(),
        description: description.trim() || undefined,
        uri: uri.trim(),
        original_filename: originalFilename.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setMessage("Material saved.");
      setTitle("");
      setDescription("");
      setUri("");
      setOriginalFilename("");
      await queryClient.invalidateQueries({
        queryKey: ["course-materials", selectedCourseId],
      });
    },
    onError: (error) => {
      const detail = error instanceof Error ? error.message : "Unable to save material.";
      setMessage(detail);
    },
  });

  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: `${course.code} · ${course.title}`,
  }));

  const loading = coursesQuery.isLoading;
  const courseError = coursesQuery.error as ApiError | null;

  return (
    <ConsolePage
      eyebrow="Teacher"
      title="Course materials"
      description="Upload videos, slides, or URLs for students in your courses."
      meta={
        selectedCourse ? (
          <>
            <span>{selectedCourse.code}</span>
            <span>{selectedCourse.semester_name}</span>
          </>
        ) : null
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Courses" value={courses.length} description="Assigned to you" />
        <ConsoleStat
          label="Materials"
          value={materials.length}
          description={selectedCourse ? selectedCourse.title : "Select a course"}
        />
        <ConsoleStat label="Uploads" value={materials.filter((item) => item.kind !== "url").length} description="Files or videos" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : courseError ? (
        <p className="text-sm text-red-600">{courseError.message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.5fr)]">
          <ConsolePanel
            title="Materials"
            description="What students will see for the selected course."
            contentClassName="space-y-2"
          >
            {materialsQuery.isLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : materialsQuery.error ? (
              <p className="text-sm text-red-600">{(materialsQuery.error as ApiError).message}</p>
            ) : materials.length === 0 ? (
              <ConsoleEmptyState
                title="No materials yet"
                description="Add slides, videos, or links for students."
                icon={FileText}
              />
            ) : (
              materials.map((material) => (
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        Added {new Date(material.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-md border border-(--dashboard-border) bg-(--dashboard-panel) px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {material.kind}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <a href={material.uri} target="_blank" rel="noreferrer" className="underline">
                      {material.original_filename || material.uri}
                    </a>
                  </div>
                </div>
              ))
            )}
          </ConsolePanel>

          <ConsolePanel title="Add material" description="Share a file or URL." contentClassName="space-y-3">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Course
              </label>
              <DashboardSelect
                value={selectedCourseId ? String(selectedCourseId) : ""}
                onValueChange={(value) => setSelectedCourseId(Number(value))}
                options={courseOptions}
                placeholder="Select a course"
                disabled={courseOptions.length === 0}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Kind
              </label>
              <DashboardSelect
                value={kind}
                onValueChange={(value) => setKind(value as MaterialKind)}
                options={materialKinds}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Title
              </label>
              <input
                className={consoleInputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Week 2 slides"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Description
              </label>
              <textarea
                className={consoleTextareaClass}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional notes for students"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                URI
              </label>
              <input
                className={consoleInputClass}
                value={uri}
                onChange={(event) => setUri(event.target.value)}
                placeholder="https://... or file://..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Original filename
              </label>
              <input
                className={consoleInputClass}
                value={originalFilename}
                onChange={(event) => setOriginalFilename(event.target.value)}
                placeholder="optional"
              />
            </div>

            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}

            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <PlusCircle className="size-3.5" />
              )}
              Save material
            </Button>
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
