from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from time import monotonic

import cv2

from .behavior_engine import Evaluation
from .config import CFG
from .detector import DetectionFrame
from .processor import load_detector


FrameCallback = Callable[[DetectionFrame, Evaluation, float], None]


@dataclass
class StreamStats:
    frames_read: int = 0
    frames_analyzed: int = 0
    alerts_emitted: int = 0
    elapsed_seconds: float = 0.0


class RealTimeYoloProcessor:
    """Low-latency YOLO loop for webcam, RTSP, or file-like video streams."""

    def __init__(
        self,
        source: int | str | Path = 0,
        *,
        model_size: str | None = None,
        target_fps: float | None = None,
        on_frame: FrameCallback | None = None,
    ) -> None:
        self.source = _normalize_source(source)
        self.detector = load_detector(model_size)
        self.target_fps = max(target_fps or CFG.REALTIME_TARGET_FPS, 0.1)
        self.on_frame = on_frame
        self._stop_requested = False

    def stop(self) -> None:
        self._stop_requested = True

    def run(self, *, max_frames: int | None = None) -> StreamStats:
        from .behavior_engine import BehaviorEngine

        engine = BehaviorEngine()
        capture = cv2.VideoCapture(self.source)
        if not capture.isOpened():
            raise RuntimeError(f"Could not open video stream: {self.source}")

        stats = StreamStats()
        start = monotonic()
        last_analysis_at = 0.0
        min_interval = 1.0 / self.target_fps

        try:
            while not self._stop_requested:
                ok, frame_bgr = capture.read()
                if not ok:
                    break

                stats.frames_read += 1
                now = monotonic()
                if now - last_analysis_at < min_interval:
                    continue

                seconds = now - start
                rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                detection = self.detector.detect(rgb)
                evaluation = engine.evaluate(
                    persons=detection.persons,
                    phones=detection.phones,
                    face_results=detection.face_results,
                    frame_shape=rgb.shape,
                    seconds=seconds,
                )

                stats.frames_analyzed += 1
                stats.alerts_emitted += len(evaluation.alerts)
                last_analysis_at = now

                if self.on_frame is not None:
                    self.on_frame(detection, evaluation, seconds)

                if max_frames is not None and stats.frames_analyzed >= max_frames:
                    break
        finally:
            capture.release()
            stats.elapsed_seconds = monotonic() - start

        return stats


def _normalize_source(source: int | str | Path) -> int | str:
    if isinstance(source, int):
        return source
    source_text = str(source)
    if source_text.isdigit():
        return int(source_text)
    return source_text
