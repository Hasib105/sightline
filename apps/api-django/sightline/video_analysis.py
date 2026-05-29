from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone

from .models import AlertEvent, Camera, EvidenceAsset, ExamVideo, ExamVideoAnalysisResult
from .live_analysis_stream import close_live_stream, publish_live_frame, publish_live_status


def analyze_exam_video(video_id: int) -> dict[str, Any]:
    video = ExamVideo.objects.select_related("exam_session", "exam_session__hall").get(id=video_id)
    video.status = ExamVideo.STATUS_ANALYZING
    video.analysis_started_at = timezone.now()
    video.analysis_completed_at = None
    video.error_message = ""
    video.save(update_fields=["status", "analysis_started_at", "analysis_completed_at", "error_message", "updated_at"])

    try:
        from .exam_detection.config import CFG
        from .exam_detection.processor import process_video

        video_path = _video_path(video)
        output_dir = Path(settings.MEDIA_ROOT) / "evidence" / f"exam_video_{video.id}"
        ExamVideoAnalysisResult.objects.update_or_create(
            exam_video=video,
            defaults={
                "model_name": CFG.detector_label(),
                "session_uri": _media_uri(output_dir),
                "latest_status": "Starting analysis",
            },
        )
        result = process_video(
            video_path,
            video.original_filename,
            output_dir,
            progress_callback=lambda progress: _persist_progress(video, progress),
        )
        created_alert_ids = _persist_result(video, result)

        video.status = ExamVideo.STATUS_COMPLETED
        video.frames_analyzed = result.frames_analyzed
        video.duration_seconds = Decimal(str(round(result.duration_seconds, 2)))
        video.analysis_completed_at = timezone.now()
        video.analysis_report = _report_payload(result, created_alert_ids)
        _persist_analysis_result(video, result, created_alert_ids, video.analysis_report)
        publish_live_status(
            video.id,
            {
                "type": "complete",
                "video_id": video.id,
                "status": ExamVideo.STATUS_COMPLETED,
                "frames_analyzed": result.frames_analyzed,
                "total_frames": getattr(result, "total_frames", 0),
                "progress_percent": 100,
                "total_alerts": len(created_alert_ids),
                "latest_status": "Analysis complete",
            },
        )
        close_live_stream(video.id)
        video.save(
            update_fields=[
                "status",
                "frames_analyzed",
                "duration_seconds",
                "analysis_completed_at",
                "analysis_report",
                "updated_at",
            ]
        )
        return {"video_id": video.id, "status": video.status, "alert_ids": created_alert_ids}
    except Exception as exc:
        video.status = ExamVideo.STATUS_FAILED
        video.error_message = str(exc)
        video.analysis_completed_at = timezone.now()
        video.save(update_fields=["status", "error_message", "analysis_completed_at", "updated_at"])
        publish_live_status(
            video.id,
            {
                "type": "failed",
                "video_id": video.id,
                "status": ExamVideo.STATUS_FAILED,
                "latest_status": str(exc),
            },
        )
        close_live_stream(video.id)
        raise


def _report_payload(result: Any, created_alert_ids: list[int]) -> dict[str, Any]:
    return {
        "model": result.model_name,
        "report_path": _media_uri(result.report_path),
        "session_dir": _media_uri(result.session_dir),
        "annotated_video_path": _media_uri(result.annotated_video_path),
        "annotated_video_url": _media_uri(result.annotated_video_path),
        "latest_preview_uri": _media_uri(getattr(result, "latest_preview_path", "")),
        "latest_preview_url": _media_uri(getattr(result, "latest_preview_path", "")),
        "frames_analyzed": result.frames_analyzed,
        "duration_seconds": round(result.duration_seconds, 2),
        "total_frames": getattr(result, "total_frames", 0),
        "total_alerts": len(created_alert_ids),
        "alert_ids": created_alert_ids,
        "alert_counts": _alert_counts(result.alerts),
    }


