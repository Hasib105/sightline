"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, GraduationCap, Loader2 } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
} from "@/components/dashboard/console";
import { ApiError, getMySchedule } from "@/lib/dashboard-api";
import type { ScheduledSession } from "@/lib/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentSchedulePage() {
  const scheduleQuery = useQuery({ queryKey: ["my-schedule"], queryFn: getMySchedule });
  const sessions = useMemo(() => scheduleQuery.data?.sessions ?? [], [scheduleQuery.data]);

  const byDay = useMemo(() => {
    const groups: Record<number, ScheduledSession[]> = {};
    for (const session of sessions) {
      const day = new Date(session.starts_at).getDay();
      (groups[day] ??= []).push(session);
    }
    return groups;
  }, [sessions]);

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
      description="Your personalized weekly calendar and upcoming exams from enrolled courses."
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Sessions" value={sessions.length} icon={CalendarDays} />
        <ConsoleStat label="Upcoming exams" value={upcomingExams.length} icon={GraduationCap} />
        <ConsoleStat label="Courses" value={new Set(sessions.map((s) => s.course_code)).size} />
      </div>

      {upcomingExams.length > 0 ? (
        <ConsolePanel title="Upcoming exams" contentClassName="space-y-2">
          {upcomingExams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2.5">
              <div>
                <p className="text-sm font-semibold text-foreground">{exam.course_code} — {exam.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(exam.starts_at).toLocaleString()} · {exam.hall_name}
                </p>
              </div>
              <StatusBadge label="exam" tone="warning" />
            </div>
          ))}
        </ConsolePanel>
      ) : null}

      <ConsolePanel title="Weekly calendar" description="Sessions grouped by weekday." contentClassName="space-y-3">
        {sessions.length === 0 ? (
          <ConsoleEmptyState title="No sessions" description="Enroll in courses to see your schedule." icon={CalendarDays} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {DAYS.map((day, index) =>
              byDay[index] && byDay[index].length > 0 ? (
                <div key={day} className="rounded-md border border-[var(--dashboard-border)] p-2.5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{day}</p>
                  <div className="space-y-1.5">
                    {byDay[index]
                      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                      .map((session) => (
                        <div key={session.id} className="rounded border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{session.course_code}</span>
                            <StatusBadge label={session.kind} tone={session.kind === "exam" ? "warning" : "default"} />
                          </div>
                          <p className="mt-0.5 text-muted-foreground">
                            {new Date(session.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {session.hall_name}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </ConsolePanel>
    </ConsolePage>
  );
}
