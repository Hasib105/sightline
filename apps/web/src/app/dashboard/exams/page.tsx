"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PlayCircle,
  Send,
} from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  StatusBadge,
} from "@/components/dashboard/console";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  listExamAttempts,
  listExams,
  submitExamAttempt,
} from "@/lib/dashboard-api";
import type { ExamSessionSummary, JsonValue } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEDIAPIPE_MODULE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm";
const MEDIAPIPE_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite";
const OBJECT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/latest/efficientdet_lite0.tflite";
const FACE_SAMPLE_MS = 5000;
const PHONE_SAMPLE_MS = 17000;
const FACE_GONE_LIMIT = 2;
const PHONE_SCORE_LIMIT = 0.45;
const ALERT_COOLDOWN_MS = 5000;
const EXAM_SECONDS = 20 * 60;

type VisionDetector = {
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => { detections?: Detection[] };
  close?: () => void;
};

type VisionModule = {
  FaceDetector: {
    createFromOptions: (vision: unknown, options: Record<string, unknown>) => Promise<VisionDetector>;
  };
  FilesetResolver: {
    forVisionTasks: (url: string) => Promise<unknown>;
  };
  ObjectDetector: {
    createFromOptions: (vision: unknown, options: Record<string, unknown>) => Promise<VisionDetector>;
  };
};

type Detection = {
  boundingBox?: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  categories?: Array<{
    score?: number;
    categoryName?: string;
    displayName?: string;
  }>;
};

type ProcEvent = {
  type: string;
  detail: string;
  time: string;
  iso: string;
  meta?: Record<string, JsonValue>;
};

type ProcAlert = ProcEvent & {
  evidence: string;
};

type Answers = Record<string, string>;

type QuizQuestion = {
  id: string;
  kind: "single_choice" | "short_answer";
  prompt: string;
  options: string[];
};

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function examWindowLabel(exam: ExamSessionSummary) {
  return `${new Date(exam.starts_at).toLocaleString()} - ${new Date(exam.ends_at).toLocaleTimeString()}`;
}

function getBox(detection: Detection) {
  return detection.boundingBox ?? { originX: 0, originY: 0, width: 0, height: 0 };
}

function getScore(detection: Detection) {
  return detection.categories?.[0]?.score ?? 0;
}

function getLabel(detection: Detection) {
  const category = detection.categories?.[0];
  return (category?.categoryName ?? category?.displayName ?? "").toLowerCase();
}

function isPhoneDetection(detection: Detection) {
  const label = getLabel(detection);
  return label === "cell phone" || label === "mobile phone" || label.includes("phone");
}

function asObject(value: JsonValue): Record<string, JsonValue> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value;
}

