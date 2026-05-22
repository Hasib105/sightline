"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, ShieldCheck, UsersRound } from "lucide-react";

import { ConsolePage, ConsolePanel, ConsoleStat } from "@/components/dashboard/console";
import { buttonVariants } from "@/components/ui/button";
import { getAdminOverview, listAdminUsers } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

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
      description="Keep setup small for now. Manage users here; video upload and alert review are the next dashboard slices."
      meta={<span>{overviewQuery.data?.total_users ?? users.length} users in local database</span>}
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
        </>
      )}
    </ConsolePage>
  );
}
