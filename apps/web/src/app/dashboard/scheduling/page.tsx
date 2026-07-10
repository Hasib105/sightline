"use client";

import { useEffect, useMemo, useState } from "react";
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
import { DashboardCheckbox, DashboardCheckboxGroup, DashboardSelect } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  bulkCreateSchedules,
  checkScheduleConflicts,
  clearAllSchedules,
  createSchedule,
  deleteSchedule,
  generateSchedulePlan,
  listCourses,
  listHalls,
  listInvigilators,
  listSchedules,
} from "@/lib/dashboard-api";
import type { ScheduleConflict, ScheduleGenerateResponse, ScheduleSuggestion } from "@/lib/types";

const emptyForm = {
  kind: "class" as "class" | "exam",
  course: "",
  hall: "",
  invigilator: "",
  title: "",
  starts_at: "",
  ends_at: "",
};

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];

function formatTermRange(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const startLabel = startDate.toLocaleDateString(undefined, { month: "long" });
  const endLabel = endDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

const campusDateTime = new Intl.DateTimeFormat(undefined, {
  timeZone: "Asia/Dhaka",
  dateStyle: "short",
  timeStyle: "short",
});

const campusTime = new Intl.DateTimeFormat(undefined, {
  timeZone: "Asia/Dhaka",
  timeStyle: "short",
});

export default function SchedulingPage() {
  const queryClient = useQueryClient();
  const schedulesQuery = useQuery({ queryKey: ["schedules"], queryFn: () => listSchedules() });
  const coursesQuery = useQuery({ queryKey: ["courses"], queryFn: listCourses });
  const hallsQuery = useQuery({ queryKey: ["halls"], queryFn: listHalls });
  const invigilatorsQuery = useQuery({ queryKey: ["invigilators"], queryFn: listInvigilators });

  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [termStart, setTermStart] = useState("2026-01-15");
  const [termEnd, setTermEnd] = useState("2026-04-30");
  const [teachingWeekdays, setTeachingWeekdays] = useState<number[]>([0, 1, 2, 3]);
  const [weekendDays, setWeekendDays] = useState<number[]>([4, 5]);
  const [dayStartHour, setDayStartHour] = useState(8);
  const [dayEndHour, setDayEndHour] = useState(16);
  const [classDurationMinutes, setClassDurationMinutes] = useState(90);
  const [classesPerWeek, setClassesPerWeek] = useState(3);
  const [optimizeConflicts, setOptimizeConflicts] = useState(true);
  const [aiKind, setAiKind] = useState<"class" | "exam">("class");
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [scheduleRules, setScheduleRules] = useState<ScheduleGenerateResponse["rules"] | null>(null);

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const courseOptions = (coursesQuery.data ?? []).map((c) => ({ value: String(c.id), label: `${c.code} · ${c.title}` }));
  const hallOptions = (hallsQuery.data ?? []).map((h) => ({ value: String(h.id), label: `${h.name} (cap ${h.capacity})` }));
  const invigilatorOptions = [
    { value: "", label: "Unassigned" },
    ...(invigilatorsQuery.data ?? []).map((u) => ({ value: String(u.id), label: u.username })),
  ];
  const allCourseIds = courseOptions.map((option) => option.value);
  const allSelected = allCourseIds.length > 0 && selectedCourseIds.length === allCourseIds.length;
  const roomCount = hallsQuery.data?.length ?? scheduleRules?.room_count ?? 0;

  const toggleTeachingDay = (day: number) => {
    if (weekendDays.includes(day)) return;
    setTeachingWeekdays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b)
    );
  };

  const toggleWeekendDay = (day: number) => {
    setWeekendDays((current) => {
      const enabled = !current.includes(day);
      const next = enabled ? [...current, day].sort((a, b) => a - b) : current.filter((value) => value !== day);
      if (enabled) {
        setTeachingWeekdays((teaching) => teaching.filter((value) => value !== day));
      }
      return next;
    });
  };

  useEffect(() => {
    if (courseOptions.length > 0 && selectedCourseIds.length === 0) {
      setSelectedCourseIds(courseOptions.map((option) => option.value));
    }
  }, [courseOptions, selectedCourseIds.length]);

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
    enabled: canCheck && mode === "manual",
  });
  const liveConflicts: ScheduleConflict[] = conflictQuery.data?.conflicts ?? [];

  const generateMutation = useMutation({
    mutationFn: () => {
      if (selectedCourseIds.length === 0) {
        throw new Error("Select at least one course.");
      }
      return generateSchedulePlan({
        courses: selectedCourseIds.map(Number),
        kind: aiKind,
        term_start: termStart,
        term_end: termEnd,
        teaching_weekdays: teachingWeekdays,
        weekend_days: weekendDays,
        day_start_hour: dayStartHour,
        day_end_hour: dayEndHour,
        class_duration_minutes: classDurationMinutes,
        classes_per_week: classesPerWeek,
        optimize_conflicts: optimizeConflicts,
        max_conflict_ratio: 0.05,
        shuffle_seed: Date.now(),
      });
    },
    onSuccess: (result) => {
      setSuggestions(result.suggestions);
      setScheduleRules(result.rules ?? null);
      if (result.count === 0) {
        setMessage("No open slots in this semester. Check teaching days, campus hours, or add more rooms.");
        return;
      }
      const conflictCount = result.suggestions.filter((item) => item.conflicts.length > 0).length;
      const rules = result.rules;
      const opt = rules?.optimization;
      const cleanPct = opt?.clean_ratio != null ? Math.round(opt.clean_ratio * 100) : null;
      const sessionLabel = aiKind === "exam" ? "exams" : "class sessions";
      const weekNote = rules?.weeks_planned ? ` across ${rules.weeks_planned} weeks` : "";
      const overlapNote =
        optimizeConflicts && cleanPct != null
          ? ` · ${cleanPct}% overlap-free (≤5% overlap allowed)`
          : "";
      const skippedNote = opt?.skipped ? ` · ${opt.skipped} could not be placed` : "";
      setMessage(
        conflictCount
          ? `Generated ${result.count} ${sessionLabel}${weekNote} (${conflictCount} with conflicts${overlapNote}).`
          : `Generated ${result.count} ${sessionLabel}${weekNote} · ${rules?.hours ?? `${hourLabel(dayStartHour)}–${hourLabel(dayEndHour)}`} · ${roomCount} rooms${overlapNote}${skippedNote}.`
      );
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to generate schedule."),
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      if (suggestions.length === 0) {
        throw new Error("Generate a schedule plan first.");
      }
      return bulkCreateSchedules(suggestions);
    },
    onSuccess: async (created) => {
      setMessage(`Scheduled ${created.length} sessions.`);
      setSuggestions([]);
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to apply schedule."),
  });

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSchedule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => clearAllSchedules(),
    onSuccess: async (result) => {
      setSuggestions([]);
      setScheduleRules(null);
      setMessage(result.message);
      await queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to delete schedules."),
  });

  function handleDeleteAll() {
    if (schedules.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      `Delete all ${schedules.length} scheduled session(s)? You can generate a fresh plan after.`
    );
    if (confirmed) {
      clearAllMutation.mutate();
    }
  }

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
      description="AI-generate a full semester of classes or exams, or add one session manually."
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
          <ConsolePanel
            title="Scheduled sessions"
            description="All classes and exams."
            contentClassName="space-y-2"
            actions={
              schedules.length > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeleteAll}
                  disabled={clearAllMutation.isPending}
                >
                  {clearAllMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  Delete all
                </Button>
              ) : null
            }
          >
            {schedules.length === 0 ? (
              <ConsoleEmptyState title="Nothing scheduled" description="Generate or create sessions on the right." icon={CalendarClock} />
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
                        {campusDateTime.format(new Date(session.starts_at))} → {campusTime.format(new Date(session.ends_at))} · {session.hall_name}
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

          <ConsolePanel
            title={mode === "ai" ? "AI quick generate" : "Manual session"}
            description={mode === "ai" ? "Pick courses and semester dates — AI assigns rooms and times." : "One session with live conflict check."}
            contentClassName="space-y-3"
            actions={
              <div className="flex gap-1">
                <Button size="sm" variant={mode === "ai" ? "default" : "outline"} onClick={() => setMode("ai")}>
                  AI generate
                </Button>
                <Button size="sm" variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")}>
                  Manual
                </Button>
              </div>
            }
          >
            {mode === "ai" ? (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Courses</label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DashboardCheckbox
                      checked={allSelected}
                      onCheckedChange={(checked) => setSelectedCourseIds(checked ? allCourseIds : [])}
                      aria-label="Select all courses"
                    />
                    Select all
                  </label>
                </div>
                <DashboardCheckboxGroup
                  values={selectedCourseIds}
                  onValuesChange={setSelectedCourseIds}
                  options={courseOptions}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Semester from</label>
                    <input
                      type="date"
                      className={consoleInputClass}
                      value={termStart}
                      onChange={(event) => setTermStart(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Semester to</label>
                    <input
                      type="date"
                      className={consoleInputClass}
                      value={termEnd}
                      onChange={(event) => setTermEnd(event.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Course period: {formatTermRange(termStart, termEnd)}
                  {scheduleRules?.holidays?.length ? ` · ${scheduleRules.holidays.length} holidays skipped` : ""}
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Teaching days</label>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const isWeekend = weekendDays.includes(day.value);
                      const isTeaching = teachingWeekdays.includes(day.value);
                      return (
                        <Button
                          key={`teach-${day.value}`}
                          type="button"
                          size="sm"
                          variant={isTeaching ? "default" : "outline"}
                          disabled={isWeekend}
                          onClick={() => toggleTeachingDay(day.value)}
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Weekend (off)</label>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAY_OPTIONS.map((day) => (
                      <Button
                        key={`weekend-${day.value}`}
                        type="button"
                        size="sm"
                        variant={weekendDays.includes(day.value) ? "secondary" : "outline"}
                        onClick={() => toggleWeekendDay(day.value)}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Session type</label>
                  <DashboardSelect
                    value={aiKind}
                    onValueChange={(value) => setAiKind(value as "class" | "exam")}
                    options={[
                      { value: "class", label: "Class (weekly through semester)" },
                      { value: "exam", label: "Exam (one sitting per course)" },
                    ]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Campus hours</label>
                    <div className="grid grid-cols-2 gap-1">
                      <DashboardSelect
                        value={String(dayStartHour)}
                        onValueChange={(value) => setDayStartHour(Number(value))}
                        options={[6, 7, 8, 9, 10].map((hour) => ({ value: String(hour), label: hourLabel(hour) }))}
                      />
                      <DashboardSelect
                        value={String(dayEndHour)}
                        onValueChange={(value) => setDayEndHour(Number(value))}
                        options={[12, 13, 14, 15, 16, 17, 18].map((hour) => ({ value: String(hour), label: hourLabel(hour) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {aiKind === "exam" ? "Exam length" : "Class length"}
                    </label>
                    {aiKind === "exam" ? (
                      <p className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-2.5 py-2 text-sm text-foreground">
                        2 hours per exam
                      </p>
                    ) : (
                      <DashboardSelect
                        value={String(classDurationMinutes)}
                        onValueChange={(value) => setClassDurationMinutes(Number(value))}
                        options={[
                          { value: "60", label: "1 hour" },
                          { value: "90", label: "1 hour 30 min" },
                          { value: "120", label: "2 hours" },
                        ]}
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {aiKind === "class" ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Classes / week</label>
                      <DashboardSelect
                        value={String(classesPerWeek)}
                        onValueChange={(value) => setClassesPerWeek(Number(value))}
                        options={[
                          { value: "3", label: "3 per course" },
                          { value: "4", label: "4 per course" },
                        ]}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Exams</label>
                      <p className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-2.5 py-2 text-sm text-foreground">
                        1 per selected course
                      </p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rooms</label>
                    <p className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-2.5 py-2 text-sm text-foreground">
                      {roomCount} available
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hourLabel(dayStartHour)}–{hourLabel(dayEndHour)}
                  {aiKind === "exam" ? " · 2 h exams" : ` · ${classDurationMinutes} min classes · ${classesPerWeek}/week`}
                  {" · "}
                  {teachingWeekdays.map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label).filter(Boolean).join(", ") || "no teaching days"}
                  {" · weekend "}
                  {weekendDays.map((day) => WEEKDAY_OPTIONS.find((option) => option.value === day)?.label).filter(Boolean).join(", ") || "none"}
                  {scheduleRules?.weeks_planned ? ` · ${scheduleRules.weeks_planned} teaching weeks` : ""}
                </p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DashboardCheckbox
                    checked={optimizeConflicts}
                    onCheckedChange={(checked) => setOptimizeConflicts(Boolean(checked))}
                    aria-label="AI optimize overlaps"
                  />
                  AI fix overlaps (aim ≥95% clean, ≤5% may overlap)
                </label>
                <Button size="sm" variant="outline" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  Generate plan
                </Button>
                {suggestions.length > 0 ? (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2">
                    {suggestions.map((item, index) => (
                      <div key={`${item.course}-${index}`} className="text-xs text-foreground">
                        <span className="font-semibold">{item.course_code}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {campusDateTime.format(new Date(item.starts_at))} · {item.hall_name}
                        </span>
                        {item.conflicts.length > 0 ? (
                          <span className="text-red-600"> · {item.conflicts.length} conflict(s)</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                <Button size="sm" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending || suggestions.length === 0}>
                  {applyMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Apply all ({suggestions.length})
                </Button>
              </>
            ) : (
              <>
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
                <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  Schedule session
                </Button>
              </>
            )}

            {message ? (
              <p className={`text-xs ${message.toLowerCase().includes("invalid") || message.toLowerCase().includes("unable") || message.toLowerCase().includes("select") ? "text-red-600" : "text-muted-foreground"}`}>
                {message}
              </p>
            ) : null}
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
