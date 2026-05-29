from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from ultralytics import YOLO

from .config import CFG

try:
    import mediapipe as mp
except Exception:
    mp = None


@dataclass
class Person:
    id: int | str
    box: tuple[int, int, int, int]
    kpts: np.ndarray | None
    confidence: float
    mouth_ratio: float | None = None
    mouth_source: str | None = None
    pose_available: bool = True


@dataclass
class Phone:
    box: tuple[int, int, int, int]
    confidence: float


@dataclass
class DetectionFrame:
    persons: list[Person]
    phones: list[Phone]
    face_results: Any | None
    media_pipe_active: bool


class Detector:
    def __init__(self, model_size: str = "s") -> None:
        self.model_size = CFG._clean_model_size(model_size)
        self.pose_model = None
        self.det_model = None
        self.pose_model = YOLO(CFG.pose_model_name(self.model_size))
        self.det_model = YOLO(CFG.det_model_name(self.model_size))
        self.face_mesh_error: str | None = None
        self.face_mesh = self._build_face_mesh(max_num_faces=12, static_image_mode=False)
        self.crop_face_mesh = self._build_face_mesh(max_num_faces=1, static_image_mode=True)

    @property
    def model_label(self) -> str:
        return CFG.detector_label(self.model_size)

    @property
    def face_mesh_available(self) -> bool:
        return self.face_mesh is not None or self.crop_face_mesh is not None

    def detect(self, rgb_frame: np.ndarray) -> DetectionFrame:
        return self._detect_yolo(rgb_frame)

    def _detect_yolo(self, rgb_frame: np.ndarray) -> DetectionFrame:
        if self.pose_model is None or self.det_model is None:
            raise RuntimeError("YOLO models were not initialized")

        height, width = rgb_frame.shape[:2]
        min_area = height * width * CFG.MIN_AREA_RATIO

        pose_results = self.pose_model.track(
            rgb_frame,
            persist=True,
            tracker="bytetrack.yaml",
            classes=[0],
            conf=CFG.POSE_CONF,
            verbose=False,
        )
        det_results = self.det_model(
            rgb_frame,
            classes=[CFG.PHONE_CLASS_ID],
            conf=CFG.DET_CONF,
            verbose=False,
        )
        persons = self._read_persons(pose_results, min_area)
        self._read_person_mouth_ratios(rgb_frame, persons)

        return DetectionFrame(
            persons=persons,
            phones=self._read_phones(det_results),
            face_results=self._read_faces(rgb_frame),
            media_pipe_active=self.face_mesh_available,
        )

    def _build_face_mesh(self, max_num_faces: int, static_image_mode: bool) -> Any | None:
        if mp is None:
            self.face_mesh_error = "mediapipe import failed"
            return None
        try:
            return mp.solutions.face_mesh.FaceMesh(
                static_image_mode=static_image_mode,
                max_num_faces=max_num_faces,
                refine_landmarks=True,
                min_detection_confidence=0.30 if static_image_mode else 0.45,
                min_tracking_confidence=0.30 if static_image_mode else 0.45,
            )
        except Exception as exc:
            self.face_mesh_error = f"FaceMesh init failed: {exc}"
            return None

    def _read_faces(self, rgb_frame: np.ndarray) -> Any | None:
        if self.face_mesh is None:
            return None
        try:
            return self.face_mesh.process(rgb_frame)
        except Exception:
            return None

    def _read_person_mouth_ratios(self, rgb_frame: np.ndarray, persons: list[Person]) -> None:
        if self.crop_face_mesh is None or not persons:
            return
        for person in persons[: CFG.MAX_MOUTH_CROPS]:
            bounds = _head_crop_bounds(person, rgb_frame.shape)
            if bounds is None:
                continue
            x1, y1, x2, y2 = bounds
            crop = rgb_frame[y1:y2, x1:x2]
            if crop.size == 0:
                continue
            try:
                result = self.crop_face_mesh.process(crop)
            except Exception:
                continue
            faces = getattr(result, "multi_face_landmarks", None)
            if not faces:
                continue
            face = faces[0]
            if not _crop_face_matches_person(face, bounds, person, rgb_frame.shape):
                continue
            ratio = _mouth_open_ratio(face, crop.shape[0], crop.shape[1])
            if ratio is None:
                continue
            person.mouth_ratio = ratio
            person.mouth_source = "crop"

    def _read_persons(self, pose_results: Any, min_area: float) -> list[Person]:
        persons: list[Person] = []
        for result in pose_results:
            if result.boxes is None or len(result.boxes) == 0:
                continue

            for idx, box in enumerate(result.boxes):
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                area = max(0, x2 - x1) * max(0, y2 - y1)
                if area < min_area:
                    continue

                candidate_box = (x1, y1, x2, y2)
                if any(_iou(candidate_box, p.box) > CFG.IOU_DUPLICATE_THRESHOLD for p in persons):
                    continue

                confidence = float(box.conf.item()) if box.conf is not None else 0.0
                persons.append(
                    Person(
                        id=_track_id(box, idx + 1),
                        box=candidate_box,
                        kpts=_extract_keypoints(result, idx),
                        confidence=confidence,
                    )
                )

        return persons

    def _read_phones(self, det_results: Any) -> list[Phone]:
        phones: list[Phone] = []
        for result in det_results:
            if result.boxes is None or len(result.boxes) == 0:
                continue
            for box in result.boxes:
                phones.append(
                    Phone(
                        box=tuple(map(int, box.xyxy[0].tolist())),
                        confidence=float(box.conf.item()) if box.conf is not None else 0.0,
                    )
                )
        return phones


