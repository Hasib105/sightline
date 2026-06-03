"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileVideo, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";

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
import { Button, buttonVariants } from "@/components/ui/button";
import { ApiError, getIntegrityAlert, listExamVideos, listIntegrityAlerts } from "@/lib/dashboard-api";
import { apiBaseUrl, apiMediaBaseUrl } from "@/lib/api-base-url";
import type { ExamVideoSummary, IntegrityAlertDetail, IntegrityAlertSummary, JsonValue } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;

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
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function alertLabel(alert: IntegrityAlertSummary | IntegrityAlertDetail) {
  const originalType = stringValue(alertMetadata(alert).original_alert_type);
  return originalType ? labelize(originalType) : alert.alertTypeLabel || labelize(alert.alertType);
}

function absoluteMediaUrl(uri: string) {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  if (uri.startsWith("/media/")) {
    return `${apiMediaBaseUrl()}${uri}`;
  }
  if (uri.startsWith("/")) {
    return `${apiBaseUrl()}${uri}`;
  }
  return uri;
}

function evidenceUrl(uri: string) {
  return absoluteMediaUrl(uri);
}

function stringValue(value: JsonValue | undefined) {
  return typeof value === "string" ? value : "";
}

function objectValue(value: JsonValue | undefined): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringList(value: JsonValue | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function alertMetadata(alert: IntegrityAlertSummary | IntegrityAlertDetail) {
  return objectValue(alert.metadata);
}

function videoStatusTone(status: ExamVideoSummary["status"]): "success" | "warning" | "danger" | "muted" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "analyzing" || status === "uploaded") return "warning";
  return "muted";
}

function alertCount(video: ExamVideoSummary, kind: string) {
  const fallbackCounts = objectValue(video.analysis_report.alert_counts);
  const value = video.result?.alert_counts[kind] ?? fallbackCounts[kind];
  return typeof value === "number" ? value : 0;
}

function totalAlertCount(video: ExamVideoSummary, fallback: number) {
  const value = video.result?.total_alerts ?? video.analysis_report.total_alerts;
  return typeof value === "number" ? value : fallback;
}

function semantic(alert: IntegrityAlertSummary | IntegrityAlertDetail) {
  return objectValue(alertMetadata(alert).semantic);
}

function studentLabel(alert: IntegrityAlertSummary | IntegrityAlertDetail) {
  const studentId = alertMetadata(alert).student_id;
  return typeof studentId === "number" || typeof studentId === "string" ? `Student ${studentId}` : "Student not identified";
}

function timestampLabel(alert: IntegrityAlertSummary | IntegrityAlertDetail) {
  return stringValue(alertMetadata(alert).timestamp) || new Date(alert.occurredAt).toLocaleString();
}

