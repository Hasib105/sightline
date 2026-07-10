"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ScheduledSession } from "@/lib/types";

const CAMPUS_TZ = "Asia/Dhaka";
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 18;
const HOUR_HEIGHT_PX = 56;

const COURSE_COLORS = [
  "#1a73e8",
  "#34a853",
  "#f9ab00",
  "#d93025",
  "#9334e6",
  "#00acc1",
  "#e67c73",
  "#7986cb",
];

export function campusDateKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TZ }).format(new Date(iso));
}

export function formatScheduleDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: CAMPUS_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatScheduleTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: CAMPUS_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatScheduleDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: CAMPUS_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function campusTimeMinutes(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function dateKeyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mondayOfDateKey(dateKey: string) {
  const date = dateKeyToDate(dateKey);
  const weekday = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - (weekday === 0 ? 6 : weekday - 1));
  return monday;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function courseColor(courseCode: string) {
  let hash = 0;
  for (const char of courseCode) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const startFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(weekStart);
  const endFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: weekStart.getFullYear() === weekEnd.getFullYear() ? undefined : "numeric",
  }).format(weekEnd);
  const year =
    weekStart.getFullYear() === weekEnd.getFullYear()
      ? `, ${weekStart.getFullYear()}`
      : "";
  return `${startFmt} – ${endFmt}${year}`;
}

function formatDayHeader(date: Date, todayKey: string) {
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
  const day = date.getDate();
  const dateKey = toDateKey(date);
  const isToday = dateKey === todayKey;
  return { weekday, day, dateKey, isToday };
}

type LayoutEvent = {
  session: ScheduledSession;
  topPx: number;
  heightPx: number;
  column: number;
  columnCount: number;
};

function layoutDayEvents(daySessions: ScheduledSession[]): LayoutEvent[] {
  const gridStart = GRID_START_HOUR * 60;
  const gridEnd = GRID_END_HOUR * 60;
  const sorted = [...daySessions].sort((left, right) => left.starts_at.localeCompare(right.starts_at));

  const placed: Array<LayoutEvent & { startMin: number; endMin: number }> = [];

  for (const session of sorted) {
    const startMin = campusTimeMinutes(session.starts_at);
    const endMin = campusTimeMinutes(session.ends_at);
    const clampedStart = Math.max(startMin, gridStart);
    const clampedEnd = Math.min(endMin, gridEnd);
    if (clampedEnd <= gridStart || clampedStart >= gridEnd) {
      continue;
    }

    const overlapping = placed.filter(
      (item) => item.startMin < clampedEnd && item.endMin > clampedStart
    );
    const usedColumns = new Set(overlapping.map((item) => item.column));
    let column = 0;
    while (usedColumns.has(column)) {
      column += 1;
    }
    const columnCount = Math.max(column + 1, ...overlapping.map((item) => item.columnCount), 1);
    for (const item of overlapping) {
      item.columnCount = columnCount;
    }

    const topPx = ((clampedStart - gridStart) / 60) * HOUR_HEIGHT_PX;
    const heightPx = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT_PX, 28);

    placed.push({
      session,
      topPx,
      heightPx,
      column,
      columnCount,
      startMin: clampedStart,
      endMin: clampedEnd,
    });
  }

  return placed;
}

