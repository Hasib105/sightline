"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  Command,
  CreditCard,
  Database,
  Fingerprint,
  LayoutDashboard,
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

const adminModules = [
  {
    href: "/admin",
    label: "Overview",
    description: "Admin landing page and summary metrics.",
    icon: LayoutDashboard,
  },
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
  {
    href: "/admin/analytics",
    label: "Analytics",
    description: "Usage, health, and business signals.",
    icon: Bell,
  },
  {
    href: "/admin/plans",
    label: "Plans & Credits",
    description: "Pricing, credits, and billing setup.",
    icon: Wallet,
  },
  {
    href: "/admin/provider-routing",
    label: "Provider Routing",
    description: "How model traffic is routed.",
    icon: Command,
  },
  {
    href: "/admin/provider-credentials",
    label: "Provider Credentials",
    description: "Manage credentials and access.",
    icon: Fingerprint,
  },
  {
    href: "/admin/proxies",
    label: "Proxies",
    description: "Proxy inventory and health.",
    icon: Database,
  },
  {
    href: "/admin/sessions",
    label: "Sessions",
    description: "Runtime sessions and state.",
    icon: SlidersHorizontal,
  },
  {
    href: "/admin/feature-flags",
    label: "Feature Flags",
    description: "Toggle features for the platform.",
    icon: CreditCard,
  },
  {
    href: "/admin/system-settings",
    label: "System Settings",
    description: "Global platform configuration.",
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
      description="Open any admin model from one place. The list is data-driven, so you can add more models later without redesigning the page."
      meta={<span>{adminModules.length} admin modules · {overviewQuery.data?.total_users ?? users.length} users in local database</span>}
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

          <ConsolePanel title="Admin modules" description="Everything available in the admin console now, with room to add more later.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {adminModules.map((module) => {
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
        </>
      )}
    </ConsolePage>
  );
}
