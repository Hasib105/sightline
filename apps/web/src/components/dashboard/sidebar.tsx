"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  BookOpenCheck,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Command,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Sun,
  Upload,
  UserRoundCog,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";

import { SightlineBrand } from "@/components/sightline-brand";
import { ScrollMask } from "@/components/dashboard/scroll-mask";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearAuthTokens } from "@/lib/api-client";
import {
  getBillingSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/dashboard-api";
import type { BillingSummary, CurrentUser, NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

type ShellKind = "dashboard" | "admin";
type ThemePreference = "system" | "light" | "dark";

type ShellItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  match?: "exact" | "prefix";
};

type ShellSection = {
  label?: string;
  items: ShellItem[];
};

type ShellCommand = ShellItem & {
  section: string;
};

const sidebarTransitionClass =
  "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0";

const routeLabels: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/courses": "Courses",
  "/dashboard/exams": "Exams",
  "/dashboard/teacher/courses": "Teacher Courses",
  "/dashboard/teacher/exams": "Teacher Exams",
  "/dashboard/teacher/materials": "Course materials",
  "/dashboard/teacher/risk": "At-risk Students",
  "/dashboard/invigilator": "Invigilator Review",
  "/dashboard/playground": "Playground",
  "/dashboard/api-keys": "API Keys",
  "/dashboard/docs": "Docs",
  "/dashboard/mcp": "MCP",
  "/dashboard/billings": "Billing",
  "/dashboard/logs": "History",
  "/dashboard/settings": "Settings",
  "/dashboard/support": "Support",
  "/dashboard/admin/content": "Content",
  "/dashboard/admin/models": "Models",
  "/dashboard/admin/pricing": "Pricing",
  "/dashboard/admin/proxy-endpoints": "Proxy Endpoints",
  "/dashboard/admin/system-settings": "System Settings",
  "/admin": "Overview",
  "/admin/analytics": "Analytics",
  "/admin/users": "Users",
  "/admin/teachers": "Teachers",
  "/admin/invigilators": "Invigilators",
  "/admin/plans": "Plans & Credits",
  "/admin/provider-routing": "Provider Routing",
  "/admin/provider-credentials": "Provider Credentials",
  "/admin/proxies": "Proxies",
  "/admin/sessions": "Sessions",
  "/admin/feature-flags": "Feature Flags",
  "/admin/system-settings": "System Settings",
};

function getBreadcrumbs(pathname: string): Array<{ href: string; label: string }> {
  const root = pathname.startsWith("/admin") ? "/admin" : "/dashboard";
  const rootLabel = pathname.startsWith("/admin") ? "Admin" : "Dashboard";
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Array<{ href: string; label: string }> = [{ href: root, label: rootLabel }];

  let href = "";
  for (const segment of segments) {
    href += `/${segment}`;
    if (href === root) {
      continue;
    }
    const label =
      routeLabels[href] ??
      segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    crumbs.push({ href, label });
  }

  return crumbs;
}

