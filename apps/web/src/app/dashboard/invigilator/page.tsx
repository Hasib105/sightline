"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, FileVideo, Loader2, PlayCircle, RefreshCcw, Trash2, Upload } from "lucide-react";

import {
  ConsoleEmptyState,
  ConsolePage,
  ConsolePanel,
  ConsoleStat,
  DataTable,
  StatusBadge,
  consoleInputClass,
  consoleTableCellClass,
  consoleTableHeaderCellClass,
} from "@/components/dashboard/console";
import { Button, buttonVariants } from "@/components/ui/button";
import { apiBaseUrl, apiMediaBaseUrl, apiWebSocketBaseUrl } from "@/lib/api-base-url";
import { deleteExamVideo, listExamVideos, startExamVideoAnalysis, uploadExamVideo } from "@/lib/dashboard-api";
import type { ExamVideoSummary, JsonValue } from "@/lib/types";

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function videoStatusTone(status: ExamVideoSummary["status"]): "success" | "warning" | "danger" | "muted" {
  if (status === "completed") return "success";
  if (status === "failed") return "danger";
  if (status === "analyzing" || status === "uploaded") return "warning";
  return "muted";
}

function videoUrl(video: ExamVideoSummary) {
  const uri = video.file_url || video.file_uri;
  return absoluteMediaUrl(uri);
}

function analysisVideoUrl(video: ExamVideoSummary) {
  const annotatedUrl =
    video.result?.annotated_video_uri ||
    stringValue(video.analysis_report.annotated_video_url) ||
    stringValue(video.analysis_report.annotated_video_path);
  return annotatedUrl ? absoluteMediaUrl(annotatedUrl) : videoUrl(video);
}

function livePreviewUrl(video: ExamVideoSummary) {
  const previewUrl =
    video.result?.latest_preview_uri ||
    stringValue(video.analysis_report.latest_preview_url) ||
    stringValue(video.analysis_report.latest_preview_uri);
  if (!previewUrl) {
    return "";
  }
  const cacheKey = video.result?.updated_at || video.updated_at;
  return `${absoluteMediaUrl(previewUrl)}${previewUrl.includes("?") ? "&" : "?"}t=${encodeURIComponent(cacheKey)}`;
}

