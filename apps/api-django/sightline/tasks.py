import logging
import sys
from concurrent.futures import Future, ThreadPoolExecutor
from threading import Lock
from urllib.parse import urlparse

from celery import shared_task
from django.conf import settings

from .services import generate_due_notifications

logger = logging.getLogger(__name__)
_analysis_executor = ThreadPoolExecutor(
    max_workers=max(1, int(getattr(settings, "SIGHTLINE_ANALYSIS_WORKERS", 1))),
    thread_name_prefix="sightline-yolo",
)
_course_index_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="sightline-course-index")
_analysis_futures: dict[int, Future] = {}
_analysis_lock = Lock()
_warmup_lock = Lock()
_warmup_done = False


@shared_task
def generate_due_notifications_task():
    return len(generate_due_notifications())


@shared_task
def index_course_material_task(material_id):
    from .course_rag import index_material
    from .models import CourseMaterial

    material = CourseMaterial.objects.filter(id=material_id).first()
    return index_material(material) if material else 0


@shared_task
def analyze_exam_video_task(video_id):
    from .video_analysis import analyze_exam_video

    warmup_exam_detection_models()
    return analyze_exam_video(video_id)


def queue_course_material_index(material_id):
    try:
        result = index_course_material_task.delay(material_id)
        return {"mode": "celery", "task_id": result.id}
    except Exception:
        logger.exception("Celery course material indexing queue failed; using a background thread.")
        future = _course_index_executor.submit(index_course_material_task.run, material_id)
        return {"mode": "realtime-thread", "task_id": None, "future_id": id(future)}


def _celery_broker_reachable() -> bool:
    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        return True
    use_celery = getattr(settings, "SIGHTLINE_ANALYSIS_USE_CELERY", None)
    if use_celery is False:
        return False
    if use_celery is True:
        return True

    broker_url = getattr(settings, "CELERY_BROKER_URL", "") or ""
    if not broker_url.startswith("redis://"):
        return False
    try:
        import redis

        parsed = urlparse(broker_url)
        db_path = (parsed.path or "/0").lstrip("/") or "0"
        client = redis.Redis(
            host=parsed.hostname or "localhost",
            port=parsed.port or 6379,
            db=int(db_path),
            socket_connect_timeout=0.25,
            socket_timeout=0.25,
        )
        return bool(client.ping())
    except Exception:
        return False


def warmup_exam_detection_models() -> bool:
    global _warmup_done
    if not getattr(settings, "SIGHTLINE_EXAM_DETECTION_WARMUP", True):
        logger.info("Exam detection warmup disabled (SIGHTLINE_EXAM_DETECTION_WARMUP=0).")
        return False
    with _warmup_lock:
        if _warmup_done:
            return True
        try:
            from .exam_detection.processor import warmup_detector

            warmup_detector()
            _warmup_done = True
            logger.info("Exam detection models warmed up.")
            return True
        except Exception as exc:
            logger.warning("Exam detection model warmup skipped: %s", exc)
            return False


def queue_exam_video_analysis(video_id):
    if not _celery_broker_reachable():
        return _queue_threaded_analysis(video_id)

    try:
        result = analyze_exam_video_task.delay(video_id)
        return {"mode": "celery", "task_id": result.id}
    except Exception:
        if not getattr(settings, "SIGHTLINE_ANALYSIS_THREAD_FALLBACK", True):
            raise
        logger.exception("Celery exam video analysis queue failed; using a background thread.")
        return _queue_threaded_analysis(video_id)


def _queue_threaded_analysis(video_id):
    with _analysis_lock:
        existing = _analysis_futures.get(video_id)
        if existing is not None and not existing.done():
            return {"mode": "realtime-thread", "task_id": None, "future_id": id(existing), "already_running": True}

        future = _analysis_executor.submit(_run_threaded_analysis, video_id)
        _analysis_futures[video_id] = future
    return {"mode": "realtime-thread", "task_id": None, "future_id": id(future)}


def _run_threaded_analysis(video_id):
    try:
        warmup_exam_detection_models()
        from .video_analysis import analyze_exam_video

        analyze_exam_video(video_id)
    except Exception:
        logger.exception("Threaded exam video analysis failed for video %s", video_id)
    finally:
        with _analysis_lock:
            _analysis_futures.pop(video_id, None)


def schedule_startup_warmup() -> None:
    if not getattr(settings, "SIGHTLINE_EXAM_DETECTION_WARMUP", True):
        return
    if any(command in sys.argv for command in ("migrate", "makemigrations", "test", "collectstatic", "shell")):
        return
    _analysis_executor.submit(warmup_exam_detection_models)