function activeItem(item: ShellItem, pathname: string): boolean {
  return item.match === "exact"
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function initialsFor(user: CurrentUser): string {
  return (user.username || user.email || "U").slice(0, 2).toUpperCase();
}

function navigationFor(kind: ShellKind, user: CurrentUser): ShellSection[] {
  if (kind === "admin") {
    return [
      {
        items: [{ href: "/admin", icon: LayoutDashboard, label: "Overview", match: "exact" }],
      },
      {
        label: "Users",
        items: [
          { href: "/admin/users", icon: Users, label: "All Users" },
          { href: "/admin/teachers", icon: BookOpenCheck, label: "Teachers" },
          { href: "/admin/invigilators", icon: ShieldCheck, label: "Invigilators" },
        ],
      },
      {
        label: "MVP",
        items: [{ href: "/dashboard", icon: ArrowUpRight, label: "Dashboard" }],
      },
    ];
  }

  const sections: ShellSection[] = [
    {
      items: [{ href: "/dashboard", icon: LayoutDashboard, label: "Overview", match: "exact" }],
    },
  ];

  if (user.is_superuser || user.role === "admin") {
    sections.push({
      label: "Admin",
      items: [{ href: "/admin", icon: ArrowUpRight, label: "Open Admin Console", match: "prefix" }],
    });
  }

  if (user.role === "student") {
    sections.push({
      label: "Student",
      items: [
        { href: "/dashboard/courses", icon: BookOpenCheck, label: "Enroll Courses" },
        { href: "/dashboard/exams", icon: ClipboardList, label: "Give Exams" },
      ],
    });
  }

  if (user.role === "invigilator" || user.role === "admin" || user.is_superuser) {
    sections.push({
      label: "Invigilator",
      items: [{ href: "/dashboard/invigilator", icon: ShieldCheck, label: "Alert Review" }],
    });
  }

  if (user.role === "teacher" || user.role === "admin" || user.is_superuser) {
    sections.push({
      label: "Teacher",
      items: [
        { href: "/dashboard/teacher/courses", icon: BookOpenCheck, label: "Courses" },
        { href: "/dashboard/teacher/exams", icon: ClipboardList, label: "Exams" },
        { href: "/dashboard/teacher/materials", icon: Upload, label: "Course Materials" },
        { href: "/dashboard/teacher/risk", icon: AlertTriangle, label: "At-risk Students" },
      ],
    });
  }

  return sections;
}

function commandsFor(sections: ShellSection[]): ShellCommand[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.label ?? "Core" }))
  );
}

function SidebarCopy({
  collapsed,
  children,
  className,
}: {
  collapsed: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "min-w-0 overflow-hidden transition-[max-width,opacity,transform]",
        sidebarTransitionClass,
        collapsed ? "lg:max-w-0 lg:-translate-x-2 lg:opacity-0" : "max-w-[14rem] opacity-100",
        className
      )}
      aria-hidden={collapsed ? true : undefined}
    >
      {children}
    </span>
  );
}

function SidebarItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: ShellItem;
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const active = activeItem(item, pathname);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group flex w-[calc(100%-0.25rem)] items-center gap-2.5 rounded-[var(--density-dashboard-sidebar-nav-radius)] border px-[var(--density-dashboard-sidebar-nav-px)] py-[var(--density-dashboard-sidebar-nav-py)] text-sm transition-[width,gap,padding,background-color,color,border-color]",
        sidebarTransitionClass,
        active
          ? "border-[color-mix(in_oklab,var(--dashboard-accent)_26%,transparent)] bg-[var(--dashboard-accent-soft)] text-foreground shadow-[0_14px_32px_-28px_var(--dashboard-accent)]"
          : "border-transparent text-muted-foreground hover:bg-muted/55 hover:text-foreground",
        collapsed && "lg:mx-auto lg:w-[var(--density-dashboard-sidebar-compact-size)] lg:translate-x-0 lg:justify-center lg:gap-0 lg:px-0"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-[var(--dashboard-accent)]")} />
      <SidebarCopy collapsed={collapsed} className="whitespace-nowrap">
        {item.label}
      </SidebarCopy>
    </Link>
  );
}

