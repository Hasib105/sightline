"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Loader2, RefreshCcw } from "lucide-react";

import {
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  DataTable,
  KeyValueList,
  SectionTabs,
  StatusBadge,
  Toolbar,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { InspectorDrawer } from "@/components/dashboard/inspector-drawer";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createBillingCheckoutSession,
  createBillingPortalSession,
  getBillingSummary,
  listBillingLedger,
} from "@/lib/dashboard-api";
import { formatCurrency, normalizePlanMetadata } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export default function BillingsPage() {
  const [activeInterval, setActiveInterval] = useState<"year" | "month">("year");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const summaryQuery = useQuery({
    queryKey: ["billing-summary"],
    queryFn: getBillingSummary,
  });
  const ledgerQuery = useQuery({
    queryKey: ["billing-ledger"],
    queryFn: () => listBillingLedger(25),
  });

  const checkoutMutation = useMutation({
    mutationFn: createBillingCheckoutSession,
    onSuccess: (result) => {
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      }
    },
  });
  const portalMutation = useMutation({
    mutationFn: createBillingPortalSession,
    onSuccess: (result) => {
      if (result.url) {
        window.location.href = result.url;
      }
    },
  });

  const plans = useMemo(() => summaryQuery.data?.plans ?? [], [summaryQuery.data?.plans]);
  const activeSubscription = summaryQuery.data?.active_subscription ?? null;
  const visiblePlans = useMemo(() => {
    return plans.filter((plan) => {
      const metadata = normalizePlanMetadata(plan.metadata);
      return (
        metadata.billing_type === "subscription" &&
        metadata.interval === activeInterval &&
        !metadata.builtin
      );
    });
  }, [activeInterval, plans]);
  const topUpPlans = useMemo(() => {
    return plans.filter((plan) => normalizePlanMetadata(plan.metadata).package_kind === "topup");
  }, [plans]);
  const operationCosts = useMemo(() => {
    const operations = summaryQuery.data?.credit_policy?.operations;
    return operations && typeof operations === "object" && !Array.isArray(operations)
      ? Object.entries(operations).slice(0, 10)
      : [];
  }, [summaryQuery.data?.credit_policy]);

  const buyPlan = (planCode: string) => {
    const origin = window.location.origin;
    checkoutMutation.mutate({
      plan_code: planCode,
      success_url: `${origin}/dashboard/billings?status=success`,
      cancel_url: `${origin}/dashboard/billings?status=cancelled`,
    });
  };

  const openBillingPortal = () => {
    portalMutation.mutate({
      return_url: `${window.location.origin}/dashboard/billings`,
    });
  };

  return (
    <ConsolePage
      eyebrow="Account"
      title="Billing & credits"
      description="Review balance, subscription plans, and credit ledger without leaving the workspace."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
            Subscription state
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openBillingPortal}
            disabled={!summaryQuery.data?.stripe_configured || portalMutation.isPending}
          >
            {portalMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 size-4" />
            )}
            Open billing portal
          </Button>
        </>
      }
    >
      {summaryQuery.isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : summaryQuery.error ? (
        <ConsolePanel>
          <p className="text-sm text-red-600">{(summaryQuery.error as ApiError).message}</p>
        </ConsolePanel>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-4">
            <ConsoleStat label="Balance" value={summaryQuery.data?.balance ?? 0} description="Credits available" />
            <ConsoleStat
              label="Free credits"
              value={summaryQuery.data?.monthly_free_credits ?? 500}
              description="Monthly allowance"
            />
            <ConsoleStat
              label="Search cost"
              value={summaryQuery.data?.search_credit_cost ?? 1}
              description="Credits per search"
            />
            <ConsoleStat
              label="Routing"
              value={summaryQuery.data?.custom_engines_enabled ? "advanced" : "Sail Engine"}
              description="Engine access"
            />
          </div>

          <div className="space-y-3">
            <div className="grid gap-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <ConsolePanel
                  title="Credit buckets"
                  description="Balance by source, including expiring launch and monthly credits."
                >
                  {summaryQuery.data?.credit_buckets.length ? (
                    <DataTable chrome="compact" containerClassName="max-h-[220px]">
                      <thead>
                        <tr>
                          <th className={consoleTableHeaderCellClass}>Bucket</th>
                          <th className={consoleTableHeaderCellClass}>Balance</th>
                          <th className={consoleTableHeaderCellClass}>Expires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryQuery.data.credit_buckets.map((bucket) => (
                          <tr key={`${bucket.type}-${bucket.expires_at ?? "never"}`}>
                            <td className={consoleTableCellClass}>{bucket.type.replaceAll("_", " ")}</td>
                            <td className={consoleTableCellClass}>{bucket.balance.toLocaleString()}</td>
                            <td className={consoleTableCellClass}>
                              {bucket.expires_at
                                ? new Date(bucket.expires_at).toLocaleDateString()
                                : "Never"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  ) : (
                    <p className="text-sm text-slate-500">No active credit buckets.</p>
                  )}
                </ConsolePanel>

                <ConsolePanel
                  title="Operation costs"
                  description="Admin-configured credit policy used for future quotes."
                >
                  <KeyValueList
                    items={operationCosts.map(([key, value]) => ({
                      label: key,
                      value:
                        typeof value === "object" && value !== null
                          ? JSON.stringify(value)
                          : String(value),
                    }))}
                  />
                </ConsolePanel>
              </div>

              <ConsolePanel
                title="Subscription plans"
                description="Table-first plan inventory. Switch billing interval without leaving the page."
                actions={
                  <SectionTabs
                    value={activeInterval}
                    onChange={setActiveInterval}
                    options={[
                      { value: "year", label: "Yearly" },
                      { value: "month", label: "Monthly" },
                    ]}
                  />
                }
              >
                {visiblePlans.length === 0 ? (
                  <p className="text-sm text-slate-500">No {activeInterval}ly subscription plans are active right now.</p>
                ) : (
                  <DataTable containerClassName="max-h-[320px]">
                    <thead>
                      <tr>
                        <th className={consoleTableHeaderCellClass}>Plan</th>
                        <th className={consoleTableHeaderCellClass}>Price</th>
                        <th className={consoleTableHeaderCellClass}>Credits</th>
                        <th className={consoleTableHeaderCellClass}>Included searches</th>
                        <th className={consoleTableHeaderCellClass}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePlans.map((plan) => {
                        const metadata = normalizePlanMetadata(plan.metadata);
                        return (
                          <tr key={plan.id} className="hover:bg-slate-50">
                            <td className={consoleTableCellClass}>
                              <div>
                                <div className="font-medium text-slate-900">{plan.name}</div>
                                <div className="text-xs text-slate-500">{plan.description}</div>
                              </div>
                            </td>
                            <td className={consoleTableCellClass}>
                              {formatCurrency(plan.unit_amount_cents, plan.currency)}
                              {metadata.interval ? ` / ${metadata.interval}` : ""}
                            </td>
                            <td className={consoleTableCellClass}>{plan.credits.toLocaleString()}</td>
                            <td className={consoleTableCellClass}>
                              {metadata.included_searches > 0
                                ? metadata.included_searches.toLocaleString()
                                : Math.floor(
                                    plan.credits / Math.max(summaryQuery.data?.search_credit_cost ?? 5, 1)
                                  ).toLocaleString()}
                            </td>
                            <td className={consoleTableCellClass}>
                              <Button
                                size="xs"
                                onClick={() => buyPlan(plan.code)}
                                disabled={checkoutMutation.isPending}
                              >
                                <CreditCard className="mr-1.5 size-3.5" />
                                Start
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                )}
              </ConsolePanel>

              {topUpPlans.length ? (
                <ConsolePanel
                  title="Top-up packages"
                  description="One-time credit packs for extra usage without changing subscription."
                >
                  <DataTable containerClassName="max-h-[260px]">
                    <thead>
                      <tr>
                        <th className={consoleTableHeaderCellClass}>Pack</th>
                        <th className={consoleTableHeaderCellClass}>Price</th>
                        <th className={consoleTableHeaderCellClass}>Credits</th>
                        <th className={consoleTableHeaderCellClass}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUpPlans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-slate-50">
                          <td className={consoleTableCellClass}>
                            <div className="font-medium text-slate-900">{plan.name}</div>
                            <div className="text-xs text-slate-500">{plan.description}</div>
                          </td>
                          <td className={consoleTableCellClass}>
                            {formatCurrency(plan.unit_amount_cents, plan.currency)}
                          </td>
                          <td className={consoleTableCellClass}>{plan.credits.toLocaleString()}</td>
                          <td className={consoleTableCellClass}>
                            <Button
                              size="xs"
                              onClick={() => buyPlan(plan.code)}
                              disabled={checkoutMutation.isPending}
                            >
                              <CreditCard className="mr-1.5 size-3.5" />
                              Buy
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </ConsolePanel>
              ) : null}

              <ConsolePanel title="Credit ledger" description="Latest balance movements and their reasons.">
                {ledgerQuery.isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : ledgerQuery.error ? (
                  <p className="text-sm text-red-600">{(ledgerQuery.error as ApiError).message}</p>
                ) : ledgerQuery.data?.length === 0 ? (
                  <p className="text-sm text-slate-500">No ledger activity yet.</p>
                ) : (
                  <DataTable chrome="compact" containerClassName="max-h-[280px]">
                    <thead>
                      <tr>
                        <th className={consoleTableHeaderCellClass}>Time</th>
                        <th className={consoleTableHeaderCellClass}>Reason</th>
                        <th className={consoleTableHeaderCellClass}>Reference</th>
                        <th className={consoleTableHeaderCellClass}>Delta</th>
                        <th className={consoleTableHeaderCellClass}>Balance after</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerQuery.data?.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className={cn(consoleTableCellClass, "whitespace-nowrap text-xs text-slate-500")}>
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className={cn(consoleTableCellClass, "font-medium text-slate-900")}>{entry.reason}</td>
                          <td className={cn(consoleTableCellClass, "text-slate-500")}>{entry.reference || "-"}</td>
                          <td className={consoleTableCellClass}>
                            <span className={entry.delta >= 0 ? "text-emerald-700" : "text-rose-700"}>
                              {entry.delta >= 0 ? `+${entry.delta}` : entry.delta}
                            </span>
                          </td>
                          <td className={consoleTableCellClass}>{entry.balance_after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                )}
              </ConsolePanel>
            </div>

            <InspectorDrawer
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              title="Subscription state"
              description="Current Stripe-backed subscription health."
            >
                <Toolbar>
                  <StatusBadge
                    label={activeSubscription?.status ?? "no subscription"}
                    tone={activeSubscription ? "success" : "muted"}
                  />
                  {activeSubscription?.cancel_at_period_end ? (
                    <StatusBadge label="ending" tone="warning" />
                  ) : null}
                </Toolbar>
                <KeyValueList
                  items={[
                    { label: "Plan", value: activeSubscription?.plan_name || activeSubscription?.plan_code || "None" },
                    {
                      label: "Period end",
                      value: activeSubscription?.current_period_end
                        ? new Date(activeSubscription.current_period_end).toLocaleDateString()
                        : "Not set",
                    },
                    { label: "Stripe", value: summaryQuery.data?.stripe_configured ? "Configured" : "Unavailable" },
                  ]}
                />
            </InspectorDrawer>
          </div>

          {checkoutMutation.error ? (
            <p className="text-sm text-red-600">{(checkoutMutation.error as ApiError).message}</p>
          ) : null}
          {portalMutation.error ? (
            <p className="text-sm text-red-600">{(portalMutation.error as ApiError).message}</p>
          ) : null}
        </>
      )}
    </ConsolePage>
  );
}