def _track_id(box: Any, fallback_index: int) -> int | str:
    if hasattr(box, "id") and box.id is not None:
        try:
            raw_id = box.id
            if hasattr(raw_id, "item"):
                raw_id = raw_id.item()
            elif hasattr(raw_id, "__len__") and len(raw_id) == 1:
                raw_id = raw_id[0]
            tid = int(float(raw_id))
            if tid > 0:
                return tid
        except Exception:
            pass
    return f"student_{fallback_index}"


def _extract_keypoints(result: Any, idx: int) -> np.ndarray | None:
    if not hasattr(result, "keypoints") or result.keypoints is None:
        return None
    try:
        if hasattr(result.keypoints, "data") and len(result.keypoints.data) > idx:
            return result.keypoints.data[idx].cpu().numpy()
        xy = result.keypoints.xy[idx].cpu().numpy()
        conf = result.keypoints.conf[idx].cpu().numpy()
        return np.column_stack([xy, conf.reshape(-1, 1)])
    except Exception:
        return None


def _head_crop_bounds(person: Person, frame_shape: tuple[int, ...]) -> tuple[int, int, int, int] | None:
    height, width = frame_shape[:2]
    x1, y1, x2, y2 = person.box
    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)
    points = _visible_face_points(person.kpts)

    if points:
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        span = max(max(xs) - min(xs), max(ys) - min(ys), box_w * 0.22, box_h * 0.12, 32.0)
        cx = sum(xs) / len(xs)
        cy = sum(ys) / len(ys) + span * 0.30
        half_w = span * 1.75
        half_h = span * 2.05
        crop = (
            int(cx - half_w),
            int(cy - half_h),
            int(cx + half_w),
            int(cy + half_h),
        )
    else:
        crop = (
            int(x1 - box_w * 0.12),
            int(y1 - box_h * 0.04),
            int(x2 + box_w * 0.12),
            int(y1 + box_h * 0.48),
        )

    cx1, cy1, cx2, cy2 = _clamp_box(crop, width, height)
    if cx2 - cx1 < 32 or cy2 - cy1 < 32:
        return None
    return cx1, cy1, cx2, cy2