def _persist_analysis_result(
    video: ExamVideo,
    result: Any,
    created_alert_ids: list[int],
    report_payload: dict[str, Any],
) -> None:
    ExamVideoAnalysisResult.objects.update_or_create(
        exam_video=video,
        defaults={
            "model_name": result.model_name,
            "report_uri": _media_uri(result.report_path),
            "session_uri": _media_uri(result.session_dir),
            "annotated_video_uri": _media_uri(result.annotated_video_path),
            "latest_preview_uri": _media_uri(getattr(result, "latest_preview_path", "")),
            "frames_analyzed": result.frames_analyzed,
            "current_frame": getattr(result, "total_frames", 0),
            "total_frames": getattr(result, "total_frames", 0),
            "progress_percent": 100,
            "duration_seconds": Decimal(str(round(result.duration_seconds, 2))),
            "total_alerts": len(created_alert_ids),
            "alert_counts": _alert_counts(result.alerts),
            "latest_status": "Analysis complete",
            "report_payload": report_payload,
        },
    )


def _video_path(video: ExamVideo) -> str:
    if video.file_uri.startswith("file://"):
        return video.file_uri.removeprefix("file://")
    try:
        return default_storage.path(video.file_uri)
    except NotImplementedError:
        return video.file_uri


def _persist_progress(video: ExamVideo, progress: Any) -> None:
    progress_percent = 0
    if progress.total_frames:
        progress_percent = min(99, max(0, round((progress.current_frame / progress.total_frames) * 100)))
    preview_uri = _media_uri(progress.latest_preview_path)
    status_text = (
        f"Frame {progress.current_frame}/{progress.total_frames or '?'} | "
        f"Analyzed {progress.frames_analyzed} | Time {progress.duration_seconds:.1f}s"
    )
    progress_payload = {
        "video_id": video.id,
        "status": "analyzing",
        "frames_analyzed": progress.frames_analyzed,
        "current_frame": progress.current_frame,
        "total_frames": progress.total_frames,
        "progress_percent": progress_percent,
        "duration_seconds": round(progress.duration_seconds, 2),
        "total_alerts": progress.alert_count,
        "latest_status": status_text,
        "latest_preview_uri": preview_uri,
        "model_name": progress.model_name,
    }
    if progress.latest_preview_bytes:
        publish_live_frame(video.id, progress.latest_preview_bytes, progress_payload)
    ExamVideoAnalysisResult.objects.update_or_create(
        exam_video=video,
        defaults={
            "model_name": progress.model_name,
            "session_uri": _media_uri(Path(progress.latest_preview_path).parent),
            "latest_preview_uri": preview_uri,
            "frames_analyzed": progress.frames_analyzed,
            "current_frame": progress.current_frame,
            "total_frames": progress.total_frames,
            "progress_percent": progress_percent,
            "duration_seconds": Decimal(str(round(progress.duration_seconds, 2))),
            "total_alerts": progress.alert_count,
            "latest_status": status_text,
        },
    )
    ExamVideo.objects.filter(id=video.id).update(
        frames_analyzed=progress.frames_analyzed,
        duration_seconds=Decimal(str(round(progress.duration_seconds, 2))),
        analysis_report={
            **(video.analysis_report or {}),
            "model": progress.model_name,
            "latest_preview_url": preview_uri,
            "latest_preview_uri": preview_uri,
            "frames_analyzed": progress.frames_analyzed,
            "duration_seconds": round(progress.duration_seconds, 2),
            "total_alerts": progress.alert_count,
            "progress_percent": progress_percent,
            "latest_status": status_text,
        },
    )
    video.frames_analyzed = progress.frames_analyzed
    video.duration_seconds = Decimal(str(round(progress.duration_seconds, 2)))
    video.analysis_report = {
        **(video.analysis_report or {}),
        "model": progress.model_name,
        "latest_preview_url": preview_uri,
        "latest_preview_uri": preview_uri,
        "frames_analyzed": progress.frames_analyzed,
        "duration_seconds": round(progress.duration_seconds, 2),
        "total_alerts": progress.alert_count,
        "progress_percent": progress_percent,
        "latest_status": status_text,
    }


