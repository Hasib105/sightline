import logging
from concurrent.futures import Future, ThreadPoolExecutor
from threading import Lock

from celery import shared_task
from django.conf import settings

from .services import generate_due_notifications

logger = logging.getLogger(__name__)
_analysis_executor = ThreadPoolExecutor(
    max_workers=max(1, int(getattr(settings, "SIGHTLINE_ANALYSIS_WORKERS", 1))),
    thread_name_prefix="sightline-yolo",
)
_analysis_futures: dict[int, Future] = {}
_analysis_lock = Lock()


@shared_task
def generate_due_notifications_task():
    return len(generate_due_notifications())


def queue_exam_video_analysis(video_id):
    with _analysis_lock:
        existing = _analysis_futures.get(video_id)
        if existing is not None and not existing.done():
            return {"mode": "realtime-thread", "task_id": None, "future_id": id(existing), "already_running": True}

        future = _analysis_executor.submit(_run_threaded_analysis, video_id)
        _analysis_futures[video_id] = future
    return {"mode": "realtime-thread", "task_id": None, "future_id": id(future)}


def _run_threaded_analysis(video_id):
    try:
        from .video_analysis import analyze_exam_video

        analyze_exam_video(video_id)
    except Exception:
        logger.exception("Threaded exam video analysis failed for video %s", video_id)
    finally:
        with _analysis_lock:
            _analysis_futures.pop(video_id, None)