function asStringArray(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeQuestions(rawQuestions: JsonValue[] | undefined): QuizQuestion[] {
  return (rawQuestions ?? [])
    .map((rawQuestion, index) => {
      const item = asObject(rawQuestion);
      if (!item || typeof item.prompt !== "string") {
        return null;
      }
      const options = asStringArray(item.options);
      const kind = item.kind === "short_answer" || options.length === 0 ? "short_answer" : "single_choice";
      return {
        id: typeof item.id === "string" && item.id.trim() ? item.id : `q${index + 1}`,
        kind,
        prompt: item.prompt,
        options,
      };
    })
    .filter((question): question is QuizQuestion => Boolean(question));
}

function evidenceFallback(type: string, detail: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f9fafb";
  ctx.font = "700 42px system-ui, sans-serif";
  ctx.fillText("ProcBot Evidence", 40, 86);
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(type, 40, 150);
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`${nowLabel()} - ${detail}`.slice(0, 96), 40, 210);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function loadVisionModule(): Promise<VisionModule> {
  const importer = (specifier: string) => import(/* webpackIgnore: true */ specifier);
  return (await importer(MEDIAPIPE_MODULE_URL)) as unknown as VisionModule;
}

function examStatusTone(status: ExamSessionSummary["status"]) {
  if (status === "live" || status === "prepared") {
    return "success";
  }
  if (status === "scheduled") {
    return "warning";
  }
  if (status === "completed") {
    return "muted";
  }
  return "danger";
}

export default function StudentExamsPage() {
  const searchParams = useSearchParams();
  const quizTab = searchParams.get("quiz") === "1";
  const autoStart = searchParams.get("autostart") === "1";
  const examIdParam = searchParams.get("examId");
  const examIdFromQuery = useMemo(() => {
    if (!examIdParam) {
      return null;
    }
    const parsed = Number.parseInt(examIdParam, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [examIdParam]);
  const startButtonLabel = quizTab ? "Start Exam" : "Open Quiz Tab";
  const queryClient = useQueryClient();
  const examsQuery = useQuery({ queryKey: ["exams"], queryFn: listExams });
  const attemptsQuery = useQuery({ queryKey: ["exam-attempts"], queryFn: listExamAttempts });
  const submitMutation = useMutation({
    mutationFn: ({ examId, answers }: { examId: number; answers: Record<string, JsonValue> }) =>
      submitExamAttempt(examId, answers),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["exam-attempts"] });
    },
  });

  const exams = useMemo(() => examsQuery.data ?? [], [examsQuery.data]);
  const attempts = useMemo(() => attemptsQuery.data ?? [], [attemptsQuery.data]);
  const submittedExamIds = useMemo(
    () => new Set(attempts.filter((attempt) => attempt.status === "submitted").map((attempt) => attempt.exam_session)),
    [attempts]
  );
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const selectedExam = exams.find((exam) => exam.id === (selectedExamId ?? exams[0]?.id));
  const selectedQuestions = useMemo(
    () => normalizeQuestions(selectedExam?.quiz_questions),
    [selectedExam?.quiz_questions]
  );
  const [answers, setAnswers] = useState<Answers>({});
  const [examStarted, setExamStarted] = useState(false);
  const examStartedRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const connectingRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_SECONDS);
  const [procStatus, setProcStatus] = useState("Offline");
  const [monitorStatus, setMonitorStatus] = useState("Idle");
  const [faceMetric, setFaceMetric] = useState("-");
  const [phoneMetric, setPhoneMetric] = useState("-");
  const [tabMetric, setTabMetric] = useState("Visible");
  const [lastAnomaly, setLastAnomaly] = useState("None");
  const [events, setEvents] = useState<ProcEvent[]>([]);
  const [alerts, setAlerts] = useState<ProcAlert[]>([]);
  const [activationError, setActivationError] = useState<string | null>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<VisionDetector | null>(null);
  const objectDetectorRef = useRef<VisionDetector | null>(null);
  const countdownRef = useRef<number | null>(null);
  const faceTimerRef = useRef<number | null>(null);
  const phoneTimerRef = useRef<number | null>(null);
  const faceGoneStreakRef = useRef(0);
  const lastFacesRef = useRef<Detection[]>([]);
  const lastPhonesRef = useRef<Detection[]>([]);
  const cooldownsRef = useRef(new Map<string, number>());
  const syncedExamParamRef = useRef(false);
  const autoStartRef = useRef(false);

  const logEvent = useCallback((type: string, detail: string, meta?: Record<string, JsonValue>) => {
    setEvents((current) =>
      [
        {
          type,
          detail,
          meta,
          time: nowLabel(),
          iso: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 40)
    );
  }, []);

  const resizeOverlay = useCallback(() => {
    const video = webcamRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) {
      return;
    }
    const rect = video.getBoundingClientRect();
    overlay.width = Math.max(1, Math.floor(rect.width));
    overlay.height = Math.max(1, Math.floor(rect.height));
  }, []);

  const drawOverlay = useCallback((faces: Detection[], phones: Detection[]) => {
    const canvas = overlayRef.current;
    const video = webcamRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !video || !ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!video.videoWidth || !video.videoHeight) {
      return;
    }
    const sx = canvas.width / video.videoWidth;
    const sy = canvas.height / video.videoHeight;
    ctx.lineWidth = 2;
    ctx.font = "13px system-ui, sans-serif";

    faces.forEach((face) => {
      const box = getBox(face);
      const x = canvas.width - (box.originX + box.width) * sx;
      const y = box.originY * sy;
      const w = box.width * sx;
      const h = box.height * sy;
      ctx.strokeStyle = "#22c55e";
      ctx.fillStyle = "rgba(20,108,67,0.86)";
      ctx.strokeRect(x, y, w, h);
      ctx.fillRect(x, Math.max(0, y - 22), 84, 20);
      ctx.fillStyle = "#fff";
      ctx.fillText("Face", x + 8, Math.max(14, y - 7));
    });

    phones.forEach((phone) => {
      const box = getBox(phone);
      const x = canvas.width - (box.originX + box.width) * sx;
      const y = box.originY * sy;
      const w = box.width * sx;
      const h = box.height * sy;
      ctx.strokeStyle = "#f59e0b";
      ctx.fillStyle = "rgba(154,91,0,0.88)";
      ctx.strokeRect(x, y, w, h);
      ctx.fillRect(x, Math.max(0, y - 22), 96, 20);
      ctx.fillStyle = "#fff";
      ctx.fillText("Phone", x + 8, Math.max(14, y - 7));
    });
  }, []);

  const captureEvidence = useCallback((type: string, detail: string) => {
    const video = webcamRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      return evidenceFallback(type, detail);
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return evidenceFallback(type, detail);
    }
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(179,38,30,0.88)";
    ctx.fillRect(0, canvas.height - 86, canvas.width, 86);
    ctx.fillStyle = "#fff";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.fillText(type, 22, canvas.height - 48);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(`${nowLabel()} - ${detail}`.slice(0, 92), 22, canvas.height - 20);
    return canvas.toDataURL("image/jpeg", 0.82);
  }, []);

  const raiseAlert = useCallback(
    (type: string, detail: string, meta?: Record<string, JsonValue>) => {
      const last = cooldownsRef.current.get(type) ?? 0;
      const current = Date.now();
      if (current - last < ALERT_COOLDOWN_MS) {
        return;
      }
      cooldownsRef.current.set(type, current);
      const alert = {
        type,
        detail,
        meta,
        evidence: captureEvidence(type, detail),
        time: nowLabel(),
        iso: new Date().toISOString(),
      };
      setLastAnomaly(type);
      setAlerts((currentAlerts) => [alert, ...currentAlerts].slice(0, 20));
      logEvent(`Anomaly: ${type}`, detail, meta);
    },
    [captureEvidence, logEvent]
  );

  const sampleFaceMonitor = useCallback(() => {
    const video = webcamRef.current;
    const detector = faceDetectorRef.current;
    if (!examStartedRef.current || !video || !detector) {
      return;
    }
    try {
      const result = detector.detectForVideo(video, performance.now());
      const detections = result.detections ?? [];
      lastFacesRef.current = detections;
      setFaceMetric(detections.length.toString());
      drawOverlay(lastFacesRef.current, lastPhonesRef.current);

      if (detections.length === 0) {
        faceGoneStreakRef.current += 1;
      } else {
        faceGoneStreakRef.current = 0;
      }
      if (faceGoneStreakRef.current >= FACE_GONE_LIMIT) {
        raiseAlert("FaceGone", `No face detected for ${faceGoneStreakRef.current} consecutive samples.`, {
          faceCount: detections.length,
        });
      }
      if (detections.length > 1) {
        raiseAlert("MultiPerson", `${detections.length} faces detected in the exam camera.`, {
          faceCount: detections.length,
        });
      }
    } catch (error) {
      logEvent("MonitorError", error instanceof Error ? error.message : "Face sampling failed.");
    }
  }, [drawOverlay, logEvent, raiseAlert]);

  const samplePhoneMonitor = useCallback(() => {
    const video = webcamRef.current;
    const detector = objectDetectorRef.current;
    if (!examStartedRef.current || !video || !detector) {
      return;
    }
    try {
      const result = detector.detectForVideo(video, performance.now());
      const phonePredictions = (result.detections ?? []).filter(isPhoneDetection);
      lastPhonesRef.current = phonePredictions;
      setPhoneMetric(phonePredictions.length ? "Yes" : "No");
      drawOverlay(lastFacesRef.current, lastPhonesRef.current);

      if (phonePredictions.length > 0) {
        const best = phonePredictions[0];
        const score = getScore(best);
        raiseAlert("Phone", `Cell phone detected with ${(score * 100).toFixed(0)}% confidence.`, {
          score,
        });
      }
    } catch (error) {
      logEvent("MonitorError", error instanceof Error ? error.message : "Phone sampling failed.");
    }
  }, [drawOverlay, logEvent, raiseAlert]);

  const stopExam = useCallback(() => {
    examStartedRef.current = false;
    setExamStarted(false);
    connectingRef.current = false;
    setIsConnecting(false);
    for (const timer of [countdownRef, faceTimerRef, phoneTimerRef]) {
      if (timer.current) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    faceDetectorRef.current?.close?.();
    objectDetectorRef.current?.close?.();
    faceDetectorRef.current = null;
    objectDetectorRef.current = null;
    setMonitorStatus("Stopped");
    setProcStatus("Stopped");
  }, []);

  const activateProcBot = useCallback(async () => {
    setActivationError(null);
    setProcStatus("Loading models");
    setMonitorStatus("Starting");
    const [visionModule, stream] = await Promise.all([
      loadVisionModule(),
      navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: "user" },
        audio: false,
      }),
    ]);

    streamRef.current = stream;
    if (webcamRef.current) {
      webcamRef.current.srcObject = stream;
      await webcamRef.current.play();
      resizeOverlay();
    }

    const vision = await visionModule.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    const [faceDetector, objectDetector] = await Promise.all([
      visionModule.FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      }),
      visionModule.ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: OBJECT_MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        scoreThreshold: PHONE_SCORE_LIMIT,
        maxResults: 8,
      }),
    ]);
    faceDetectorRef.current = faceDetector;
    objectDetectorRef.current = objectDetector;
    setProcStatus("Active");
    setMonitorStatus("Online");
    setFaceMetric("Pending");
    setPhoneMetric("Pending");
    logEvent("ProcBotActivated", "Tab checks, face sampling, phone sampling, and event logging are active.");
    faceTimerRef.current = window.setInterval(sampleFaceMonitor, FACE_SAMPLE_MS);
    phoneTimerRef.current = window.setInterval(samplePhoneMonitor, PHONE_SAMPLE_MS);
    window.setTimeout(sampleFaceMonitor, 400);
    window.setTimeout(samplePhoneMonitor, 900);
  }, [logEvent, resizeOverlay, sampleFaceMonitor, samplePhoneMonitor]);

  const startExam = useCallback(async () => {
    if (!selectedExam || examStartedRef.current || connectingRef.current) {
      return;
    }
    connectingRef.current = true;
    setIsConnecting(true);
    setSecondsLeft(EXAM_SECONDS);
    setEvents([]);
    setAlerts([]);
    setLastAnomaly("None");
    setFaceMetric("-");
    setPhoneMetric("-");
    cooldownsRef.current.clear();
    faceGoneStreakRef.current = 0;
    setActivationError(null);
    try {
      await activateProcBot();
      examStartedRef.current = true;
      setExamStarted(true);
      logEvent("ExamOpened", `${selectedExam.course_code} exam opened.`);
      countdownRef.current = window.setInterval(() => {
        setSecondsLeft((current) => {
          const next = Math.max(0, current - 1);
          if (next === 0 && countdownRef.current) {
            window.clearInterval(countdownRef.current);
            countdownRef.current = null;
            logEvent("ExamTimeExpired", "Quiz timer reached zero.");
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ProcBot activation failed.";
      stopExam();
      setActivationError(message);
      setProcStatus("Blocked");
      setMonitorStatus("Blocked");
      logEvent("ActivationFailed", message);
    } finally {
      connectingRef.current = false;
      setIsConnecting(false);
    }
  }, [activateProcBot, logEvent, selectedExam, stopExam]);

  const openExamTab = useCallback(() => {
    if (!selectedExam) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("examId", selectedExam.id.toString());
    url.searchParams.set("quiz", "1");
    url.searchParams.set("autostart", "1");
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }, [selectedExam]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const hidden = document.hidden;
      setTabMetric(hidden ? "Hidden" : "Visible");
      if (!examStartedRef.current) {
        return;
      }
      if (hidden) {
        raiseAlert("TabSwitch", "Quiz tab became hidden while the exam was running.", {
          visibilityState: document.visibilityState,
        });
      } else {
        logEvent("TabVisible", "Student returned to the quiz tab.");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", resizeOverlay);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", resizeOverlay);
      stopExam();
    };
  }, [logEvent, raiseAlert, resizeOverlay, stopExam]);

  useEffect(() => {
    if (!examIdFromQuery || exams.length === 0 || syncedExamParamRef.current) {
      return;
    }
    const match = exams.find((exam) => exam.id === examIdFromQuery);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes a route query param after exams load.
      setSelectedExamId(match.id);
      syncedExamParamRef.current = true;
    }
  }, [examIdFromQuery, exams]);

  useEffect(() => {
    if (!quizTab || !autoStart || autoStartRef.current) {
      return;
    }
    if (!selectedExam || examStartedRef.current || connectingRef.current) {
      return;
    }
    autoStartRef.current = true;
    void startExam();
  }, [autoStart, quizTab, selectedExam, startExam]);

  const answeredCount = selectedQuestions.filter((question) => (answers[question.id] ?? "").trim()).length;
  const loading = examsQuery.isLoading || attemptsQuery.isLoading;
  const error = examsQuery.error ?? attemptsQuery.error;

  const submitAttempt = () => {
    if (!selectedExam) {
      return;
    }
    const procbotEvents = events.map((event) => ({
      type: event.type,
      detail: event.detail,
      time: event.time,
      iso: event.iso,
      meta: event.meta ?? {},
    }));
    const procbotAlerts = alerts.map((alert) => ({
      type: alert.type,
      detail: alert.detail,
      time: alert.time,
      iso: alert.iso,
      meta: alert.meta ?? {},
      evidence: alert.evidence,
    }));
    submitMutation.mutate(
      {
        examId: selectedExam.id,
        answers: {
          ...answers,
          procbot: {
            status: procStatus,
            lastAnomaly,
            events: procbotEvents,
            alerts: procbotAlerts,
            submittedAt: new Date().toISOString(),
          },
        },
      },
      {
        onSuccess: () => {
          logEvent("ExamSubmitted", "Exam attempt submitted. Monitoring stopped.");
          stopExam();
        },
      }
    );
  };

  return (
    <ConsolePage
      eyebrow="Student"
      title="Exam workspace"
      description="Take enrolled exams with ProcBot monitoring, tab-switch logging, webcam sampling, anomaly alerts, and evidence snapshots."
      meta={
        <>
          <span>{exams.length} enrolled exam sessions</span>
          <span>{attempts.length} attempt records</span>
        </>
      }
    >
      <div className="grid gap-2 md:grid-cols-4">
        <ConsoleStat label="Timer" value={formatTime(secondsLeft)} description="Current attempt duration" />
        <ConsoleStat label="Answered" value={`${answeredCount} / 4`} description="Quiz response count" />
        <ConsoleStat label="ProcBot" value={procStatus} description="Browser monitor state" />
        <ConsoleStat label="Alerts" value={alerts.length} description={lastAnomaly === "None" ? "No anomaly yet" : lastAnomaly} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as ApiError).message}</p>
      ) : exams.length === 0 ? (
        <ConsoleEmptyState
          title="No exams available"
          description="Enroll in a course first. Exams for active enrollments will appear here."
          icon={ClipboardList}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-3">
            <ConsolePanel
              title="Exam selector"
              description="Choose one exam session from your enrolled courses."
              contentClassName="grid gap-2 md:grid-cols-2"
            >
              {exams.map((exam) => {
                const selected = selectedExam?.id === exam.id;
                const submitted = submittedExamIds.has(exam.id);
                return (
                  <button
                    key={exam.id}
                    type="button"
                    className={cn(
                      "rounded-md border p-3 text-left transition",
                      selected
                        ? "border-[color-mix(in_oklab,var(--dashboard-accent)_44%,var(--dashboard-border))] bg-[var(--dashboard-accent-soft)]"
                        : "border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] hover:border-[color-mix(in_oklab,var(--dashboard-accent)_30%,var(--dashboard-border))]"
                    )}
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      if (!examStartedRef.current) {
                        setAnswers({});
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-foreground">{exam.course_code}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{exam.course_title}</p>
                      </div>
                      <StatusBadge label={submitted ? "submitted" : exam.status} tone={submitted ? "success" : examStatusTone(exam.status)} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{examWindowLabel(exam)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{exam.hall_name}</p>
                  </button>
                );
              })}
            </ConsolePanel>

            <ConsolePanel
              title={selectedExam ? selectedExam.quiz_title || `${selectedExam.course_code} secure quiz` : "Secure quiz"}
              description="Answer the attempt and submit when ready."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={quizTab ? startExam : openExamTab}
                    disabled={examStarted || isConnecting || !selectedExam}
                  >
                    <PlayCircle className="size-3.5" />
                    {startButtonLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={submitAttempt}
                    disabled={!examStarted || submitMutation.isPending || !selectedExam || selectedQuestions.length === 0}
                  >
                    {submitMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                    Submit Attempt
                  </Button>
                </div>
              }
              contentClassName="space-y-4"
            >
              {activationError ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{activationError}</span>
                </div>
              ) : null}

              {isConnecting ? (
                <ConsoleEmptyState
                  title="Connecting to ProcBot"
                  description="Once the webcam, tab checks, and detectors are online, the quiz will unlock."
                  icon={Loader2}
                />
              ) : !examStarted ? (
                <ConsoleEmptyState
                  title="Exam locked"
                  description={`Select an exam and press ${startButtonLabel} to reveal the teacher-created questions.`}
                  icon={ClipboardList}
                />
              ) : selectedQuestions.length === 0 ? (
                <ConsoleEmptyState
                  title="No quiz questions published"
                  description="This exam session does not have teacher-created quiz questions yet."
                  icon={ClipboardList}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge label="running" tone="success" />
                    <span>Attempt 1 of 1</span>
                    <span>Duration {formatTime(secondsLeft)}</span>
                    {selectedExam?.quiz_instructions ? <span>{selectedExam.quiz_instructions}</span> : null}
                  </div>

                  {selectedQuestions.map((question, index) => (
                    <section key={question.id} className="border-t border-[var(--dashboard-border)] pt-4 first:border-t-0 first:pt-0">
                      <h2 className="text-sm font-semibold text-foreground">
                        {index + 1}. {question.prompt}
                      </h2>
                      {question.kind === "single_choice" ? (
                        <div className="mt-3 grid gap-2">
                          {question.options.map((option) => (
                            <label
                              key={option}
                              className="grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)] items-start gap-2 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 text-sm text-foreground transition hover:border-[color-mix(in_oklab,var(--dashboard-accent)_34%,var(--dashboard-border))]"
                            >
                              <input
                                type="radio"
                                name={question.id}
                                checked={answers[question.id] === option}
                                onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          className="mt-3 min-h-28 w-full resize-y rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--dashboard-accent)_18%,transparent)]"
                          placeholder="Write your answer here..."
                          value={answers[question.id] ?? ""}
                          onChange={(event) =>
                            setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                          }
                        />
                      )}
                    </section>
                  ))}
                </>
              )}

              {submitMutation.error ? (
                <p className="text-sm text-red-600">{(submitMutation.error as ApiError).message}</p>
              ) : null}
            </ConsolePanel>
          </div>

          <div className="space-y-3">
            <ConsolePanel
              title={
                <span className="flex items-center gap-2">
                  <Camera className="size-4 text-muted-foreground" />
                  ProcBot dashboard
                </span>
              }
              description="Browser-only monitor for this attempt."
              contentClassName="space-y-3"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-slate-800 bg-slate-950">
                <video ref={webcamRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full scale-x-[-1] object-cover" />
                <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
                {!examStarted ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
                    Camera activates after start
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Faces", faceMetric],
                  ["Phone seen", phoneMetric],
                  ["Tab state", tabMetric],
                  ["Events", events.length.toString()],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2">
                    <div className="text-base font-semibold text-foreground">{value}</div>
                    <div className="text-[11px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 text-sm">
                {[
                  ["Quiz state", examStarted ? "In progress" : submittedExamIds.has(selectedExam?.id ?? -1) ? "Submitted" : "Not started"],
                  ["Monitor", monitorStatus],
                  ["Last anomaly", lastAnomaly],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-t border-[var(--dashboard-border)] pt-2 first:border-t-0 first:pt-0">
                    <span className="text-muted-foreground">{label}</span>
                    <strong className="text-right text-foreground">{value}</strong>
                  </div>
                ))}
              </div>
            </ConsolePanel>

            <ConsolePanel title="Alerts" description="Latest anomalies with captured evidence." contentClassName="space-y-2">
              {alerts.length === 0 ? (
                <ConsoleEmptyState title="No anomalies yet" description="Alerts will appear during an active attempt." icon={CheckCircle2} />
              ) : (
                alerts.slice(0, 6).map((alert) => (
                  <article key={`${alert.type}-${alert.iso}`} className="overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)]">
                    {alert.evidence ? (
                      <div
                        className="aspect-video w-full bg-cover bg-center"
                        role="img"
                        aria-label={`Evidence for ${alert.type}`}
                        style={{ backgroundImage: `url(${alert.evidence})` }}
                      />
                    ) : null}
                    <div className="p-2">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-foreground">{alert.type}</strong>
                        <time className="text-xs text-muted-foreground">{alert.time}</time>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.detail}</p>
                    </div>
                  </article>
                ))
              )}
            </ConsolePanel>

            <ConsolePanel title="Event logger" description="Recent browser and monitor events." contentClassName="space-y-2">
              {events.length === 0 ? (
                <ConsoleEmptyState title="No events yet" description="Start the exam to activate logging." icon={ClipboardList} />
              ) : (
                events.slice(0, 12).map((event) => (
                  <div key={`${event.type}-${event.iso}`} className="rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-2">
                    <strong className="text-xs text-foreground">{event.type}</strong>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {event.time} - {event.detail}
                    </p>
                  </div>
                ))
              )}
            </ConsolePanel>
          </div>
        </div>
      )}
    </ConsolePage>
  );
}