function liveAnalysisWebSocketUrl(videoId: number) {
  return `${apiWebSocketBaseUrl()}/ws/exam-videos/${videoId}/analysis/`;
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

function stringValue(value: JsonValue | undefined) {
  return typeof value === "string" ? value : "";
}

function LiveAnalysisCanvas({
  fallbackSrc,
  initialStatus,
  videoId,
}: {
  fallbackSrc: string;
  initialStatus: string;
  videoId: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState("Connecting to live analysis");
  const socketUrl = useMemo(() => liveAnalysisWebSocketUrl(videoId), [videoId]);
  const statusLabel = hasFrame ? connectionLabel : initialStatus || connectionLabel;

  useEffect(() => {
    const socket = new WebSocket(socketUrl);
    let closed = false;
    let activeObjectUrl = "";

    socket.binaryType = "blob";

    socket.onerror = () => setConnectionLabel("Live connection failed");
    socket.onclose = () => {
      if (!closed) {
        setConnectionLabel("Live connection closed");
      }
    };
    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const payload = JSON.parse(event.data) as { type?: string; latest_status?: string };
          if (payload.latest_status) {
            setConnectionLabel(payload.latest_status);
          } else if (payload.type === "complete") {
            setConnectionLabel("Analysis complete");
          }
        } catch {
          setConnectionLabel("Live analysis running");
        }
        return;
      }

      const objectUrl = URL.createObjectURL(event.data as Blob);
      activeObjectUrl = objectUrl;
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext("2d");
        context?.drawImage(image, 0, 0, canvas.width, canvas.height);
        setHasFrame(true);
        URL.revokeObjectURL(objectUrl);
        if (activeObjectUrl === objectUrl) {
          activeObjectUrl = "";
        }
      };
      image.onerror = () => URL.revokeObjectURL(objectUrl);
      image.src = objectUrl;
    };

    return () => {
      closed = true;
      socket.close();
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [socketUrl]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-md border border-[var(--dashboard-border)] bg-black">
      {fallbackSrc && !hasFrame ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="Latest analyzed frame" className="absolute inset-0 size-full object-contain" src={fallbackSrc} />
      ) : null}
      <canvas ref={canvasRef} className="absolute inset-0 size-full object-contain" />
      {!hasFrame ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/75">
          <span className="inline-flex items-center gap-2 rounded-md bg-black/45 px-3 py-2">
            <Loader2 className="size-4 animate-spin" />
            {statusLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function InvigilatorDashboardPage() {
  const queryClient = useQueryClient();
  const videosQuery = useQuery({
    queryKey: ["exam-videos"],
    queryFn: listExamVideos,
    placeholderData: (previousData) => previousData,
    refetchInterval: (query) => {
      const videos = query.state.data ?? [];
      return videos.some((video) => video.status === "analyzing") ? 3000 : false;
    },
  });
  const videos = useMemo(() => videosQuery.data ?? [], [videosQuery.data]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!videoFile) {
        throw new Error("Select a video file.");
      }
      setUploadProgress(0);
      return uploadExamVideo(
        { file: videoFile, notes: uploadNote.trim() },
        {
          onProgress: (percent) => setUploadProgress(percent),
        }
      );
    },
    onSuccess: async (video) => {
      setSelectedVideoId(video.id);
      setVideoFile(null);
      setUploadNote("");
      setUploadProgress(null);
      await queryClient.invalidateQueries({ queryKey: ["exam-videos"] });
    },
    onError: () => {
      setUploadProgress(null);
    },
  });

  const startMutation = useMutation({
    mutationFn: startExamVideoAnalysis,
    onMutate: async (videoId) => {
      await queryClient.cancelQueries({ queryKey: ["exam-videos"] });
      const previous = queryClient.getQueryData<ExamVideoSummary[]>(["exam-videos"]);
      const startedAt = new Date().toISOString();
      queryClient.setQueryData<ExamVideoSummary[]>(["exam-videos"], (current) =>
        current?.map((video) =>
          video.id === videoId
            ? {
                ...video,
                status: "analyzing",
                analysis_started_at: startedAt,
                analysis_completed_at: null,
                error_message: "",
                frames_analyzed: 0,
                analysis_report: {},
                result: null,
              }
            : video
        ) ?? current
      );
      setSelectedVideoId(videoId);
      return { previous };
    },
    onError: (_error, _videoId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["exam-videos"], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["exam-videos"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExamVideo,
    onSuccess: async (result) => {
      if (selectedVideoId === result.record_id) {
        setSelectedVideoId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["exam-videos"] });
    },
  });

  const queuedVideos = videos.filter((video) => video.status === "uploaded").length;
  const analyzingVideos = videos.filter((video) => video.status === "analyzing").length;
  const completedVideos = videos.filter((video) => video.status === "completed").length;
  const failedVideos = videos.filter((video) => video.status === "failed").length;
  const latestCompletedVideo = videos.find((video) => video.status === "completed");
  const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? videos[0] ?? null;
  const selectedLivePreview = selectedVideo ? livePreviewUrl(selectedVideo) : "";
  const startingVideoId = startMutation.isPending ? startMutation.variables : null;

  const deleteVideo = (video: ExamVideoSummary) => {
    if (window.confirm(`Delete ${video.original_filename}?`)) {
      deleteMutation.mutate(video.id);
    }
  };

  return (
    <ConsolePage
      eyebrow="Invigilator"
      title="Video analysis"
      description="Upload an exam video, let Sightline run analysis, then open the completed result on its own review page."
      meta={
        <>
          <span>{videos.length} videos</span>
          <span>{queuedVideos} uploaded</span>
          <span>{analyzingVideos} analyzing</span>
          <span>{completedVideos} completed</span>
        </>
      }
      actions={
        <Button size="sm" variant="outline" onClick={() => void videosQuery.refetch()} disabled={videosQuery.isFetching}>
          {videosQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
          Refresh
        </Button>
      }
    >
      <div className="grid gap-2 md:grid-cols-4">
        <ConsoleStat label="Video jobs" value={videos.length} description="Uploaded files in the queue" />
        <ConsoleStat label="Uploaded" value={queuedVideos} description="Ready to start analysis" />
        <ConsoleStat label="Analyzing" value={analyzingVideos} description="Currently running" />
        <ConsoleStat label="Completed" value={completedVideos} description="Ready to review on result page" />
        <ConsoleStat label="Failed" value={failedVideos} description="Can be restarted or deleted" />
      </div>

      {latestCompletedVideo ? (
        <div className="flex flex-col gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">Analysis complete</p>
              <p className="truncate text-xs opacity-80">
                {latestCompletedVideo.original_filename} is ready with {latestCompletedVideo.result?.total_alerts ?? latestCompletedVideo.alert_count} alert{(latestCompletedVideo.result?.total_alerts ?? latestCompletedVideo.alert_count) === 1 ? "" : "s"}.
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/invigilator/results/${latestCompletedVideo.id}`}
            className={buttonVariants({
              size: "sm",
              variant: "outline",
              className: "border-emerald-300 bg-white/70 text-emerald-800 hover:bg-white dark:border-emerald-500/40 dark:bg-transparent dark:text-emerald-100",
            })}
          >
            <Eye className="size-4" />
            View result
          </Link>
        </div>
      ) : null}

      {selectedVideo ? (
        <ConsolePanel
          title="Uploaded video"
          description="Preview the selected video, then start analysis when ready."
          actions={
            <>
              {selectedVideo.status === "uploaded" || selectedVideo.status === "failed" ? (
                <Button
                  size="sm"
                  onClick={() => startMutation.mutate(selectedVideo.id)}
                  disabled={startMutation.isPending && startingVideoId === selectedVideo.id}
                >
                  {startMutation.isPending && startingVideoId === selectedVideo.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PlayCircle className="size-4" />
                  )}
                  Start analysis
                </Button>
              ) : null}
              {selectedVideo.status === "completed" ? (
                <Link
                  href={`/dashboard/invigilator/results/${selectedVideo.id}`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  <Eye className="size-4" />
                  Result
                </Link>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteVideo(selectedVideo)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Delete
              </Button>
            </>
          }
          contentClassName="space-y-3"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {selectedVideo.status === "analyzing" ? (
              <LiveAnalysisCanvas
                key={selectedVideo.id}
                fallbackSrc={selectedLivePreview}
                initialStatus={selectedVideo.result?.latest_status || "Loading YOLO models..."}
                videoId={selectedVideo.id}
              />
            ) : (
              <video
                className="aspect-video w-full rounded-md border border-[var(--dashboard-border)] bg-black"
                controls
                preload="metadata"
                src={selectedVideo.status === "completed" ? analysisVideoUrl(selectedVideo) : videoUrl(selectedVideo)}
              />
            )}
            <div className="space-y-3 rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-panel-muted)] p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{selectedVideo.original_filename}</p>
                <p className="mt-1 text-xs text-muted-foreground">{selectedVideo.exam_course} · {new Date(selectedVideo.created_at).toLocaleString()}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedVideo.status === "analyzing"
                    ? "Showing live analyzed frames with boxes and labels."
                    : selectedVideo.status === "completed"
                      ? "Showing analyzed video with boxes and labels."
                      : "Showing uploaded source video."}
                </p>
              </div>
              <StatusBadge label={labelize(selectedVideo.status)} tone={videoStatusTone(selectedVideo.status)} />
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-md border border-[var(--dashboard-border)] bg-card p-2">
                  <p className="font-medium text-foreground">{selectedVideo.result?.frames_analyzed ?? selectedVideo.frames_analyzed}</p>
                  <p>Frames</p>
                </div>
                <div className="rounded-md border border-[var(--dashboard-border)] bg-card p-2">
                  <p className="font-medium text-foreground">{selectedVideo.result?.total_alerts ?? selectedVideo.alert_count}</p>
                  <p>Alerts</p>
                </div>
              </div>
              {selectedVideo.status === "analyzing" && selectedVideo.result ? (
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-[var(--dashboard-accent)] transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, selectedVideo.result.progress_percent))}%` }}
                    />
                  </div>
                  <p>{selectedVideo.result.latest_status || "Analysis running"}</p>
                </div>
              ) : null}
              {selectedVideo.error_message ? <p className="text-xs text-red-600">{selectedVideo.error_message}</p> : null}
            </div>
          </div>
          {startMutation.error ? <p className="text-sm text-red-600">{(startMutation.error as Error).message}</p> : null}
          {deleteMutation.error ? <p className="text-sm text-red-600">{(deleteMutation.error as Error).message}</p> : null}
        </ConsolePanel>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <ConsolePanel title="Upload video" description="Select a recorded exam video. Analysis starts only when you press Start." contentClassName="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Video file</span>
            <input
              className={consoleInputClass}
              type="file"
              accept="video/mp4,video/quicktime,video/x-matroska,video/x-msvideo"
              disabled={uploadMutation.isPending}
              onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-foreground">Notes</span>
            <input
              className={consoleInputClass}
              value={uploadNote}
              onChange={(event) => setUploadNote(event.target.value)}
              placeholder="Optional context"
              disabled={uploadMutation.isPending}
            />
          </label>
          <Button
            size="sm"
            disabled={!videoFile || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            {uploadMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Upload video
          </Button>
          {uploadProgress !== null ? (
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-brand-1 transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">Uploading… {uploadProgress}%</p>
            </div>
          ) : null}
          {uploadMutation.error ? <p className="text-sm text-red-600">{(uploadMutation.error as Error).message}</p> : null}
        </ConsolePanel>

        <ConsolePanel title="Video jobs" description="Uploaded videos and background analysis status.">
          {videosQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : videos.length === 0 ? (
            <ConsoleEmptyState title="No videos uploaded" description="Uploaded exam videos will appear here." icon={FileVideo} />
          ) : (
            <DataTable storageKey="invigilator-videos" searchPlaceholder="Search videos..." pageSizeOptions={[5, 10, 20]} chrome="compact">
              <thead>
                <tr>
                  <th className={consoleTableHeaderCellClass}>Video</th>
                  <th className={consoleTableHeaderCellClass}>Status</th>
                  <th className={consoleTableHeaderCellClass}>Frames</th>
                  <th className={consoleTableHeaderCellClass}>Alerts</th>
                  <th className={consoleTableHeaderCellClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.id} className={selectedVideo?.id === video.id ? "bg-[var(--dashboard-accent-soft)]/40" : "hover:bg-muted/40"}>
                    <td className={consoleTableCellClass}>
                      <button type="button" className="block text-left" onClick={() => setSelectedVideoId(video.id)}>
                        <div className="font-medium text-foreground">{video.original_filename}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{video.exam_course} · {new Date(video.created_at).toLocaleString()}</div>
                      </button>
                      {video.error_message ? <div className="mt-1 text-xs text-red-600">{video.error_message}</div> : null}
                    </td>
                    <td className={consoleTableCellClass}>
                      <StatusBadge label={labelize(video.status)} tone={videoStatusTone(video.status)} />
                    </td>
                    <td className={consoleTableCellClass}>{video.result?.frames_analyzed ?? video.frames_analyzed}</td>
                    <td className={consoleTableCellClass}>{video.result?.total_alerts ?? video.alert_count}</td>
                    <td className={consoleTableCellClass}>
                      <div className="flex flex-wrap gap-2">
                      {video.status === "uploaded" || video.status === "failed" ? (
                        <Button
                          size="sm"
                          onClick={() => startMutation.mutate(video.id)}
                          disabled={startMutation.isPending && startingVideoId === video.id}
                        >
                          {startMutation.isPending && startingVideoId === video.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <PlayCircle className="size-4" />
                          )}
                          Start
                        </Button>
                      ) : null}
                      {video.status === "completed" ? (
                        <Link
                          href={`/dashboard/invigilator/results/${video.id}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          <Eye className="size-4" />
                          View
                        </Link>
                      ) : video.status === "analyzing" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="size-3 animate-spin" />
                          Processing
                        </span>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteVideo(video)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </ConsolePanel>
      </div>
    </ConsolePage>
  );
}
