"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, PlusCircle } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
  consoleInputClass,
} from "@/components/dashboard/console";
import { DashboardSelect } from "@/components/dashboard/form-controls";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createFacultyAction,
  getRiskTrends,
  getStudentRiskDetail,
} from "@/lib/dashboard-api";
import type { StudentRiskScore } from "@/lib/types";

function riskTone(level: string) {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "success";
}

function TrendChart({ points }: { points: Array<{ generatedAt: string; riskScore: number }> }) {
  if (points.length < 2) {
    return <p className="text-xs text-muted-foreground">Not enough runs to plot a trend yet.</p>;
  }
  const width = 320;
  const height = 90;
  const max = 100;
  const step = width / (points.length - 1);
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - (point.riskScore / max) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Risk trend">
      <polyline points={coords.join(" ")} fill="none" stroke="#3b82f6" strokeWidth="2" />
      {points.map((point, index) => (
        <circle key={index} cx={index * step} cy={height - (point.riskScore / max) * height} r="2.5" fill="#3b82f6" />
      ))}
    </svg>
  );
}

export default function StudentRiskDetailPage() {
  const params = useParams<{ studentId?: string }>();
  const studentId = Number(params.studentId);
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["student-risk", studentId],
    queryFn: () => getStudentRiskDetail(studentId),
    enabled: Number.isFinite(studentId),
  });
  const trendsQuery = useQuery({
    queryKey: ["student-trends", studentId],
    queryFn: () => getRiskTrends({ student: studentId }),
    enabled: Number.isFinite(studentId),
  });

  const detail = detailQuery.data;
  const [action, setAction] = useState("meeting");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const featureLabels = detail?.featureLabels ?? {};
  const primaryScore: StudentRiskScore | undefined = detail?.latest[0];
  const features = useMemo(() => {
    const entries = primaryScore?.features ?? {};
    return Object.entries(entries).sort((a, b) => a[1] - b[1]); // weakest first
  }, [primaryScore]);

  const actionMutation = useMutation({
    mutationFn: () =>
      createFacultyAction({
        student: studentId,
        course: primaryScore?.course ?? null,
        action,
        note: note.trim(),
      }),
    onSuccess: async () => {
      setMessage("Action logged.");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["student-risk", studentId] });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to log action."),
  });

  if (detailQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (detailQuery.error || !detail) {
    return <p className="p-6 text-sm text-red-600">{(detailQuery.error as ApiError)?.message ?? "Student not found."}</p>;
  }

  return (
    <ConsolePage
      eyebrow="Faculty"
      title={detail.student.name}
      description={`${detail.student.studentNumber} · ${detail.student.cohort} · Prior GPA ${detail.student.previousGpa.toFixed(2)}`}
      actions={
        <Link href="/dashboard/teacher/analytics">
          <Button size="sm" variant="ghost">
            <ArrowLeft className="size-3.5" /> Back
          </Button>
        </Link>
      }
    >
      <div className="grid gap-2 md:grid-cols-3">
        <ConsoleStat
          label="Top risk score"
          value={primaryScore ? `${primaryScore.risk_score}/100` : "—"}
          description={primaryScore?.course_code}
        />
        <ConsoleStat label="Courses scored" value={detail.latest.length} />
        <ConsoleStat label="Logged actions" value={detail.actions.length} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <ConsolePanel title="Risk by course" contentClassName="space-y-2">
          {detail.latest.length === 0 ? (
            <ConsoleEmptyState title="No scores" description="No risk scores for this student yet." />
          ) : (
            detail.latest.map((score) => (
              <div key={score.id} className="flex items-center justify-between rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{score.course_code}</p>
                  <p className="text-xs text-muted-foreground">{(score.contributing_factors ?? []).map(String).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{score.risk_score}</span>
                  <StatusBadge label={score.risk_level} tone={riskTone(score.risk_level)} />
                </div>
              </div>
            ))
          )}
        </ConsolePanel>

        <ConsolePanel title="Feature contribution" description="Per-student values (lower = weaker)." contentClassName="space-y-2">
          {features.length === 0 ? (
            <ConsoleEmptyState title="No features" description="Feature values appear after a run." />
          ) : (
            features.map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">{featureLabels[key] ?? key}</span>
                  <span className="font-mono text-muted-foreground">{Math.round(value * 100)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-[var(--dashboard-panel-muted)]">
                  <div
                    className={`h-2 rounded ${value < 0.4 ? "bg-red-500" : value < 0.6 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.max(4, value * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </ConsolePanel>

        <ConsolePanel title="Historical risk trend" description="Risk score across runs." contentClassName="space-y-2">
          <TrendChart points={trendsQuery.data?.points ?? []} />
        </ConsolePanel>

        <ConsolePanel title="Faculty action log" description="Interventions for this student." contentClassName="space-y-3">
          <div className="space-y-2">
            <DashboardSelect
              value={action}
              onValueChange={setAction}
              options={[
                { value: "meeting", label: "Meeting" },
                { value: "email", label: "Email" },
                { value: "call", label: "Call" },
                { value: "note", label: "Note" },
              ]}
            />
            <input
              className={consoleInputClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What did you do / plan?"
            />
            {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
            <Button size="sm" onClick={() => actionMutation.mutate()} disabled={actionMutation.isPending || !note.trim()}>
              {actionMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <PlusCircle className="size-3.5" />}
              Log action
            </Button>
          </div>
          <div className="space-y-2">
            {detail.actions.length === 0 ? (
              <ConsoleEmptyState title="No actions yet" description="Logged interventions will appear here." />
            ) : (
              detail.actions.map((item) => (
                <div key={item.id} className="rounded-md border border-[var(--dashboard-border)] p-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">{item.action}</span>
                    <span className="text-muted-foreground">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  {item.note ? <p className="mt-0.5 text-muted-foreground">{item.note}</p> : null}
                  <p className="mt-0.5 text-muted-foreground">
                    {item.course_code ?? ""} {item.faculty_username ? `· ${item.faculty_username}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </ConsolePanel>
      </div>
    </ConsolePage>
  );
}