@transaction.atomic
def _persist_result(video: ExamVideo, result: Any) -> list[int]:
    camera = _camera_for_video(video)
    video.alerts.all().delete()

    created_alert_ids = []
    base_time = video.created_at or timezone.now()

    for record in result.alerts:
        seconds = float(record.get("seconds") or 0)
        occurred_at = base_time + timezone.timedelta(seconds=seconds)
        started_at = base_time + timezone.timedelta(seconds=max(0, seconds - 5))
        semantic = record.get("semantic") or {}
        screenshot_uri = _media_uri(record.get("screenshot", ""))
        alert = AlertEvent.objects.create(
            exam_session=video.exam_session,
            exam_video=video,
            camera=camera,
            alert_type=_alert_type(record.get("alert_type")),
            occurred_at=occurred_at,
            window_started_at=started_at,
            window_ended_at=occurred_at,
            confidence_score=_confidence(record.get("confidence_score")),
            visibility_quality="uploaded video frame",
            status=AlertEvent.STATUS_VISIBLE,
            summary=(semantic.get("summary") or record.get("detail") or "Suspicious exam behavior detected.")[:240],
            metadata=_alert_metadata(record, screenshot_uri),
        )
        if screenshot_uri:
            EvidenceAsset.objects.create(
                alert=alert,
                kind=EvidenceAsset.KIND_SNAPSHOT,
                uri=screenshot_uri,
                captured_at=occurred_at,
                quality_note=f"YOLO evidence at {record.get('timestamp') or round(seconds, 2)}",
            )
        created_alert_ids.append(alert.id)
        _broadcast_alert_created(alert)

    return created_alert_ids


def _camera_for_video(video: ExamVideo) -> Camera:
    camera = Camera.objects.filter(hall=video.exam_session.hall).order_by("id").first()
    if camera:
        return camera
    return Camera.objects.create(
        hall=video.exam_session.hall,
        name="Uploaded video",
        stream_url=video.file_uri,
        status=Camera.STATUS_ACTIVE,
        last_health_message="Created for uploaded video analysis",
        last_seen_at=timezone.now(),
    )


def _alert_type(kind: str | None) -> str:
    if kind == "phone":
        return AlertEvent.TYPE_DEVICE
    if kind == "look-away":
        return AlertEvent.TYPE_LOOK_AWAY
    return AlertEvent.TYPE_NEIGHBORING_DESK


def _confidence(score: Any) -> Decimal:
    try:
        value = float(score)
    except (TypeError, ValueError):
        value = 0.5
    normalized = min(max(value / 12.0, 0.01), 0.99)
    return Decimal(str(round(normalized, 2)))


def _media_uri(path_value: str | Path) -> str:
    if not path_value:
        return ""
    path_text = str(path_value)
    if path_text.startswith(("http://", "https://", "/media/")):
        return path_text
    path = Path(path_text)
    try:
        relative = path.resolve().relative_to(Path(settings.MEDIA_ROOT).resolve())
    except (OSError, ValueError):
        return path_text
    return default_storage.url(relative.as_posix())


def _alert_counts(alerts: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for alert in alerts:
        kind = str(alert.get("alert_type") or "unknown")
        counts[kind] = counts.get(kind, 0) + 1
    return counts


def _alert_metadata(record: dict[str, Any], screenshot_uri: str) -> dict[str, Any]:
    semantic = record.get("semantic") or {}
    metadata = {
        "source": "uploaded_video_yolov8",
        "original_alert_type": record.get("alert_type"),
        "student_id": record.get("student_id"),
        "neighbor_id": record.get("neighbor_id"),
        "timestamp": record.get("timestamp"),
        "seconds": record.get("seconds"),
        "confidence_score": record.get("confidence_score"),
        "detail": record.get("detail"),
        "evidence": record.get("evidence") or {},
        "semantic": semantic,
        "screenshot_uri": screenshot_uri,
    }
    return _json_safe(metadata)


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, Path):
        return str(value)
    if hasattr(value, "item"):
        try:
            return value.item()
        except (TypeError, ValueError):
            pass
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def _broadcast_alert_created(alert: AlertEvent) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        "alerts",
        {
            "type": "alert.created",
            "payload": {"id": alert.id, "summary": alert.summary, "status": alert.status},
        },
    )