function SidebarSection({
  section,
  pathname,
  collapsed,
  onNavigate,
}: {
  section: ShellSection;
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1 overflow-visible">
      {section.label ? (
        <SidebarCopy collapsed={collapsed} className="block px-2 pb-0.5">
          <span className="text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {section.label}
          </span>
        </SidebarCopy>
      ) : null}
      {section.items.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function useThemePreference() {
  const [theme, setTheme] = useLocalStorageState<ThemePreference>("sightline:theme", "system");
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.classList.toggle("dark", next === "dark");
      setEffectiveTheme(next);
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  return {
    theme,
    effectiveTheme,
    toggleTheme: () => setTheme(effectiveTheme === "dark" ? "light" : "dark"),
  };
}

function formatCredits(summary: BillingSummary | undefined): string {
  if (!summary) {
    return "Loading";
  }
  return Intl.NumberFormat().format(summary.balance);
}

function planLabel(summary: BillingSummary | undefined): string {
  if (!summary) {
    return "Loading";
  }
  return summary.active_subscription?.plan_name ?? "No active plan";
}

function UserFlyout({
  user,
  collapsed,
  billingSummary,
  themeLabel,
  onToggleTheme,
  onNavigate,
}: {
  user: CurrentUser;
  collapsed: boolean;
  billingSummary: BillingSummary | undefined;
  themeLabel: string;
  onToggleTheme: () => void;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const initials = initialsFor(user);

  const signOut = async () => {
    clearAuthTokens();
    onNavigate();
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <div className="relative border-t border-[var(--dashboard-border)] pt-2.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex h-10 w-full items-center gap-2.5 overflow-hidden rounded-[var(--density-dashboard-sidebar-card-radius)] border border-[var(--dashboard-border)] bg-background/70 p-2 text-left transition-[width,gap,padding,background-color] hover:bg-muted/50 focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_18%,transparent)]",
            sidebarTransitionClass,
            collapsed && "lg:mx-auto lg:w-[var(--density-dashboard-sidebar-compact-size)] lg:justify-center lg:gap-0 lg:p-0"
          )}
          title={collapsed ? user.username : undefined}
        >
          <span className="flex size-[var(--density-dashboard-sidebar-avatar-size)] shrink-0 items-center justify-center rounded-md bg-[var(--dashboard-accent)] text-xs font-semibold text-[var(--dashboard-accent-foreground)]">
            {initials}
          </span>
          <SidebarCopy collapsed={collapsed} className="flex-1">
            <span className="block truncate text-sm font-medium">{user.username}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email ?? user.role}</span>
          </SidebarCopy>
          <SidebarCopy collapsed={collapsed}>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </SidebarCopy>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={collapsed ? "right" : "top"}
          align={collapsed ? "end" : "start"}
          sideOffset={8}
          className="dashboard-user-popover w-72 rounded-md border border-[var(--dashboard-border)] bg-popover p-2 text-popover-foreground shadow-2xl"
        >
          <div className="px-2 py-2.5">
            <div className="text-sm font-semibold">{user.username}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email ?? "No email connected"}</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 px-1 pb-2">
            <div className="rounded-lg border border-[var(--dashboard-border)] bg-muted/35 p-2">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Credits</div>
              <div className="mt-1 text-sm font-semibold">{formatCredits(billingSummary)}</div>
            </div>
            <div className="rounded-lg border border-[var(--dashboard-border)] bg-muted/35 p-2">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Access</div>
              <div className="mt-1 truncate text-sm font-semibold">{user.is_superuser ? "Admin" : user.role}</div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <div className="py-1">
            <DropdownMenuItem
              className="dashboard-menu-row"
              onClick={() => {
                router.push("/dashboard");
                onNavigate();
              }}
            >
              <UserRoundCog className="size-4" />
              MVP dashboard
            </DropdownMenuItem>
            <DropdownMenuItem
              className="dashboard-menu-row"
              onClick={() => {
                router.push(user.is_superuser || user.role === "admin" ? "/admin/users" : "/dashboard");
                onNavigate();
              }}
            >
              <Wallet className="size-4" />
              {user.is_superuser || user.role === "admin" ? "Manage users" : planLabel(billingSummary)}
            </DropdownMenuItem>
            <DropdownMenuItem className="dashboard-menu-row" onClick={onToggleTheme}>
              {themeLabel === "Dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              {themeLabel} mode
            </DropdownMenuItem>
            <DropdownMenuItem className="dashboard-menu-row text-red-600" onClick={signOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function AlertsMenu() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 60_000,
  });
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((item) => !item.read).length;
  const markOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="relative">
      {open ? <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} /> : null}
      <Button
        variant="outline"
        size="sm"
        className="dashboard-topbar-pill relative"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="size-4" />
        <span className="hidden sm:inline">Alerts</span>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-[var(--dashboard-accent)] px-1 text-[10px] font-semibold text-[var(--dashboard-accent-foreground)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="dashboard-alert-popover absolute right-0 top-[calc(100%+0.55rem)] z-50 w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--dashboard-border)] bg-popover p-2 text-popover-foreground shadow-2xl">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <div>
              <div className="text-sm font-semibold">Alerts</div>
              <div className="text-xs text-muted-foreground">{unreadCount} unread updates</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={unreadCount === 0 || markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck className="size-4" />
              Read all
            </Button>
          </div>
          <ScrollMask className="h-[min(24rem,60vh)]" viewportClassName="h-full overflow-y-auto px-1 pb-1">
            <div className="space-y-1">
              {notificationsQuery.isLoading ? (
                <div className="px-2 py-8 text-center text-sm text-muted-foreground">Loading alerts...</div>
              ) : notifications.length === 0 ? (
                <div className="px-2 py-8 text-center text-sm text-muted-foreground">No alerts right now.</div>
              ) : (
                notifications.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onRead={() => markOneMutation.mutate(item.id)}
                    onClose={() => setOpen(false)}
                  />
                ))
              )}
            </div>
          </ScrollMask>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  item,
  onRead,
  onClose,
}: {
  item: NotificationItem;
  onRead: () => void;
  onClose: () => void;
}) {
  const content = (
    <>
      <span className={cn("dashboard-alert-dot", `dashboard-alert-dot--${item.severity}`)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{item.title}</span>
          {!item.read ? <span className="size-1.5 rounded-full bg-[var(--dashboard-accent)]" /> : null}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">{item.body}</span>
        <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground/80">
          {item.context}
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex w-full gap-2 rounded-lg border border-transparent p-2 text-left transition hover:border-[var(--dashboard-border)] hover:bg-muted/40",
    !item.read && "bg-[var(--dashboard-accent-soft)]"
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={className}
        onClick={() => {
          onRead();
          onClose();
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onRead}>
      {content}
    </button>
  );
}

function CommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean;
  commands: ShellCommand[];
  onClose: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return commands;
    }
    return commands.filter((command) =>
      `${command.label} ${command.href} ${command.section}`.toLowerCase().includes(normalized)
    );
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      onClose();
    }
    if (event.key === "Enter" && results[0]) {
      navigate(results[0].href);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] bg-background/55 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="dashboard-command mx-auto mt-[12vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-popover text-popover-foreground shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--dashboard-border)] px-3 py-2">
          <Command className="size-4 text-[var(--dashboard-accent)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, routes, actions..."
            className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="rounded-md border border-[var(--dashboard-border)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Esc
          </span>
        </div>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Route commands are active. Context-aware entity search can plug into this surface per page.
        </div>
        <ScrollMask className="h-[min(25rem,58vh)]" viewportClassName="h-full overflow-y-auto px-2 pb-2">
          <div className="space-y-1">
            {results.length === 0 ? (
              <div className="px-3 py-10 text-center text-sm text-muted-foreground">No command found.</div>
            ) : (
              results.map((command) => {
                const Icon = command.icon;
                const active = activeItem(command, pathname);
                return (
                  <button
                    type="button"
                    key={command.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted/55",
                      active && "bg-[var(--dashboard-accent-soft)]"
                    )}
                    onClick={() => navigate(command.href)}
                  >
                    <Icon className="size-4 text-[var(--dashboard-accent)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{command.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{command.section} / {command.href}</span>
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </button>
                );
              })
            )}
          </div>
        </ScrollMask>
      </div>
    </div>
  );
}

