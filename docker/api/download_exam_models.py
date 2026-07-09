"""Pre-download YOLO weights into EXAM_AI_MODEL_DIR for offline server analysis."""

from __future__ import annotations

import os
import shutil
from pathlib import Path

from ultralytics import YOLO


def main() -> None:
    model_dir = Path(
        os.environ.get(
            "EXAM_AI_MODEL_DIR",
            "/app/apps/api-django/sightline/exam_detection/models",
        )
    )
    model_size = os.environ.get("EXAM_AI_MODEL_SIZE", "s").strip().lower() or "s"
    model_dir.mkdir(parents=True, exist_ok=True)

    for suffix in ("", "-pose"):
        filename = f"yolov8{model_size}{suffix}.pt"
        destination = model_dir / filename
        if destination.exists() and destination.stat().st_size > 0:
            continue

        model = YOLO(filename)
        source = Path(str(getattr(model, "ckpt_path", "") or filename)).expanduser()
        if source.exists():
            shutil.copy2(source, destination)
            continue

        raise RuntimeError(f"Unable to cache YOLO model at {destination}")


if __name__ == "__main__":
    main()
