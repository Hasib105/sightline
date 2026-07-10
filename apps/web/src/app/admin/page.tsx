"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpenCheck,
  Database,
  Loader2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { ConsolePage, ConsolePanel, ConsoleStat } from "@/components/dashboard/console";
import { buttonVariants } from "@/components/ui/button";
import { getAdminOverview, listAdminUsers } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

const roleModules = [
  {
    href: "/admin/users",
    label: "All users",
    description: "Create and manage every account.",
    icon: UsersRound,
  },
  {
    href: "/admin/teachers",
    label: "Teachers",
    description: "Teacher-specific account management.",
    icon: BookOpenCheck,
  },
  {
    href: "/admin/invigilators",
    label: "Invigilators",
    description: "Invigilator-specific account management.",
    icon: ShieldCheck,
  },
] as const;

const modelConsoleHref = "/dashboard/admin/models";

const backendModelGroups = [
  {
    title: "Academic data",
    description: "Core catalog and enrollment records from apps/api-django/sightline/models.py.",
    icon: BookOpenCheck,
    models: [
      "Department",
      "Semester",
      "Course",
      "CourseMaterial",
      "UserProfile",
      "StudentProfile",
      "CourseEnrollment",
      "FacultyProfile",
    ],
  },
  {
    title: "Exam operations",
    description: "Rooms, devices, sessions, attempts, and evidence.",
    icon: ShieldCheck,
    models: ["Hall", "Camera", "Seat", "ExamSession", "ExamVideo", "ExamAttempt", "AlertEvent", "EvidenceAsset", "ReviewerAction"],
  },
  {
    title: "Records and workflow",
    description: "Imports, analytics, schedules, reminders, and health checks.",
    icon: Database,
    models: [
      "AcademicRecordImport",
      "AttendanceRecord",
      "AssessmentRecord",
      "RiskAssessmentRun",
      "StudentRiskScore",
      "ClassSchedule",
      "ExamSchedule",
      "ReminderRule",
      "NotificationEvent",
      "OperationalHealth",
    ],
  },
] as const;

const backendModelCount = backendModelGroups.reduce((total, group) => total + group.models.length, 0);

export default function AdminOverviewPage() {
  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
  });
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: listAdminUsers,
  });

  const users = usersQuery.data ?? [];
  const roleCount = (role: string) => users.filter((user) => user.role === role).length;

  return (
    <ConsolePage
      eyebrow="Admin"
      title="MVP admin"
      description="Open the actual admin pages that already exist in the repo. Role management stays here; backend model pages live in the dashboard admin console."
      meta={
        <span>
          {roleModules.length + backendModelGroups.length} visible sections · {backendModelCount} backend models ·{" "}
          {overviewQuery.data?.total_users ?? users.length} users in local database
        </span>
      }
      actions={
        <Link href="/admin/users" className={cn(buttonVariants({ size: "sm" }), "gap-2")}>
          Manage users
          <ArrowRight className="size-4" />
        </Link>
      }
    >
      {overviewQuery.isLoading || usersQuery.isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-7 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-4">
            <ConsoleStat label="Admins" value={roleCount("admin")} />
            <ConsoleStat label="Invigilators" value={roleCount("invigilator")} />
            <ConsoleStat label="Teachers" value={roleCount("teacher")} />
            <ConsoleStat label="Students" value={roleCount("student")} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ConsolePanel title="Current MVP scope" description="The first build is only the useful core.">
              <div className="flex gap-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--dashboard-accent)]" />
                <p>
                  Teacher uploads an exam video, the worker analyzes it, and invigilators review evidence-backed alerts.
                  Live cameras and ProcBot stay out of the MVP.
                </p>
              </div>
            </ConsolePanel>
            <ConsolePanel title="Seed shape" description="Expected local demo users.">
              <div className="flex gap-3 text-sm text-muted-foreground">
                <UsersRound className="mt-0.5 size-5 shrink-0 text-[var(--dashboard-accent)]" />
                <p>Seed creates 1 admin, 3 invigilators, 5 teachers, and 20 students. All use password sightline.</p>
              </div>
            </ConsolePanel>
          </div>

          <ConsolePanel title="Role pages" description="The pages already available for user management.">
            <div className="grid gap-3 md:grid-cols-3">
              {roleModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.href}
                    href={module.href}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "h-auto items-start justify-start gap-3 rounded-xl p-4 text-left"
                    )}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{module.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{module.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </ConsolePanel>

          <ConsolePanel title="Backend model pages" description="These labels come from apps/api-django/sightline/models.py, not from fake admin pages.">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-sm font-medium text-slate-950">Model admin console</div>
                <div className="mt-1 text-xs text-muted-foreground">{backendModelCount} Django models grouped from sightline/models.py.</div>
              </div>
              <Link href={modelConsoleHref} className={cn(buttonVariants({ size: "sm" }), "gap-2")}>
                Open model console
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {backendModelGroups.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.title} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                      <Icon className="size-4 text-[var(--dashboard-accent)]" />
                      {group.title}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{group.description}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.models.map((model) => (
                        <span key={model} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                          {model}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ConsolePanel>
        </>
      )}
    </ConsolePage>
  );
}