function Sidebar({
  kind,
  user,
  collapsed,
  mobileOpen,
  billingSummary,
  themeLabel,
  onToggleTheme,
  onClose,
}: {
  kind: ShellKind;
  user: CurrentUser;
  collapsed: boolean;
  mobileOpen: boolean;
  billingSummary: BillingSummary | undefined;
  themeLabel: string;
  onToggleTheme: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const sections = useMemo(() => navigationFor(kind, user), [kind, user]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-background/45 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      ) : null}
      <aside
        className={cn(
          "dashboard-sidebar fixed inset-y-0 left-0 z-40 w-[var(--density-dashboard-sidebar-width)] overflow-visible px-[var(--density-dashboard-sidebar-shell-p)] py-[var(--density-dashboard-sidebar-shell-p)] transition-[width,transform,padding] lg:static lg:z-0 lg:h-full lg:shrink-0",
          sidebarTransitionClass,
          collapsed && "dashboard-sidebar--collapsed lg:w-[var(--density-dashboard-sidebar-collapsed-width)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="relative z-10 flex h-full min-w-0 flex-col overflow-visible">
          <div
            className={cn(
              "flex items-center justify-between gap-2 px-[var(--density-dashboard-sidebar-header-px)]",
              collapsed && "lg:px-0"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center py-1.5 transition-[padding,width]",
                sidebarTransitionClass,
                collapsed && "lg:mx-auto lg:w-[var(--density-dashboard-sidebar-compact-size)] lg:translate-x-0.5 lg:justify-center"
              )}
            >
              <div
                className={cn(
                  "flex h-9 items-center overflow-hidden transition-[width]",
                  sidebarTransitionClass,
                  collapsed ? "lg:w-9" : "w-[132px]"
                )}
              >
                <SightlineBrand compact iconOnly={collapsed} href={kind === "admin" ? "/admin" : "/dashboard"} />
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <ScrollMask className="mt-2 min-h-0 flex-1 overflow-visible" viewportClassName="h-full overflow-y-auto overflow-x-visible">
            <nav className={cn(collapsed ? "space-y-1.5" : "space-y-2.5")}>
              {sections.map((section) => (
                <SidebarSection
                  key={section.label ?? section.items.map((item) => item.href).join("|")}
                  section={section}
                  pathname={pathname}
                  collapsed={collapsed}
                  onNavigate={onClose}
                />
              ))}
            </nav>
          </ScrollMask>

          <div className="mt-3">
            <UserFlyout
              user={user}
              collapsed={collapsed}
              billingSummary={billingSummary}
              themeLabel={themeLabel}
              onToggleTheme={onToggleTheme}
              onNavigate={onClose}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

function TopBar({
  kind,
  user,
  collapsed,
  effectiveTheme,
  onToggleTheme,
  onOpenMobile,
  onToggleSidebar,
  onOpenCommand,
}: {
  kind: ShellKind;
  user: CurrentUser;
  collapsed: boolean;
  effectiveTheme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenMobile: () => void;
  onToggleSidebar: () => void;
  onOpenCommand: () => void;
}) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const previousCrumb = breadcrumbs.at(-2);
  const backTarget = previousCrumb?.href ?? (kind === "admin" ? "/admin" : "/dashboard");
  const atRoot = breadcrumbs.length === 1;

  return (
    <header className="dashboard-topbar relative z-20 flex-none">
      <div className="relative z-10 flex h-[var(--density-dashboard-topbar-height)] items-center gap-3 px-[var(--density-dashboard-topbar-px)] lg:pl-2 lg:pr-[var(--density-dashboard-topbar-pr)]">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon-sm" className="lg:hidden" onClick={onOpenMobile} aria-label="Open navigation">
            <Menu className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={onToggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
          {atRoot ? (
            <Button variant="ghost" size="icon-sm" className="rounded-full" disabled aria-label="Current section">
              <Home className="size-4" />
            </Button>
          ) : (
            <Link
              href={backTarget}
              aria-label="Go back"
              className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </Link>
          )}
          <nav className="min-w-0" aria-label="Breadcrumb">
            <ol className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm">
              {breadcrumbs.map((crumb, index) => {
                const current = index === breadcrumbs.length - 1;
                return (
                  <li key={crumb.href} className="flex min-w-0 shrink-0 items-center gap-1.5">
                    {index > 0 ? <span className="text-muted-foreground/60">/</span> : null}
                    {current ? (
                      <span className="truncate font-medium text-foreground">{crumb.label}</span>
                    ) : (
                      <Link href={crumb.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                        {crumb.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="dashboard-command-trigger" onClick={onOpenCommand}>
            <Search className="size-4 text-muted-foreground" />
            <span className="hidden min-w-0 truncate md:inline">Search pages, actions...</span>
            <span className="ml-auto hidden gap-1 text-[10px] text-muted-foreground lg:flex">
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </span>
          </button>
          <Button
            variant="outline"
            size="icon-sm"
            className="dashboard-topbar-icon"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            title={`Switch to ${effectiveTheme === "dark" ? "light" : "dark"} mode`}
          >
            {effectiveTheme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
          <AlertsMenu />
          {user.is_superuser ? (
            <div className="hidden items-center gap-1 rounded-full border border-[var(--dashboard-border)] px-2 py-1 text-xs text-muted-foreground xl:flex">
              <ShieldCheck className="size-3.5 text-[var(--dashboard-accent)]" />
              Staff
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function DashboardShell({
  kind,
  user,
  children,
}: {
  kind: ShellKind;
  user: CurrentUser;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useLocalStorageState<boolean>(
    `sightline:${kind}:sidebar-collapsed`,
    true
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const pathname = usePathname();
  const { effectiveTheme, toggleTheme } = useThemePreference();
  const sections = useMemo(() => navigationFor(kind, user), [kind, user]);
  const commandSections = useMemo(() => {
    if (user.is_superuser || user.role === "admin") {
      return [...navigationFor("dashboard", user), ...navigationFor("admin", user)];
    }
    return sections;
  }, [sections, user]);
  const commands = useMemo(() => {
    const seen = new Set<string>();
    return commandsFor(commandSections).filter((command) => {
      if (seen.has(command.href)) {
        return false;
      }
      seen.add(command.href);
      return true;
    });
  }, [commandSections]);
  const billingQuery = useQuery({
    queryKey: ["billing-summary"],
    queryFn: getBillingSummary,
    staleTime: 30_000,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Route changes should dismiss transient overlays.
    setMobileOpen(false);
    setCommandOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "app-shell dashboard-shell h-[100dvh] overflow-hidden text-foreground",
        kind === "admin" ? "dashboard-shell--admin" : "dashboard-shell--client"
      )}
    >
      <div className="dashboard-shell-surface relative flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
        <Sidebar
          kind={kind}
          user={user}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          billingSummary={billingQuery.data}
          themeLabel={effectiveTheme === "dark" ? "Dark" : "Light"}
          onToggleTheme={toggleTheme}
          onClose={() => setMobileOpen(false)}
        />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar
            kind={kind}
            user={user}
            collapsed={collapsed}
            effectiveTheme={effectiveTheme}
            onToggleTheme={toggleTheme}
            onOpenMobile={() => setMobileOpen(true)}
            onToggleSidebar={() => setCollapsed((value) => !value)}
            onOpenCommand={() => setCommandOpen(true)}
          />
          <main className="dashboard-main flex min-h-0 flex-1 flex-col">
            <ScrollMask className="dashboard-content-scroll min-h-0 flex-1" viewportClassName="h-full overflow-y-auto">
              <div className="dashboard-page-stack min-h-full space-y-3 px-[var(--density-dashboard-content-px)] pb-[calc(var(--density-dashboard-content-py)+env(safe-area-inset-bottom)+2rem)] pt-[var(--density-dashboard-content-py)] pr-[var(--density-dashboard-content-pr)]">
                {children}
              </div>
            </ScrollMask>
          </main>
        </div>
      </div>
      <CommandPalette open={commandOpen} commands={commands} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
