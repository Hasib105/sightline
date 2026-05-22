import Link from "next/link";
import { FileText, LifeBuoy } from "lucide-react";

import {
  ConsolePanel,
  ConsolePage,
  DataTable,
  StatusBadge,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { cn } from "@/lib/utils";

export default function SupportPage() {
  const resources = [
    {
      name: "API documentation",
      intent: "Check request and response behavior before opening a support thread.",
      status: "available",
      href: "/dashboard/docs",
    },
    {
      name: "Audit logs",
      intent: "Review playground, API key, and admin actions to isolate failures.",
      status: "available",
      href: "/dashboard/logs",
    },
    {
      name: "Billing console",
      intent: "Confirm credit balance, Stripe status, and subscription state.",
      status: "available",
      href: "/dashboard/billings",
    },
  ];

  return (
    <ConsolePage
      eyebrow="Account"
      title="Support"
      description="Operational triage surfaces for Sightline operators."
    >
      <div className="space-y-3">
        <ConsolePanel
          title={
            <span className="flex items-center gap-2">
              <LifeBuoy className="size-4 text-muted-foreground" />
              Support resources
            </span>
          }
        >
          <DataTable chrome="compact">
            <thead>
              <tr>
                <th className={consoleTableHeaderCellClass}>Resource</th>
                <th className={consoleTableHeaderCellClass}>Use when</th>
                <th className={consoleTableHeaderCellClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.name} className="hover:bg-slate-50">
                  <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>
                    <Link href={resource.href} className="hover:underline">
                      {resource.name}
                    </Link>
                  </td>
                  <td className={cn(consoleTableCellClass, "text-slate-500")}>{resource.intent}</td>
                  <td className={consoleTableCellClass}>
                    <StatusBadge label={resource.status} tone="success" />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </ConsolePanel>

        <ConsolePanel title="Escalation path" description="Use built-in diagnostics first to reduce turnaround.">
          <div className="space-y-2 text-sm text-slate-600">
            <p>1. Reproduce the issue in the playground or logs.</p>
            <p>2. Check billing and key state if calls are being rejected.</p>
            <p>3. Contact your platform admin with the relevant log timestamp and action name.</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-900">
              <FileText className="size-4 text-slate-500" />
              Tip
            </div>
            <p className="mt-1 text-[13px] leading-5">
              Include the exact action name and timestamp from the logs page when escalating an issue.
            </p>
          </div>
        </ConsolePanel>
      </div>
    </ConsolePage>
  );
}