export default function InvigilatorResultPage() {
  const params = useParams<{ videoId: string }>();
  const videoId = Number(params.videoId);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);

  const videosQuery = useQuery({
    queryKey: ["exam-videos"],
    queryFn: listExamVideos,
    refetchInterval: (query) => {
      const video = (query.state.data ?? []).find((item) => item.id === videoId);
      return video?.status === "uploaded" || video?.status === "analyzing" ? 5000 : false;
    },
  });
  const alertsQuery = useQuery({
    queryKey: ["integrity-alerts"],
    queryFn: listIntegrityAlerts,
  });

  const video = useMemo(
    () => (videosQuery.data ?? []).find((item) => item.id === videoId) ?? null,
    [videosQuery.data, videoId]
  );
  const alerts = useMemo(
    () => (alertsQuery.data ?? []).filter((alert) => alert.examVideo?.id === videoId),
    [alertsQuery.data, videoId]
  );
  const activeAlertId = selectedAlertId ?? alerts[0]?.id ?? null;

  const selectedAlertQuery = useQuery<IntegrityAlertDetail>({
    queryKey: ["integrity-alert", activeAlertId],
    queryFn: () => getIntegrityAlert(activeAlertId as number),
    enabled: activeAlertId !== null,
  });
  const selectedAlert = selectedAlertQuery.data ?? null;
  const selectedSemantic = selectedAlert ? semantic(selectedAlert) : {};
  const selectedSignals = stringList(selectedSemantic.signals);
  const selectedRisk = stringValue(selectedSemantic.risk_level);

  return (
    <ConsolePage
      eyebrow="Invigilator"
      title="Exam analysis report"
      description={video ? `${video.original_filename} analysis report with saved alerts and screenshots.` : "Load an analysis report."}
      meta={
        <>
          {video ? <span>{video.exam_course}</span> : null}
          <span>{alerts.length} alerts</span>
          {video?.result?.model_name ? <span>{video.result.model_name}</span> : null}
        </>
      }
      actions={
        <>
          <Link href="/dashboard/invigilator" className={buttonVariants({ size: "sm", variant: "outline" })}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void videosQuery.refetch();
              void alertsQuery.refetch();
            }}
            disabled={videosQuery.isFetching || alertsQuery.isFetching}
          >
            {videosQuery.isFetching || alertsQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            Refresh
          </Button>
        </>
      }
    >
      {videosQuery.isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !video ? (
        <ConsoleEmptyState title="Result not found" description="The requested video result could not be found." icon={FileVideo} />
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-4">
            <ConsoleStat label="Status" value={<StatusBadge label={labelize(video.status)} tone={videoStatusTone(video.status)} />} description={video.analysis_completed_at ? new Date(video.analysis_completed_at).toLocaleString() : "Analysis not completed"} />
            <ConsoleStat label="Frames" value={video.result?.frames_analyzed ?? video.frames_analyzed} description="Frames analyzed" />
            <ConsoleStat label="Duration" value={`${video.result?.duration_seconds ?? video.duration_seconds}s`} description="Uploaded video length" />
            <ConsoleStat label="Model" value={(video.result?.model_name ?? stringValue(video.analysis_report.model)) || "Pending"} description="Detector used for analysis" />
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <ConsoleStat label="Total" value={totalAlertCount(video, alerts.length)} description="All detected alerts" />
            <ConsoleStat label="Phone" value={alertCount(video, "phone")} description="Device evidence" />
            <ConsoleStat label="Talking" value={alertCount(video, "talking")} description="Mouth movement evidence" />
            <ConsoleStat label="Look-away" value={alertCount(video, "look-away")} description="Repeated head turn evidence" />
          </div>

          {video.status !== "completed" ? (
            <ConsoleEmptyState
              title="Analysis still running"
              description="The final report will appear here after analysis completes."
              icon={Loader2}
            />
          ) : alertsQuery.error ? (
            <p className="text-sm text-red-600">{(alertsQuery.error as ApiError).message}</p>
          ) : alerts.length === 0 ? (
            <ConsoleEmptyState title="No suspicious activity detected" description="Analysis completed without screenshot-backed alerts." icon={ShieldCheck} />
          ) : (
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]">
              <ConsolePanel title="Report alerts" description="Each row is saved in the database with semantic details and screenshot evidence.">
                <DataTable storageKey={`invigilator-result-alerts-${videoId}`} searchPlaceholder="Search report..." pageSizeOptions={[5, 10, 20]}>
                  <thead>
                    <tr>
                      <th className={consoleTableHeaderCellClass}>Alert</th>
                      <th className={consoleTableHeaderCellClass}>Student</th>
                      <th className={consoleTableHeaderCellClass}>Confidence</th>
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
                            <div className="mt-1 text-[11px] text-muted-foreground">{timestampLabel(alert)}</div>
                          </button>
                        </td>
                        <td className={consoleTableCellClass}>{studentLabel(alert)}</td>
                        <td className={consoleTableCellClass}>{formatPercent(alert.confidenceScore)}%</td>
                        <td className={consoleTableCellClass}>
                          <StatusBadge label={labelize(alert.status)} tone={statusTone[alert.status] ?? "muted"} />
                        </td>
                        <td className={consoleTableCellClass}>
                          <Button size="sm" variant="outline" onClick={() => setSelectedAlertId(alert.id)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </ConsolePanel>

              <ConsolePanel
                title={selectedAlert ? `${alertLabel(selectedAlert)} evidence` : "Screenshot evidence"}
                description={selectedAlert ? selectedAlert.summary : "Choose an alert to inspect its screenshot and semantic report."}
                contentClassName="space-y-3"
              >
                {selectedAlertQuery.isFetching && !selectedAlert ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedAlert ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Student</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{studentLabel(selectedAlert)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{timestampLabel(selectedAlert)}</p>
                      </div>
                      <div className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Risk</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{selectedRisk ? labelize(selectedRisk) : "Review recommended"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Confidence {formatPercent(selectedAlert.confidenceScore)}%</p>
                      </div>
                    </div>

                    <div className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Summary</p>
                      <p className="mt-2 text-sm text-foreground">{stringValue(selectedSemantic.summary) || selectedAlert.summary}</p>
                      {selectedSignals.length > 0 ? (
                        <div className="mt-3 space-y-1">
                          {selectedSignals.map((signal) => (
                            <p key={signal} className="rounded-md border border-[var(--dashboard-border)] bg-card px-2 py-1 text-xs text-muted-foreground">
                              {signal}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Screenshots</p>
                          <p className="text-sm text-foreground">Evidence captured from the analyzed video.</p>
                        </div>
                        <StatusBadge label={alertLabel(selectedAlert)} tone="warning" />
                      </div>

                      {selectedAlert.evidenceAssets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No evidence assets attached.</p>
                      ) : (
                        <div className="grid gap-2">
                          {selectedAlert.evidenceAssets.map((asset) => (
                            <div key={asset.id} className="rounded-md border border-[var(--dashboard-border)] bg-card p-3">
                              {asset.kind === "snapshot" ? (
                                <div
                                  aria-label={`Evidence ${asset.id}`}
                                  className="aspect-video w-full rounded-md border border-[var(--dashboard-border)] bg-contain bg-center bg-no-repeat"
                                  role="img"
                                  style={{ backgroundImage: `url(${evidenceUrl(asset.uri)})` }}
                                />
                              ) : null}
                              <p className="mt-2 text-xs text-muted-foreground">
                                Captured {new Date(asset.capturedAt).toLocaleString()} · {asset.qualityNote}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <ConsoleEmptyState title="Pick an alert" description="Use the report table to inspect screenshot evidence." icon={ShieldCheck} />
                )}
              </ConsolePanel>
            </div>
          )}
        </>
      )}
    </ConsolePage>
  );
}
