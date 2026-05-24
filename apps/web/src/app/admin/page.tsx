"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpenCheck,
  Database,
  Loader2,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Wallet,
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

const modelModules = [
  {
    href: "/dashboard/admin/content",
    label: "Content",
    description: "Blog/news records and publish controls.",
    icon: BookOpenCheck,
  },
  {
    href: "/dashboard/admin/models",
    label: "Models",
    description: "Inspect and edit the available database models.",
    icon: Database,
  },
  {
    href: "/dashboard/admin/pricing",
    label: "Pricing",
    description: "Plans, credits, and billing controls.",
    icon: Wallet,
  },
  {
    href: "/dashboard/admin/proxy-endpoints",
    label: "Proxy Endpoints",
    description: "Runtime proxy inventory and diagnostics.",
    icon: SlidersHorizontal,
  },
  {
    href: "/dashboard/admin/system-settings",
    label: "System Settings",
    description: "Global JSON configuration and toggles.",
    icon: Settings2,
  },
] as const;

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
      description="Open the actual admin pages that already exist in the repo. Role management stays here; model pages live in the dashboard admin console."
      meta={<span>{roleModules.length + modelModules.length} visible sections · {overviewQuery.data?.total_users ?? users.length} users in local database</span>}
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
                    className={cn(buttonVariants({ variant: "outline" }), "h-auto items-start justify-start gap-3 rounded-xl p-4 text-left")}
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

          <ConsolePanel title="Model pages" description="These are the actual model/admin pages in the repo right now.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {modelModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link
                    key={module.href}
                    href={module.href}
                    className={cn(buttonVariants({ variant: "outline" }), "h-auto items-start justify-start gap-3 rounded-xl p-4 text-left")}
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
        </>
      )}
    </ConsolePage>
  );
}