def _crop_face_matches_person(
    face_landmarks: Any,
    crop_bounds: tuple[int, int, int, int],
    person: Person,
    frame_shape: tuple[int, ...],
) -> bool:
    height, width = frame_shape[:2]
    x1, y1, x2, y2 = person.box
    crop_x1, crop_y1, crop_x2, crop_y2 = crop_bounds
    crop_w = max(1, crop_x2 - crop_x1)
    crop_h = max(1, crop_y2 - crop_y1)

    try:
        nose = face_landmarks.landmark[1]
    except Exception:
        return False

    nose_x = crop_x1 + nose.x * crop_w
    nose_y = crop_y1 + nose.y * crop_h
    if not (0 <= nose_x <= width and 0 <= nose_y <= height):
        return False

    head_box = _expected_head_box(person, frame_shape)
    if not _point_inside_box((nose_x, nose_y), head_box):
        return False

    points = _visible_face_points(person.kpts)
    if points:
        anchor_x = sum(point[0] for point in points) / len(points)
        anchor_y = sum(point[1] for point in points) / len(points)
    else:
        anchor_x, anchor_y = _box_head_anchor(person.box)

    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)
    max_distance = max(40.0, box_w * 0.30, box_h * 0.12)
    return float(np.hypot(nose_x - anchor_x, nose_y - anchor_y)) <= max_distance


def _expected_head_box(person: Person, frame_shape: tuple[int, ...]) -> tuple[int, int, int, int]:
    height, width = frame_shape[:2]
    x1, y1, x2, y2 = person.box
    box_w = max(1, x2 - x1)
    box_h = max(1, y2 - y1)
    points = _visible_face_points(person.kpts)
    if points:
        xs = [point[0] for point in points]
        ys = [point[1] for point in points]
        pad_x = max(35.0, box_w * 0.28)
        pad_top = max(25.0, box_h * 0.08)
        pad_bottom = max(55.0, box_h * 0.18)
        box = (
            int(min(xs) - pad_x),
            int(min(ys) - pad_top),
            int(max(xs) + pad_x),
            int(max(ys) + pad_bottom),
        )
    else:
        box = (
            int(x1 + box_w * 0.05),
            int(y1),
            int(x2 - box_w * 0.05),
            int(y1 + box_h * 0.42),
        )
    return _clamp_box(box, width, height)


def _box_head_anchor(box: tuple[int, int, int, int]) -> tuple[float, float]:
    x1, y1, x2, y2 = box
    return (x1 + x2) / 2.0, y1 + (y2 - y1) * 0.24


def _point_inside_box(point: tuple[float, float], box: tuple[int, int, int, int]) -> bool:
    x, y = point
    x1, y1, x2, y2 = box
    return x1 <= x <= x2 and y1 <= y <= y2


def _visible_face_points(keypoints: np.ndarray | None) -> list[tuple[float, float]]:
    if keypoints is None:
        return []
    points: list[tuple[float, float]] = []
    for index in (0, 1, 2, 3, 4):
        try:
            if index < len(keypoints) and float(keypoints[index, 2]) >= CFG.GESTURE_KP_CONF:
                points.append((float(keypoints[index, 0]), float(keypoints[index, 1])))
        except Exception:
            continue
    return points


def _clamp_box(box: tuple[int, int, int, int], width: int, height: int) -> tuple[int, int, int, int]:
    x1, y1, x2, y2 = box
    return (
        max(0, min(width - 1, x1)),
        max(0, min(height - 1, y1)),
        max(1, min(width, x2)),
        max(1, min(height, y2)),
    )


def _mouth_open_ratio(face_landmarks: Any, image_height: int, image_width: int) -> float | None:
    try:
        landmarks = face_landmarks.landmark
        upper_lip = landmarks[13]
        lower_lip = landmarks[14]
        left_eye = landmarks[33]
        right_eye = landmarks[263]
        mouth_gap = abs(lower_lip.y - upper_lip.y) * image_height
        eye_distance = abs(right_eye.x - left_eye.x) * image_width
        if eye_distance < 5:
            return None
        return float(mouth_gap / eye_distance)
    except Exception:
        return None


def _iou(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> float:
    x1, y1, x2, y2 = a
    x3, y3, x4, y4 = b
    ix1, iy1 = max(x1, x3), max(y1, y3)
    ix2, iy2 = min(x2, x4), min(y2, y4)
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    area_a = max(0, x2 - x1) * max(0, y2 - y1)
    area_b = max(0, x4 - x3) * max(0, y4 - y3)
    union = area_a + area_b - inter
    return inter / union if union else 0.0
