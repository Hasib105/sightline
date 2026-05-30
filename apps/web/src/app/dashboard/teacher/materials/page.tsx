"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Layers3, Loader2, PlusCircle, RefreshCw, Trash2 } from "lucide-react";

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
  createCourseUnit,
  deleteCourseUnit,
  indexCourseContent,
  listCourseMaterials,
  listCourses,
  listCourseUnits,
} from "@/lib/dashboard-api";
import type { CourseMaterial } from "@/lib/types";

const materialKinds = [
  { value: "text", label: "Text" },
  { value: "video", label: "Video" },
  { value: "slide", label: "Slide" },
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "Document" },
  { value: "embed", label: "Embed" },
  { value: "url", label: "URL" },
] satisfies Array<{ value: MaterialKind; label: string }>;

type MaterialKind = "text" | "video" | "slide" | "pdf" | "doc" | "embed" | "url";

export default function TeacherMaterialsPage() {
  const queryClient = useQueryClient();
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const [selectedCourseIdState, setSelectedCourseId] = useState<number | null>(null);
  const selectedCourseId = selectedCourseIdState ?? courses[0]?.id ?? null;
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [kind, setKind] = useState<MaterialKind>("text");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentText, setContentText] = useState("");
  const [uri, setUri] = useState("");
  const [originalFilename, setOriginalFilename] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [unitTitle, setUnitTitle] = useState("");
  const [unitSummary, setUnitSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const materialsQuery = useQuery({
    queryKey: ["course-materials", selectedCourseId],
    queryFn: () => listCourseMaterials(selectedCourseId ?? 0),
    enabled: typeof selectedCourseId === "number",
  });
  const unitsQuery = useQuery({
    queryKey: ["course-units", selectedCourseId],
    queryFn: () => listCourseUnits(selectedCourseId ?? 0),
    enabled: typeof selectedCourseId === "number",
  });

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  );
  const materials: CourseMaterial[] = materialsQuery.data ?? [];
  const units = unitsQuery.data ?? [];
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) ?? null;
  const visibleMaterials = selectedUnitId
    ? materials.filter((item) => item.unit === selectedUnitId)
    : materials;
  const selectedUnitMaterials = selectedUnitId
    ? materials.filter((item) => item.unit === selectedUnitId)
    : [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) {
        throw new Error("Select a course before uploading materials.");
      }
      if (!title.trim()) {
        throw new Error("Title is required.");
      }
      if (!file && !uri.trim() && !contentText.trim()) {
        throw new Error("Add text, a URI, or a file.");
      }
      return createCourseMaterial(selectedCourseId, {
        kind,
        unit: selectedUnitId,
        title: title.trim(),
        description: description.trim() || undefined,
        content_text: contentText.trim() || undefined,
        uri: uri.trim() || undefined,
        original_filename: originalFilename.trim() || undefined,
        order: visibleMaterials.length + 1,
        file: file ?? undefined,
      });
    },
    onSuccess: async () => {
      setMessage(
        selectedUnit
          ? `Content item saved in Unit ${selectedUnit.order}. You can add another item to the same unit.`
          : "Course-level content item saved."
      );
      setTitle("");
      setDescription("");
      setContentText("");
      setUri("");
      setOriginalFilename("");
      setFile(null);
      await queryClient.invalidateQueries({
        queryKey: ["course-materials", selectedCourseId],
      });
    },
    onError: (error) => {
      const detail = error instanceof Error ? error.message : "Unable to save material.";
      setMessage(detail);
    },
  });

  const createUnitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) {
        throw new Error("Select a course before creating a unit.");
      }
      if (!unitTitle.trim()) {
        throw new Error("Unit title is required.");
      }
      return createCourseUnit(selectedCourseId, {
        title: unitTitle.trim(),
        summary: unitSummary.trim() || undefined,
        order: units.length + 1,
      });
    },
    onSuccess: async (unit) => {
      setMessage("Unit created.");
      setUnitTitle("");
      setUnitSummary("");
      setSelectedUnitId(unit.id);
      await queryClient.invalidateQueries({ queryKey: ["course-units", selectedCourseId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to create unit."),
  });

  const indexMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourseId) {
        throw new Error("Select a course before indexing.");
      }
      return indexCourseContent(selectedCourseId);
    },
    onSuccess: (result) => {
      setMessage(`Indexed ${result.indexed_chunks} content chunks for chat.`);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to index course."),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => deleteCourseUnit(unitId),
    onSuccess: async () => {
      setSelectedUnitId(null);
      setMessage("Unit and its attached content items deleted.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course-units", selectedCourseId] }),
        queryClient.invalidateQueries({ queryKey: ["course-materials", selectedCourseId] }),
      ]);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to delete unit."),
  });

  const confirmDeleteUnit = (unitId: number, label: string, contentCount: number) => {
    const confirmed = window.confirm(
      `Delete ${label}? This will also delete ${contentCount} attached content item${contentCount === 1 ? "" : "s"}.`
    );
    if (confirmed) {
      deleteUnitMutation.mutate(unitId);
    }
  };

  const courseOptions = courses.map((course) => ({
    value: String(course.id),
    label: `${course.code} · ${course.title}`,
  }));
  const unitOptions = [
    { value: "", label: "No unit" },
    ...units.map((unit) => ({
      value: String(unit.id),
      label: `Unit ${unit.order} · ${unit.title}`,
    })),
  ];

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
          label="Content items"
          value={visibleMaterials.length}
          description={selectedUnit ? `Unit ${selectedUnit.order}` : selectedCourse ? selectedCourse.title : "Select a course"}
        />
        <ConsoleStat label="Units" value={units.length} description="Course content sections" />
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
            title="Unit content"
            description="What students will see and what chat can retrieve."
            actions={
              <Button size="sm" variant="outline" onClick={() => indexMutation.mutate()} disabled={indexMutation.isPending}>
                {indexMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                Index
              </Button>
            }
            contentClassName="space-y-2"
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-md border px-2.5 py-1 text-xs ${selectedUnitId === null ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]" : "border-(--dashboard-border)"}`}
                onClick={() => setSelectedUnitId(null)}
              >
                All units
              </button>
              {units.map((unit) => (
                <button
                  type="button"
                  key={unit.id}
                  className={`rounded-md border px-2.5 py-1 text-xs ${selectedUnitId === unit.id ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]" : "border-(--dashboard-border)"}`}
                  onClick={() => setSelectedUnitId(unit.id)}
                >
                  Unit {unit.order} · {materials.filter((item) => item.unit === unit.id).length}
                </button>
              ))}
            </div>
            {units.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {units.map((unit) => {
                  const count = materials.filter((item) => item.unit === unit.id).length;
                  const selected = selectedUnitId === unit.id;
                  return (
                    <div
                      key={unit.id}
                      className={`rounded-md border p-3 transition ${selected ? "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]" : "border-(--dashboard-border) bg-(--dashboard-panel-muted)"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setSelectedUnitId(unit.id)}
                        >
                          <div className="text-sm font-semibold text-foreground">Unit {unit.order}: {unit.title}</div>
                          {unit.summary ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{unit.summary}</p> : null}
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="rounded-md border border-(--dashboard-border) bg-(--dashboard-panel) px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {count} items
                          </span>
                          <button
                            type="button"
                            title={`Delete Unit ${unit.order}`}
                            aria-label={`Delete Unit ${unit.order}`}
                            className="inline-flex size-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:border-red-500/30 dark:hover:bg-red-500/10"
                            onClick={() => confirmDeleteUnit(unit.id, `Unit ${unit.order}: ${unit.title}`, count)}
                            disabled={deleteUnitMutation.isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {materialsQuery.isLoading || unitsQuery.isLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : materialsQuery.error ? (
              <p className="text-sm text-red-600">{(materialsQuery.error as ApiError).message}</p>
            ) : visibleMaterials.length === 0 ? (
              <ConsoleEmptyState
                title={selectedUnit ? `No content in Unit ${selectedUnit.order}` : "No content yet"}
                description="Add text, videos, slides, files, embeds, or links for students."
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
                        {material.unit_title ? `Unit ${material.unit_order} · ${material.unit_title}` : "Course-level"} · Added {new Date(material.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-md border border-(--dashboard-border) bg-(--dashboard-panel) px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {material.kind}
                    </span>
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

          <ConsolePanel
            title="Add content item"
            description={
              selectedUnit
                ? `Saving to Unit ${selectedUnit.order}: ${selectedUnit.title}. Add as many items as needed.`
                : "Choose a unit, then add text, files, videos, slides, or embeds."
            }
            contentClassName="space-y-3"
          >
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

            <div className="rounded-md border border-(--dashboard-border) bg-(--dashboard-panel-muted) p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Layers3 className="size-3.5" />
                Create another unit
              </div>
              <div className="space-y-2">
                <input className={consoleInputClass} value={unitTitle} onChange={(event) => setUnitTitle(event.target.value)} placeholder="Unit 1: Introduction" />
                <textarea className={consoleTextareaClass} value={unitSummary} onChange={(event) => setUnitSummary(event.target.value)} placeholder="Short unit overview" />
                <Button size="sm" variant="outline" onClick={() => createUnitMutation.mutate()} disabled={createUnitMutation.isPending}>
                  {createUnitMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlusCircle className="size-3.5" />}
                  Add unit
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Save into unit
              </label>
              <DashboardSelect
                value={selectedUnitId ? String(selectedUnitId) : ""}
                onValueChange={(value) => setSelectedUnitId(value ? Number(value) : null)}
                options={unitOptions}
              />
              {selectedUnit ? (
                <p className="text-xs text-muted-foreground">
                  This unit currently has {selectedUnitMaterials.length} content item{selectedUnitMaterials.length === 1 ? "" : "s"}.
                </p>
              ) : null}
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
                Text / notes
              </label>
              <textarea
                className={`${consoleTextareaClass} min-h-28`}
                value={contentText}
                onChange={(event) => setContentText(event.target.value)}
                placeholder="Paste lesson notes, PDF text, slide narration, or summary for RAG."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                URL or embed URI
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
                File
              </label>
              <input
                className={consoleInputClass}
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
              Save content item
            </Button>
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