function formatEventTime(session: ScheduledSession) {
  const start = new Intl.DateTimeFormat(undefined, {
    timeZone: CAMPUS_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(session.starts_at));
  const end = new Intl.DateTimeFormat(undefined, {
    timeZone: CAMPUS_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(session.ends_at));
  return `${start} – ${end}`;
}

type WeekCalendarProps = {
  sessions: ScheduledSession[];
  weekStart: Date;
  onWeekStartChange: (date: Date) => void;
};

export function WeekCalendar({ sessions, weekStart, onWeekStartChange }: WeekCalendarProps) {
  const todayKey = campusDateKey(new Date().toISOString());
  const totalHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT_PX;

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => formatDayHeader(addDays(weekStart, index), todayKey));
  }, [weekStart, todayKey]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, ScheduledSession[]>();
    for (const session of sessions) {
      const key = campusDateKey(session.starts_at);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return map;
  }, [sessions]);

  const hourLabels = useMemo(() => {
    return Array.from({ length: GRID_END_HOUR - GRID_START_HOUR + 1 }, (_, index) => GRID_START_HOUR + index);
  }, []);

  function goWeek(offset: number) {
    onWeekStartChange(addDays(weekStart, offset * 7));
  }

  function goToday() {
    onWeekStartChange(mondayOfDateKey(todayKey));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dashboard-border)] px-3 py-2">
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={goToday}>
            Today
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => goWeek(-1)} aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => goWeek(1)} aria-label="Next week">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <p className="text-sm font-semibold text-foreground">{formatWeekRange(weekStart)}</p>
        <p className="text-xs text-muted-foreground">Week view · campus time</p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-[var(--dashboard-border)]">
            <div />
            {weekDays.map((day) => (
              <div
                key={day.dateKey}
                className={`border-l border-[var(--dashboard-border)] px-2 py-2 text-center ${
                  day.isToday ? "bg-[var(--dashboard-accent-soft)]" : ""
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{day.weekday}</p>
                <p
                  className={`mt-0.5 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold ${
                    day.isToday ? "bg-[#1a73e8] text-white" : "text-foreground"
                  }`}
                >
                  {day.day}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
            <div className="relative" style={{ height: totalHeight }}>
              {hourLabels.slice(0, -1).map((hour, index) => (
                <div
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground"
                  style={{ top: index * HOUR_HEIGHT_PX }}
                >
                  {formatHourLabel(hour)}
                </div>
              ))}
            </div>

            {weekDays.map((day) => {
              const daySessions = sessionsByDate.get(day.dateKey) ?? [];
              const layout = layoutDayEvents(daySessions);

              return (
                <div
                  key={day.dateKey}
                  className={`relative border-l border-[var(--dashboard-border)] ${
                    day.isToday ? "bg-[var(--dashboard-accent-soft)]/40" : ""
                  }`}
                  style={{ height: totalHeight }}
                >
                  {hourLabels.slice(0, -1).map((hour, index) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute inset-x-0 border-t border-[var(--dashboard-border)]/70"
                      style={{ top: index * HOUR_HEIGHT_PX }}
                    />
                  ))}

                  {layout.map((item) => {
                    const color = courseColor(item.session.course_code ?? "course");
                    const width = 100 / item.columnCount;
                    const left = width * item.column;

                    return (
                      <div
                        key={item.session.id}
                        className="absolute z-10 overflow-hidden rounded-md border px-1.5 py-1 text-[10px] leading-tight shadow-sm"
                        style={{
                          top: item.topPx,
                          height: item.heightPx,
                          left: `calc(${left}% + 2px)`,
                          width: `calc(${width}% - 4px)`,
                          backgroundColor: `${color}22`,
                          borderColor: color,
                          color: "var(--foreground)",
                        }}
                        title={`${item.session.course_code} · ${formatEventTime(item.session)} · ${item.session.hall_name}`}
                      >
                        <p className="truncate font-semibold">{item.session.course_code}</p>
                        <p className="truncate text-muted-foreground">{formatEventTime(item.session)}</p>
                        {item.heightPx >= 44 ? (
                          <p className="truncate text-muted-foreground">{item.session.hall_name}</p>
                        ) : null}
                        {item.session.kind === "exam" ? (
                          <p className="truncate font-medium" style={{ color }}>
                            Exam
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function firstSessionWeekStart(sessions: ScheduledSession[]) {
  if (sessions.length === 0) {
    return mondayOfDateKey(campusDateKey(new Date().toISOString()));
  }
  const earliest = [...sessions]
    .map((session) => campusDateKey(session.starts_at))
    .sort()[0]!;
  return mondayOfDateKey(earliest);
}
