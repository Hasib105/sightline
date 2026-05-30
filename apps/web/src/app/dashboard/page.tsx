import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, ClipboardList, ShieldCheck, UsersRound, Video } from "lucide-react";

import { ConsolePage, ConsolePanel, ConsoleStat } from "@/components/dashboard/console";
import { StudentDashboard } from "@/app/dashboard/student-dashboard";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Dashboard | Sightline",
  description: "Sightline MVP dashboard.",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === "student") {
    return <StudentDashboard user={user} />;
  }

  return (
    <ConsolePage
      eyebrow="MVP"
      title="Sightline dashboard"
      description="The working surface is intentionally small for now: upload course materials, review alerts, and manage users through Django admin."
      meta={
        <>
          <span>
            Signed in as <span className="font-medium text-slate-700">{user.username}</span>
          </span>
          <span>Role: {user.role}</span>
        </>
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Roles" value={4} description="Admin, teacher, student, invigilator" />
        <ConsoleStat label="MVP flow" value="Video" description="Upload, analyze, review" />
        <ConsoleStat label="ProcBot" value="Later" description="Start with tab switch events" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ConsolePanel
          title="Teacher"
          description="Create courses, prepare exams, upload materials, and review student risk."
          actions={
            user.role === "teacher" || user.role === "admin" || user.is_superuser ? (
              <>
                <Link href="/dashboard/teacher/courses" className="dashboard-link-button">
                  <BookOpenCheck className="size-3.5" />
                  Courses
                </Link>
                <Link href="/dashboard/teacher/exams" className="dashboard-link-button">
                  <ClipboardList className="size-3.5" />
                  Exams
                </Link>
              </>
            ) : null
          }
        >
          <Video className="mb-3 size-5 text-slate-500" />
          <p className="text-sm text-slate-600">The teacher workspace now covers the core course, exam, material, and risk workflows.</p>
        </ConsolePanel>
        <ConsolePanel
          title="Invigilator"
          description="Reviews suspicious moments with evidence."
          actions={
            user.role === "invigilator" || user.role === "admin" || user.is_superuser ? (
              <Link href="/dashboard/invigilator" className="dashboard-link-button">
                <ShieldCheck className="size-3.5" />
                Open review
              </Link>
            ) : null
          }
        >
          <ShieldCheck className="mb-3 size-5 text-slate-500" />
          <p className="text-sm text-slate-600">Alert review stays human-controlled and audit-friendly.</p>
        </ConsolePanel>
        <ConsolePanel title="Admin" description="Uses Django admin for setup right now.">
          <UsersRound className="mb-3 size-5 text-slate-500" />
          <p className="text-sm text-slate-600">Seed data creates 1 admin, 3 invigilators, 5 teachers, and 20 students.</p>
        </ConsolePanel>
      </div>
    </ConsolePage>
  );
}
