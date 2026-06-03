from __future__ import annotations

import os
from pathlib import Path


class CFG:
    BASE_DIR = Path(__file__).resolve().parent
    OUTPUT_DIR = Path(os.getenv("EXAM_AI_OUTPUT_DIR", BASE_DIR / "outputs"))

    MODEL_DIR = Path(os.getenv("EXAM_AI_MODEL_DIR", BASE_DIR / "models"))
    MODEL_OPTIONS = ("n", "s", "m", "l", "x")
    MODEL_SIZE = os.getenv("EXAM_AI_MODEL_SIZE", "s").lower()
    PHONE_CLASS_ID = 67
    PERSON_CLASS_ID = 0

    ANALYSIS_FPS = float(os.getenv("EXAM_AI_ANALYSIS_FPS", "5.0"))
    REALTIME_TARGET_FPS = float(os.getenv("EXAM_AI_REALTIME_TARGET_FPS", "6.0"))
    MAX_MOUTH_CROPS = 8
    MAX_TALKERS_PER_FRAME = 1

    POSE_CONF = float(os.getenv("EXAM_AI_POSE_CONF", "0.40"))
    DET_CONF = float(os.getenv("EXAM_AI_DET_CONF", "0.35"))
    PERSON_DET_CONF = float(os.getenv("EXAM_AI_PERSON_DET_CONF", "0.25"))
    KP_CONF = 0.25
    GESTURE_KP_CONF = 0.12
    # Paper-sharing detection is disabled for now. Keep these settings here so
    # the feature can be restored without rebuilding the thresholds from memory.
    # SHARE_KP_CONF = 0.28
    MIN_AREA_RATIO = float(os.getenv("EXAM_AI_MIN_AREA_RATIO", "0.0006"))
    IOU_DUPLICATE_THRESHOLD = 0.50
    PERSON_FALLBACK_ENABLED = os.getenv("EXAM_AI_PERSON_FALLBACK_ENABLED", "true").lower() not in {
        "0",
        "false",
        "no",
        "off",
    }
    PERSON_FALLBACK_FILTER_STANDING = os.getenv("EXAM_AI_PERSON_FALLBACK_FILTER_STANDING", "true").lower() not in {
        "0",
        "false",
        "no",
        "off",
    }
    PERSON_MERGE_IOU_THRESHOLD = float(os.getenv("EXAM_AI_PERSON_MERGE_IOU_THRESHOLD", "0.35"))
    SEATED_STUDENTS_ONLY = os.getenv("EXAM_AI_SEATED_STUDENTS_ONLY", "true").lower() not in {
        "0",
        "false",
        "no",
        "off",
    }
    STANDING_BOX_ASPECT_RATIO = float(os.getenv("EXAM_AI_STANDING_BOX_ASPECT_RATIO", "2.45"))
    STANDING_KP_CONF = float(os.getenv("EXAM_AI_STANDING_KP_CONF", "0.20"))
    STANDING_MIN_LEG_KEYPOINTS = int(os.getenv("EXAM_AI_STANDING_MIN_LEG_KEYPOINTS", "3"))
    STANDING_MIN_LOWER_BODY_RATIO = float(os.getenv("EXAM_AI_STANDING_MIN_LOWER_BODY_RATIO", "0.32"))

    YAW_THRESH = 0.30
    FACE_TOWARD_THRESH = 0.25
    SMOOTH_N = 3
    LOOK_SCORE_THRESHOLD = 8.0
    LOOK_MIN_EVENTS = 7

    MOUTH_OPEN_RATIO = 0.05
    MOUTH_MOTION_DELTA = 0.025
    MOUTH_MOTION_WINDOW_SECONDS = 2.0
    TALK_SCORE_THRESHOLD = 5.0
    TALK_MIN_EVENTS = 3
    ALLOW_POSE_MOUTH_FALLBACK = False

    # WRIST_EXTEND_FRAC = 0.45
    # SHARE_SCORE_THRESHOLD = 5.0
    # SHARE_MIN_EVENTS = 3
    # SHARE_TARGET_MAX_DISTANCE_PX = 120
    NEIGHBOR_MAX_DISTANCE_PX = 360
    PHONE_ASSIGN_MAX_DISTANCE_PX = 180

    WINDOW_SECONDS = 45.0
    COOLDOWN_SECONDS = 10.0
    SCORE_DECAY = 0.45
    SCORE_MAX = 12.0

    FACE_ASSIGN_MAX_DIST_PX = 100

    @classmethod
    def pose_model_name(cls, size: str | None = None) -> str:
        model_size = cls._clean_model_size(size)
        configured = os.getenv("EXAM_AI_POSE_MODEL_PATH")
        if configured:
            return configured
        local_model = cls.MODEL_DIR / f"yolov8{model_size}-pose.pt"
        return str(local_model) if local_model.exists() else f"yolov8{model_size}-pose.pt"

    @classmethod
    def det_model_name(cls, size: str | None = None) -> str:
        model_size = cls._clean_model_size(size)
        configured = os.getenv("EXAM_AI_DET_MODEL_PATH")
        if configured:
            return configured
        local_model = cls.MODEL_DIR / f"yolov8{model_size}.pt"
        return str(local_model) if local_model.exists() else f"yolov8{model_size}.pt"

    @classmethod
    def detector_label(cls, size: str | None = None) -> str:
        return f"yolov8{cls._clean_model_size(size)}"

    @classmethod
    def _clean_model_size(cls, size: str | None) -> str:
        model_size = (size or cls.MODEL_SIZE or "s").lower().strip()
        if model_size not in cls.MODEL_OPTIONS:
            return "s"
        return model_size
