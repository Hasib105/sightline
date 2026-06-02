import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnhancedDataTable } from "@/components/dashboard/enhanced-data-table";
import { cn } from "@/lib/utils";

export const consoleInputClass =
  "h-8 w-full rounded-md border border-[var(--dashboard-border)] bg-card px-2.5 text-sm text-foreground shadow-none outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

export const consoleTextareaClass =
  "min-h-[84px] w-full rounded-md border border-[var(--dashboard-border)] bg-card px-3 py-2 text-sm text-foreground shadow-none outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_18%,transparent)] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

export const consoleTableClass =
  "w-full min-w-0 border-separate border-spacing-0 text-left text-[13px] text-[var(--dashboard-text-soft)]";

export const consoleTableHeaderCellClass =
  "sticky top-0 z-[1] border-b border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur";

export const consoleTableCellClass =
  "border-b border-[var(--dashboard-border)] px-3 py-2 align-top text-[13px] text-[var(--dashboard-text-soft)]";

export function ConsolePage({
  eyebrow,
  title,
  description,
  meta,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-[var(--density-dashboard-stack-gap)]", className)}>
      <div className="flex flex-col gap-2 border-b border-[var(--dashboard-border)] pb-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <div className="sr-only">
            <h1>
              {title}
            </h1>
          </div>
          <div className="space-y-0.5">
            {description ? (
              <p className="max-w-4xl text-[13px] leading-5 text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {meta ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? <Toolbar className="shrink-0">{actions}</Toolbar> : null}
      </div>

      {children}
    </div>
  );
}

export function Toolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-2.5 py-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ConsolePanel({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)] shadow-none ring-0",
        className
      )}
    >
      {title || description || actions ? (
        <CardHeader className="border-b border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] px-3 py-2.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-0.5">
              {title ? (
                <CardTitle className="text-[13px] font-semibold text-foreground">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="text-[11px] leading-4.5 text-muted-foreground">
                  {description}
                </CardDescription>
              ) : null}
            </div>
            {actions ? <Toolbar>{actions}</Toolbar> : null}
          </div>
        </CardHeader>
      ) : null}
      <CardContent className={cn("min-w-0 p-3", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function InspectorPane({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <ConsolePanel
      title={title}
      description={description}
      actions={actions}
      className={cn("h-full", className)}
      contentClassName={cn("space-y-3", contentClassName)}
    >
      {children}
    </ConsolePanel>
  );
}

export function ConsoleStat({
  label,
  value,
  description,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)] px-3 py-2.5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-lg font-semibold tracking-normal text-foreground">{value}</p>
        </div>
        {Icon ? (
          <span className="inline-flex size-7 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] text-muted-foreground">
            <Icon className="size-3.5" />
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="mt-1 text-[11px] leading-4.5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function KeyValueList({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-3 gap-y-2 sm:grid-cols-[max-content_minmax(0,1fr)]",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {item.label}
          </dt>
          <dd className="min-w-0 text-sm text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DataTable({
  children,
  className,
  containerClassName,
  storageKey,
  searchPlaceholder = "Search table...",
  pageSizeOptions = [10, 25, 50],
  chrome = "full",
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  storageKey?: string;
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  chrome?: "full" | "compact" | "bare";
}) {
  return (
    <EnhancedDataTable
      className={className}
      containerClassName={containerClassName}
      storageKey={storageKey}
      searchPlaceholder={searchPlaceholder}
      pageSizeOptions={pageSizeOptions}
      chrome={chrome}
    >
      {children}
    </EnhancedDataTable>
  );
}

export function SectionTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-0.5",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 text-xs font-medium transition",
            option.value === value
              ? "bg-card text-foreground shadow-[0_1px_1px_rgba(15,23,42,0.08)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ConsoleEmptyState({
  title,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-28 flex-col items-center justify-center rounded-md border border-dashed border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-5 text-center",
        className
      )}
    >
      {Icon ? <Icon className="mb-2 size-4 text-muted-foreground" /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function EmptyTableState({
  title,
  description,
  icon,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <ConsoleEmptyState
      title={title}
      description={description}
      icon={icon}
      className={cn("min-h-40 rounded-none border-0", className)}
    />
  );
}

export function toneBadgeClass(tone: "default" | "success" | "warning" | "danger" | "muted") {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
    case "danger":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
    case "muted":
      return "border-[var(--dashboard-border)] bg-muted text-muted-foreground";
    default:
      return "border-[var(--dashboard-border)] bg-card text-foreground";
  }
}

export function StatusBadge({
  label,
  tone = "default",
  className,
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 rounded-md px-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        toneBadgeClass(tone),
        className
      )}
    >
      {label}
    </Badge>
  );
}
