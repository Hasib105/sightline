from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np

from .behavior_engine import AlertSignal, StudentRow
from .config import CFG
from .detector import Phone


class EvidenceStore:
    def __init__(self, output_dir: Path | str = CFG.OUTPUT_DIR) -> None:
        self.output_dir = Path(output_dir)
        self.session_dir = self.output_dir / f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.screenshot_dir = self.session_dir / "screenshots"
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)

    def save_alert_frame(
        self,
        frame_rgb: np.ndarray,
        signal: AlertSignal,
        rows: Iterable[StudentRow],
        phones: Iterable[Phone],
    ) -> str:
        annotated = draw_evidence_frame(frame_rgb, rows, phones, highlight=signal)
        filename = (
            f"{_slug(str(signal.student_id))}_"
            f"{_slug(signal.alert_type)}_"
            f"{int(signal.seconds * 1000):08d}.jpg"
        )
        path = self.screenshot_dir / filename
        cv2.imwrite(str(path), cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR))
        return str(path)

    def write_json(self, name: str, data: dict) -> str:
        self.session_dir.mkdir(parents=True, exist_ok=True)
        path = self.session_dir / name
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        return str(path)


def draw_evidence_frame(
    frame_rgb: np.ndarray,
    rows: Iterable[StudentRow],
    phones: Iterable[Phone],
    highlight: AlertSignal | None = None,
) -> np.ndarray:
    image = frame_rgb.copy()
    highlight_id = highlight.student_id if highlight is not None else None

    for row in rows:
        # Paper-sharing detection is disabled for now.
        # active = row.talking or row.sharing or row.phone or row.pose != "Forward"
        active = row.talking or row.phone or row.pose != "Forward"
        color = (34, 197, 94)
        if row.pose != "Forward":
            color = (245, 158, 11)
        if active:
            color = (239, 68, 68)
        if row.id == highlight_id:
            color = (220, 38, 38)

        x1, y1, x2, y2 = row.box
        thickness = 3 if row.id == highlight_id else 2
        cv2.rectangle(image, (x1, y1), (x2, y2), color, thickness)
        tags = []
        if row.phone:
            tags.append("PHONE")
        if row.talking:
            tags.append("TALK")
        # if row.sharing:
        #     tags.append("SHARE")
        label = f"ID {row.id} | {row.pose}"
        if tags:
            label += " | " + ",".join(tags)
        draw_label(image, label, (x1, max(0, y1 - 8)), color)

    for phone in phones:
        x1, y1, x2, y2 = phone.box
        color = (59, 130, 246)
        cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
        draw_label(image, f"PHONE {phone.confidence:.2f}", (x1, max(0, y1 - 8)), color)

    if highlight is not None:
        draw_label(
            image,
            f"{highlight.alert_type.upper()} | Student {highlight.student_id} | {highlight.timestamp}",
            (12, 28),
            (220, 38, 38),
        )

    return image


def draw_label(image: np.ndarray, text: str, origin: tuple[int, int], color: tuple[int, int, int]) -> None:
    x, y = origin
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.55
    thickness = 2
    (width, height), baseline = cv2.getTextSize(text, font, scale, thickness)
    y = max(height + baseline + 4, y)
    cv2.rectangle(image, (x, y - height - baseline - 6), (x + width + 8, y + 4), color, -1)
    cv2.putText(image, text, (x + 4, y - baseline - 2), font, scale, (255, 255, 255), thickness, cv2.LINE_AA)


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "_", value.strip())
    return cleaned.strip("_") or "item"
