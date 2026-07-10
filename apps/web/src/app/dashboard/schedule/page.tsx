"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, GraduationCap, Loader2 } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  SectionTabs,
  StatusBadge,
} from "@/components/dashboard/console";
import {
  campusDateKey,
  firstSessionWeekStart,
  formatScheduleDate,
  formatScheduleDateTime,
  mondayOfDateKey,
  WeekCalendar,
} from "@/components/dashboard/week-calendar";
import { ApiError, getMySchedule } from "@/lib/dashboard-api";
import type { ScheduledSession } from "@/lib/types";

const CAMPUS_TZ = "Asia/Dhaka";

type ScheduleView = "calendar" | "full";

function formatScheduleTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: CAMPUS_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function ScheduleFullList({ sessions }: { sessions: ScheduledSession[] }) {
  const byDate = useMemo(() => {
    const groups = new Map<string, ScheduledSession[]>();
    for (const session of sessions) {
      const key = campusDateKey(session.starts_at);
      const list = groups.get(key) ?? [];
      list.push(session);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([dateKey, daySessions]) => ({
        dateKey,
        label: formatScheduleDate(daySessions[0]!.starts_at),
        sessions: daySessions.sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      }));
  }, [sessions]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {byDate.map((day) => (
        <div key={day.dateKey} className="rounded-md border border-[var(--dashboard-border)] p-2.5">
          <p className="mb-2 text-xs font-semibold text-foreground">{day.label}</p>
          <div className="space-y-1.5">
            {day.sessions.map((session) => (
              <div
                key={session.id}
                className="rounded border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{session.course_code}</span>
                  <StatusBadge label={session.kind} tone={session.kind === "exam" ? "warning" : "default"} />
                </div>
                <p className="mt-0.5 text-muted-foreground">
                  {formatScheduleTime(session.starts_at)} · {session.hall_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentSchedulePage() {
  const scheduleQuery = useQuery({ queryKey: ["my-schedule"], queryFn: getMySchedule });
  const sessions = useMemo(() => scheduleQuery.data?.sessions ?? [], [scheduleQuery.data]);
  const defaultWeekStart = useMemo(
    () =>
      sessions.length > 0
        ? firstSessionWeekStart(sessions)
        : mondayOfDateKey(campusDateKey(new Date().toISOString())),
    [sessions]
  );
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const activeWeekStart = weekStart ?? defaultWeekStart;
  const [view, setView] = useState<ScheduleView>("calendar");

  const [now] = useState(() => Date.now());
  const upcomingExams = useMemo(
    () =>
      sessions
        .filter((session) => session.kind === "exam" && new Date(session.starts_at).getTime() >= now)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [sessions, now]
  );

  if (scheduleQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (scheduleQuery.error) {
    return <p className="p-6 text-sm text-red-600">{(scheduleQuery.error as ApiError).message}</p>;
  }

  return (
    <ConsolePage
      eyebrow="Student"
      title="My schedule"
      description="Week calendar or full semester list — switch tabs to change view."
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Sessions" value={sessions.length} icon={CalendarDays} />
        <ConsoleStat label="Upcoming exams" value={upcomingExams.length} icon={GraduationCap} />
        <ConsoleStat label="Courses" value={new Set(sessions.map((s) => s.course_code)).size} />
      </div>

      {upcomingExams.length > 0 ? (
        <ConsolePanel title="Upcoming exams" contentClassName="space-y-2">
          {upcomingExams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {exam.course_code} — {exam.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatScheduleDateTime(exam.starts_at)} · {exam.hall_name}
                </p>
              </div>
              <StatusBadge label="exam" tone="warning" />
            </div>
          ))}
        </ConsolePanel>
      ) : null}

      <ConsolePanel
        title="Schedule"
        description={view === "calendar" ? "Week view — use arrows to move between weeks." : "All sessions grouped by date."}
        contentClassName="space-y-3"
        actions={
          <SectionTabs
            value={view}
            onChange={setView}
            options={[
              { value: "calendar", label: "Calendar" },
              { value: "full", label: "Full list" },
            ]}
          />
        }
      >
        {sessions.length === 0 ? (
          <ConsoleEmptyState title="No sessions" description="Enroll in courses to see your schedule." icon={CalendarDays} />
        ) : view === "calendar" ? (
          <WeekCalendar sessions={sessions} weekStart={activeWeekStart} onWeekStartChange={setWeekStart} />
        ) : (
          <ScheduleFullList sessions={sessions} />
        )}
      </ConsolePanel>
    </ConsolePage>
  );
}
