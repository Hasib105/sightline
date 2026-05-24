"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCcw, ShieldCheck, UserRoundCheck } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  DataTable,
  StatusBadge,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { Button } from "@/components/ui/button";
import { ApiError, getIntegrityAlert, listIntegrityAlerts, reviewIntegrityAlert } from "@/lib/dashboard-api";
import type { IntegrityAlertDetail, IntegrityAlertSummary } from "@/lib/types";

const reviewTone: Record<string, "success" | "warning" | "muted"> = {
  confirmed: "success",
  dismissed: "muted",
  follow_up: "warning",
};

const statusTone: Record<string, "success" | "warning" | "muted"> = {
  detected: "warning",
  visible: "warning",
  confirmed: "success",
  dismissed: "muted",
  follow_up: "warning",
  closed: "muted",
};

function formatPercent(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value * 100);
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function alertLabel(alert: IntegrityAlertSummary | IntegrityAlertDetail) {
  return alert.alertTypeLabel || labelize(alert.alertType);
}

export default function InvigilatorDashboardPage() {
  const queryClient = useQueryClient();
  const alertsQuery = useQuery({
    queryKey: ["integrity-alerts"],
    queryFn: listIntegrityAlerts,
  });
  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [reviewerUsername, setReviewerUsername] = useState("invigilator");
  const [note, setNote] = useState("Reviewed in invigilator console.");

  const activeAlertId = selectedAlertId ?? alerts[0]?.id ?? null;
  const selectedAlertQuery = useQuery<IntegrityAlertDetail>({
    queryKey: ["integrity-alert", activeAlertId],
    queryFn: () => getIntegrityAlert(activeAlertId as number),
    enabled: activeAlertId !== null,
  });
  const selectedAlert = selectedAlertQuery.data ?? null;

  const reviewMutation = useMutation({
    mutationFn: ({ alertId, decision }: { alertId: number; decision: "confirmed" | "dismissed" | "follow_up" }) =>
      reviewIntegrityAlert(alertId, {
        decision,
        reviewerUsername: reviewerUsername.trim() || "invigilator",
        note: note.trim(),
      }),
    onSuccess: async (alert) => {
      setSelectedAlertId(alert.id);
      await queryClient.invalidateQueries({ queryKey: ["integrity-alerts"] });
    },
  });

  const openAlerts = alerts.filter((alert) => alert.status === "detected" || alert.status === "visible").length;
  const reviewedAlerts = alerts.filter((alert) => ["confirmed", "dismissed", "follow_up", "closed"].includes(alert.status)).length;

  return (
    <ConsolePage
      eyebrow="Invigilator"
      title="Alert review"
      description="Review evidence-backed exam integrity alerts and record the human decision."
      meta={
        <>
          <span>{alerts.length} alerts</span>
          <span>{openAlerts} open</span>
        </>
      }
      actions={
        <Button size="sm" variant="outline" onClick={() => void alertsQuery.refetch()} disabled={alertsQuery.isFetching}>
          {alertsQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          Refresh
        </Button>
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat label="Alerts" value={alerts.length} description="Integrity alerts in the queue" />
        <ConsoleStat label="Open" value={openAlerts} description="Need a human decision" />
        <ConsoleStat label="Reviewed" value={reviewedAlerts} description="Confirmed, dismissed, or follow-up" />
      </div>

      {alertsQuery.isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : alertsQuery.error ? (
        <p className="text-sm text-red-600">{(alertsQuery.error as ApiError).message}</p>
      ) : alerts.length === 0 ? (
        <ConsoleEmptyState
          title="No alerts yet"
          description="Use the integrity simulation endpoint or wait for live analysis output."
          icon={ShieldCheck}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
          <ConsolePanel title="Alerts" description="Latest integrity events with evidence links.">
            <DataTable storageKey="invigilator-alerts" searchPlaceholder="Search alerts..." pageSizeOptions={[5, 10, 20]}>
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Alert</th>
                  <th className={consoleTableHeaderCellClass}>Course</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className={selectedAlert?.id === alert.id ? "bg-[var(--dashboard-accent-soft)]/40" : "hover:bg-muted/40"}>
                    <td className={consoleTableCellClass}>
                      <button type="button" className="block text-left" onClick={() => setSelectedAlertId(alert.id)}>
                        <div className="font-medium text-foreground">{alertLabel(alert)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{alert.summary}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{new Date(alert.occurredAt).toLocaleString()}</div>
                      </button>
                    </td>
                    <td className={consoleTableCellClass}>
                      <div className="font-medium text-foreground">{alert.examSession.course}</div>
                      <div className="text-xs text-muted-foreground">{alert.examSession.courseTitle}</div>
                    </td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge label={labelize(alert.status)} tone={statusTone[alert.status] ?? "muted"} />
                    </td>
                    <td className={consoleTableCellClass}>
                      <Button size="sm" variant="outline" onClick={() => setSelectedAlertId(alert.id)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </ConsolePanel>

          <ConsolePanel
            title={selectedAlert ? `Alert ${selectedAlert.id}` : "Select an alert"}
            description={selectedAlert ? selectedAlert.summary : "Choose an alert to inspect the evidence and review history."}
            contentClassName="space-y-3"
          >
            {selectedAlert ? (
              <>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Exam session</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{selectedAlert.examSession.course} · {selectedAlert.examSession.courseTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Hall {selectedAlert.examSession.hall} · {selectedAlert.examSession.status}</p>
                  </div>
                  <div className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Confidence</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatPercent(selectedAlert.confidenceScore)}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">Visibility: {selectedAlert.visibilityQuality}</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evidence</p>
                      <p className="text-sm text-foreground">Linked assets remain available after review.</p>
                    </div>
                    <StatusBadge label={selectedAlert.alertTypeLabel} tone="warning" />
                  </div>

                  {selectedAlert.evidenceAssets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No evidence assets attached.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedAlert.evidenceAssets.map((asset) => (
                        <div key={asset.id} className="rounded-md border border-[var(--dashboard-border)] bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{labelize(asset.kind)}</p>
                              <p className="text-xs text-muted-foreground">{asset.uri}</p>
                            </div>
                            <StatusBadge label={asset.kind} tone="muted" />
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">Captured {new Date(asset.capturedAt).toLocaleString()} · {asset.qualityNote}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Review</p>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Reviewer username</span>
                    <input
                      className="h-8 w-full rounded-md border border-[var(--dashboard-border)] bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_18%,transparent)]"
                      value={reviewerUsername}
                      onChange={(event) => setReviewerUsername(event.target.value)}
                    />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Note</span>
                    <textarea
                      className="min-h-[92px] w-full rounded-md border border-[var(--dashboard-border)] bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_18%,transparent)]"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ alertId: selectedAlert.id, decision: "confirmed" })}
                    >
                      {reviewMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserRoundCheck className="size-4" />}
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ alertId: selectedAlert.id, decision: "dismissed" })}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ alertId: selectedAlert.id, decision: "follow_up" })}
                    >
                      Follow up
                    </Button>
                  </div>
                  {reviewMutation.error ? <p className="text-sm text-red-600">{(reviewMutation.error as ApiError).message}</p> : null}
                </div>

                <div className="space-y-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Review history</p>
                  {selectedAlert.reviewActions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reviews recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedAlert.reviewActions.map((action) => (
                        <div key={action.id} className="rounded-md border border-[var(--dashboard-border)] bg-card p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-foreground">{action.reviewer}</p>
                            <StatusBadge label={labelize(action.decision)} tone={reviewTone[action.decision] ?? "muted"} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{new Date(action.createdAt).toLocaleString()}</p>
                          {action.note ? <p className="mt-2 text-sm text-muted-foreground">{action.note}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <ConsoleEmptyState title="Pick an alert" description="Use the table to inspect the evidence and record the human decision." icon={ShieldCheck} />
            )}
          </ConsolePanel>
        </div>
      )}
    </ConsolePage>
  );
}
