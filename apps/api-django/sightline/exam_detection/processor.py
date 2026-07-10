from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import cv2

from .behavior_engine import BehaviorEngine
from .config import CFG
from .detector import Detector
from .evidence import EvidenceStore, draw_evidence_frame
from .semantic_report import SemanticReport


@dataclass
class ProcessResult:
    alerts: list[dict[str, Any]]
    report_path: str
    session_dir: str
    annotated_video_path: str
    latest_preview_path: str
    frames_analyzed: int
    total_frames: int
    duration_seconds: float
    model_name: str


@dataclass
class ProcessProgress:
    latest_preview_path: str
    latest_preview_bytes: bytes
    current_frame: int
    total_frames: int
    frames_analyzed: int
    duration_seconds: float
    alert_count: int
    model_name: str


_DETECTORS: dict[str, Detector] = {}


def load_detector(model_size: str | None = None) -> Detector:
    size = CFG._clean_model_size(model_size)
    if size not in _DETECTORS:
        _DETECTORS[size] = Detector(model_size=size)
    return _DETECTORS[size]


def warmup_detector(model_size: str | None = None) -> str:
    """Load YOLO/MediaPipe models and run one tiny inference so the first real frame is fast."""
    import numpy as np

    detector = load_detector(model_size)
    try:
        rgb = np.zeros((96, 96, 3), dtype=np.uint8)
        detector.detect(rgb)
    except Exception:
        pass
    return detector.model_label


def process_video(
    video_path: str | Path,
    video_name: str,
    output_dir: str | Path,
    model_size: str | None = None,
    progress_callback: Callable[[ProcessProgress], None] | None = None,
) -> ProcessResult:
    detector = load_detector(model_size)
    engine = BehaviorEngine()
    evidence = EvidenceStore(output_dir)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video for analysis: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frame_interval = max(1, round(fps / max(CFG.ANALYSIS_FPS, 0.1)))
    annotated_video_path = evidence.session_dir / "annotated_analysis.mp4"
    latest_preview_path = evidence.session_dir / "latest_analysis_frame.jpg"
    annotated_writer = None

    alerts: list[dict[str, Any]] = []
    frame_index = 0
    analyzed = 0
    duration = 0.0

    try:
        while cap.isOpened():
            ok, frame_bgr = cap.read()
            if not ok:
                break

            duration = frame_index / fps
            if frame_index % frame_interval == 0:
                analyzed += 1
                rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                detection = detector.detect(rgb)
                evaluation = engine.evaluate(
                    persons=detection.persons,
                    phones=detection.phones,
                    face_results=detection.face_results,
                    frame_shape=rgb.shape,
                    seconds=duration,
                )
                annotated = draw_evidence_frame(rgb, evaluation.rows, detection.phones)
                ok, encoded_preview = cv2.imencode(
                    ".jpg",
                    cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR),
                    [int(cv2.IMWRITE_JPEG_QUALITY), 82],
                )
                preview_bytes = encoded_preview.tobytes() if ok else b""
                cv2.imwrite(
                    str(latest_preview_path),
                    cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR),
                    [int(cv2.IMWRITE_JPEG_QUALITY), 82],
                )
                if annotated_writer is None:
                    height, width = annotated.shape[:2]
                    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                    annotated_writer = cv2.VideoWriter(
                        str(annotated_video_path),
                        fourcc,
                        max(CFG.ANALYSIS_FPS, 0.1),
                        (width, height),
                    )
                annotated_writer.write(cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR))

                for signal in evaluation.alerts:
                    screenshot = evidence.save_alert_frame(rgb, signal, evaluation.rows, detection.phones)
                    alerts.append(SemanticReport.alert_record(signal, screenshot))

                if progress_callback is not None:
                    progress_callback(
                        ProcessProgress(
                            latest_preview_path=str(latest_preview_path),
                            latest_preview_bytes=preview_bytes,
                            current_frame=frame_index + 1,
                            total_frames=total_frames,
                            frames_analyzed=analyzed,
                            duration_seconds=duration,
                            alert_count=len(alerts),
                            model_name=detector.model_label,
                        )
                    )

            frame_index += 1
    finally:
        cap.release()
        if annotated_writer is not None:
            annotated_writer.release()

    annotated_video_result = str(annotated_video_path) if annotated_video_path.exists() else ""
    report_data = SemanticReport.session_report(video_name, alerts, detector.model_label)
    report_path = evidence.write_json("session_report.json", report_data)
    report_data["report_path"] = report_path
    report_data["annotated_video_path"] = annotated_video_result
    evidence.write_json("session_report.json", report_data)

    return ProcessResult(
        alerts=alerts,
        report_path=report_path,
        session_dir=str(evidence.session_dir),
        annotated_video_path=annotated_video_result,
        latest_preview_path=str(latest_preview_path) if latest_preview_path.exists() else "",
        frames_analyzed=analyzed,
        total_frames=total_frames,
        duration_seconds=duration,
        model_name=detector.model_label,
    )
