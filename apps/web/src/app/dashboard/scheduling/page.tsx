"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
  consoleInputClass,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  checkScheduleConflicts,
  createSchedule,
  deleteSchedule,
  generateSchedule,
  listCourses,
  listHalls,
  listInvigilators,
  listSchedules,
} from "@/lib/dashboard-api";
import type { ScheduleConflict } from "@/lib/types";

const emptyForm = {
  kind: "class" as "class" | "exam",
  course: "",
  hall: "",
  invigilator: "",
  title: "",
  starts_at: "",
  ends_at: "",
};

export default function SchedulingPage() {
  const queryClient = useQueryClient();
  const schedulesQuery = useQuery({ queryKey: ["schedules"], queryFn: () => listSchedules() });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const hallsQuery = useQuery({ queryKey: ["halls"], queryFn: listHalls });
  const invigilatorsQuery = useQuery({ queryKey: ["invigilators"], queryFn: listInvigilators });

  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [genForm, setGenForm] = useState({ kind: "class" as "class" | "exam", start_date: "", days: "5" });

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const courseOptions = (coursesQuery.data ?? []).map((c) => ({ value: String(c.id), label: `${c.code} · ${c.title}` }));
  const hallOptions = (hallsQuery.data ?? []).map((h) => ({ value: String(h.id), label: `${h.name} (cap ${h.capacity})` }));
  const invigilatorOptions = [
    { value: "", label: "Unassigned" },
    ...(invigilatorsQuery.data ?? []).map((u) => ({ value: String(u.id), label: u.username })),
  ];

  const canCheck = Boolean(form.hall && form.starts_at && form.ends_at);
  const conflictQuery = useQuery({
    queryKey: ["schedule-conflicts", form.hall, form.starts_at, form.ends_at, form.course, form.invigilator],
    queryFn: () =>
      checkScheduleConflicts({
        hall: Number(form.hall),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
        course: form.course ? Number(form.course) : null,
        invigilator: form.invigilator ? Number(form.invigilator) : null,
      }),
    enabled: canCheck,
  });
  const liveConflicts: ScheduleConflict[] = conflictQuery.data?.conflicts ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.course || !form.hall || !form.starts_at || !form.ends_at) {
        throw new Error("Course, hall, start and end are required.");
      }
      return createSchedule({
        kind: form.kind,
        course: Number(form.course),
        hall: Number(form.hall),
        invigilator: form.invigilator ? Number(form.invigilator) : null,
        title: form.title.trim(),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
      });
    },
    onSuccess: async (session) => {
      const count = session.conflicts?.length ?? 0;
      setMessage(count ? `Created with ${count} conflict(s) — review below.` : "Scheduled with no conflicts.");
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to create schedule."),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateSchedule({
        kind: genForm.kind,
        start_date: genForm.start_date || undefined,
        days: Number(genForm.days) || 5,
      }),
    onSuccess: async (result) => {
      const parts = [`Placed ${result.created.length} session(s)`];
      if (result.skipped.length) parts.push(`skipped ${result.skipped.length}`);
      if (result.detail) parts.push(result.detail);
      setMessage(parts.join(" · "));
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to generate schedule."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSchedule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });

  const examCount = useMemo(() => schedules.filter((s) => s.kind === "exam").length, [schedules]);
  const conflictCount = useMemo(
    () => schedules.filter((s) => (s.conflicts?.length ?? 0) > 0).length,
    [schedules]
  );

  const loading = schedulesQuery.isLoading || coursesQuery.isLoading;
  const error = schedulesQuery.error ?? coursesQuery.error;

  return (
    <ConsolePage
      eyebrow="Administration"
      title="Smart scheduling"
      description="Class and exam scheduling with room and invigilator assignment plus automatic conflict detection."
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Sessions" value={schedules.length} description="Classes + exams" icon={CalendarClock} />
        <ConsoleStat label="Exams" value={examCount} description="Scheduled sittings" />
        <ConsoleStat label="With conflicts" value={conflictCount} description="Need attention" icon={AlertTriangle} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.55fr)]">
          <ConsolePanel title="Scheduled sessions" description="All classes and exams." contentClassName="space-y-2">
            {schedules.length === 0 ? (
              <ConsoleEmptyState title="Nothing scheduled" description="Create a class or exam on the right." icon={CalendarClock} />
            ) : (
              schedules.map((session) => (
                <div key={session.id} className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge label={session.kind} tone={session.kind === "exam" ? "warning" : "default"} />
                        <span className="text-sm font-semibold text-foreground">{session.course_code}</span>
                        <span className="truncate text-xs text-muted-foreground">{session.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(session.starts_at).toLocaleString()} → {new Date(session.ends_at).toLocaleTimeString()} · {session.hall_name}
                        {session.invigilator_username ? ` · ${session.invigilator_username}` : ""}
                      </p>
                      {(session.conflicts?.length ?? 0) > 0 ? (
                        <ul className="mt-1 space-y-0.5">
                          {session.conflicts!.map((conflict, index) => (
                            <li key={index} className="text-xs text-red-600">⚠ {conflict.message}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <Button size="icon-sm" variant="ghost" onClick={() => deleteMutation.mutate(session.id)} aria-label="Delete session">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </ConsolePanel>

          <div className="space-y-3">
          <ConsolePanel title="Auto-generate (AI)" description="Place one conflict-free sitting per course across free rooms and slots." contentClassName="space-y-3">
            <DashboardSelect
              value={genForm.kind}
              onValueChange={(value) => setGenForm((prev) => ({ ...prev, kind: value as "class" | "exam" }))}
              options={[
                { value: "class", label: "Class" },
                { value: "exam", label: "Exam" },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">From (optional)</label>
                <input
                  type="date"
                  className={consoleInputClass}
                  value={genForm.start_date}
                  onChange={(event) => setGenForm((prev) => ({ ...prev, start_date: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Days</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  className={consoleInputClass}
                  value={genForm.days}
                  onChange={(event) => setGenForm((prev) => ({ ...prev, days: event.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Auto-generate schedule
            </Button>
          </ConsolePanel>

          <ConsolePanel title="New session" description="Room + invigilator with live conflict check." contentClassName="space-y-3">
            <DashboardSelect
              value={form.kind}
              onValueChange={(value) => setForm((prev) => ({ ...prev, kind: value as "class" | "exam" }))}
              options={[
                { value: "class", label: "Class" },
                { value: "exam", label: "Exam" },
              ]}
            />
            <DashboardSelect
              value={form.course}
              onValueChange={(value) => setForm((prev) => ({ ...prev, course: value }))}
              options={courseOptions}
              placeholder="Course"
            />
            <DashboardSelect
              value={form.hall}
              onValueChange={(value) => setForm((prev) => ({ ...prev, hall: value }))}
              options={hallOptions}
              placeholder="Room"
            />
            <DashboardSelect
              value={form.invigilator}
              onValueChange={(value) => setForm((prev) => ({ ...prev, invigilator: value }))}
              options={invigilatorOptions}
              placeholder="Invigilator (optional)"
            />
            <input
              className={consoleInputClass}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Title (e.g. Week 5 lecture)"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                className={consoleInputClass}
                value={form.starts_at}
                onChange={(event) => setForm((prev) => ({ ...prev, starts_at: event.target.value }))}
              />
              <input
                type="datetime-local"
                className={consoleInputClass}
                value={form.ends_at}
                onChange={(event) => setForm((prev) => ({ ...prev, ends_at: event.target.value }))}
              />
            </div>

            {canCheck ? (
              liveConflicts.length > 0 ? (
                <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30">
                  {liveConflicts.map((conflict, index) => (
                    <div key={index}>⚠ {conflict.message}</div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600">No conflicts for this slot.</p>
              )
            ) : null}

            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Schedule session
            </Button>
          </ConsolePanel>
          </div>
        </div>
      )}
    </ConsolePage>
  );
}
