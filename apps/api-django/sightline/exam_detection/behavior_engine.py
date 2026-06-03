from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from .config import CFG
from .detector import Person, Phone


@dataclass
class StudentRow:
    id: int | str
    box: tuple[int, int, int, int]
    pose: str
    yaw: float
    mouth_ratio: float | None = None
    mouth_delta: float | None = None
    mouth_source: str | None = None
    nearest_id: int | str | None = None
    nearest_distance: float | None = None
    talk_reason: str | None = None
    talking: bool = False
    phone: bool = False
    look_score: float = 0.0
    talk_score: float = 0.0
    # Paper-sharing detection is disabled for now.
    # share_reason: str | None = None
    # share_target_id: int | str | None = None
    # sharing: bool = False
    # share_score: float = 0.0
    phone_score: float = 0.0


@dataclass
class AlertSignal:
    student_id: int | str
    alert_type: str
    timestamp: str
    seconds: float
    detail: str
    count: int
    confidence_score: float
    neighbor_id: int | str | None = None
    evidence: dict[str, Any] = field(default_factory=dict)


@dataclass
class Evaluation:
    rows: list[StudentRow]
    alerts: list[AlertSignal]
    messages: list[str]


# Paper-sharing detection is disabled for now, but kept here as commented
# reference code so it can be restored without losing the original logic.
#
# @dataclass
# class ShareObservation:
#     observed: bool = False
#     target_id: int | str | None = None
#     target_distance: float | None = None
#     reason: str | None = None
#     evidence: dict[str, Any] = field(default_factory=dict)
#

class BehaviorEngine:
    def __init__(self) -> None:
        self.pose_hist: dict[int | str, list[str]] = defaultdict(list)
        self.mouth_hist: dict[int | str, list[tuple[float, float]]] = defaultdict(list)
        self.look_events = defaultdict(lambda: {"left": [], "right": []})
        self.talk_events: dict[int | str, list[float]] = defaultdict(list)
        # self.share_events: dict[int | str, list[float]] = defaultdict(list)
        self.phone_events: dict[int | str, list[float]] = defaultdict(list)
        self.scores: dict[str, float] = defaultdict(float)
        self.last_alert: dict[str, float] = defaultdict(lambda: -10_000.0)

    def evaluate(
        self,
        persons: list[Person],
        phones: list[Phone],
        face_results: Any | None,
        frame_shape: tuple[int, int, int],
        seconds: float,
    ) -> Evaluation:
        timestamp = time.strftime("%H:%M:%S", time.gmtime(seconds))
        rows: list[StudentRow] = []
        alerts: list[AlertSignal] = []
        messages: list[str] = []

        if not persons:
            return Evaluation(rows=[], alerts=[], messages=["No student detected"])

        face_map = assign_face_landmarks(persons, face_results, frame_shape[0], frame_shape[1])
        nearest_map = {p.id: nearest_student(p, persons) for p in persons}
        mouth_ratios = {idx: self._mouth_ratio(idx, person, face_map, frame_shape) for idx, person in enumerate(persons)}
        active_talkers = dominant_mouth_talkers(persons, mouth_ratios)

        for idx, person in enumerate(persons):
            pose, yaw = estimate_head_pose(
                person.kpts,
                person.box,
                frame_shape[1],
                allow_box_fallback=person.pose_available,
            )
            pose = self._smoothed_pose(person.id, pose)
            nearest, nearest_dist = nearest_map[person.id]
            mouth_ratio = mouth_ratios[idx]
            mouth_source = self._mouth_source(idx, person, face_map)
            mouth_delta = self._mouth_delta(person.id, mouth_ratio, seconds)
            close_neighbor = nearest is not None and is_close_neighbor(person.box, nearest.box, nearest_dist)
            talking_observed = person.id in active_talkers
            talk_reason = "mouth-open" if talking_observed else None
            # share_observation = paper_share_observation(person, persons)
            # sharing_observed = share_observation.observed

            row = StudentRow(
                id=person.id,
                box=person.box,
                pose=pose,
                yaw=yaw,
                mouth_ratio=mouth_ratio,
                mouth_delta=mouth_delta,
                mouth_source=mouth_source,
                nearest_id=nearest.id if nearest is not None else None,
                nearest_distance=round(nearest_dist, 1) if nearest_dist is not None else None,
                talk_reason=talk_reason,
                # share_reason=share_observation.reason,
                # share_target_id=share_observation.target_id,
            )

            self._score(f"{person.id}:look", pose != "Forward", inc=1.0)
            row.look_score = self.scores[f"{person.id}:look"]
            if pose != "Forward":
                direction = "right" if pose == "Looking Right" else "left"
                self.look_events[person.id][direction].append(seconds)
            self.look_events[person.id]["left"] = prune_window(self.look_events[person.id]["left"], seconds)
            self.look_events[person.id]["right"] = prune_window(self.look_events[person.id]["right"], seconds)
            left_c = len(self.look_events[person.id]["left"])
            right_c = len(self.look_events[person.id]["right"])
            look_count = left_c + right_c
            if (
                row.look_score >= CFG.LOOK_SCORE_THRESHOLD
                and look_count >= CFG.LOOK_MIN_EVENTS
                and self._cooldown_ready(person.id, "look-away", seconds)
            ):
                direction = "right" if right_c >= left_c else "left"
                alerts.append(
                    AlertSignal(
                        student_id=person.id,
                        alert_type="look-away",
                        timestamp=timestamp,
                        seconds=round(seconds, 2),
                        detail=f"Head yaw persisted {direction} ({left_c} left, {right_c} right in {int(CFG.WINDOW_SECONDS)}s)",
                        count=look_count,
                        confidence_score=round(row.look_score, 2),
                        evidence={"pose": pose, "yaw": round(yaw, 3)},
                    )
                )

            self._score(f"{person.id}:talk", talking_observed, inc=2.0)
            row.talk_score = self.scores[f"{person.id}:talk"]
            if talking_observed:
                self.talk_events[person.id].append(seconds)
            self.talk_events[person.id] = prune_window(self.talk_events[person.id], seconds)
            talk_count = len(self.talk_events[person.id])
            row.talking = row.talk_score >= CFG.TALK_SCORE_THRESHOLD and talk_count >= CFG.TALK_MIN_EVENTS
            if (
                row.talking
                and self._cooldown_ready(person.id, "talking", seconds)
            ):
                alerts.append(
                    AlertSignal(
                        student_id=person.id,
                        alert_type="talking",
                        timestamp=timestamp,
                        seconds=round(seconds, 2),
                        detail=talking_detail(row.nearest_id, talk_count, talk_reason),
                        count=talk_count,
                        confidence_score=round(row.talk_score, 2),
                        neighbor_id=row.nearest_id,
                        evidence={
                            "mouth_ratio": round(mouth_ratio, 3) if mouth_ratio is not None else None,
                            "mouth_delta": round(mouth_delta, 3) if mouth_delta is not None else None,
                            "mouth_source": mouth_source,
                            "reason": talk_reason,
                            "pose": pose,
                            "nearest_distance": row.nearest_distance,
                        },
                    )
                )

            # self._score(f"{person.id}:share", sharing_observed, inc=1.8)
            # row.share_score = self.scores[f"{person.id}:share"]
            # if sharing_observed:
            #     self.share_events[person.id].append(seconds)
            # self.share_events[person.id] = prune_window(self.share_events[person.id], seconds)
            # share_count = len(self.share_events[person.id])
            # row.sharing = row.share_score >= CFG.SHARE_SCORE_THRESHOLD and share_count >= CFG.SHARE_MIN_EVENTS
            # if (
            #     row.sharing
            #     and self._cooldown_ready(person.id, "paper-sharing", seconds)
            # ):
            #     alerts.append(
            #         AlertSignal(
            #             student_id=person.id,
            #             alert_type="paper-sharing",
            #             timestamp=timestamp,
            #             seconds=round(seconds, 2),
            #             detail=paper_share_detail(share_observation, share_count),
            #             count=share_count,
            #             confidence_score=round(row.share_score, 2),
            #             neighbor_id=share_observation.target_id or row.nearest_id,
            #             evidence={
            #                 "nearest_distance": row.nearest_distance,
            #                 **share_observation.evidence,
            #             },
            #         )
            #     )

            rows.append(row)

        self._assign_phones(phones, rows, seconds, timestamp, alerts)
        if phones:
            messages.append(f"Phone candidates: {len(phones)}")

        return Evaluation(rows=rows, alerts=alerts, messages=messages)

    def _smoothed_pose(self, student_id: int | str, raw_pose: str) -> str:
        hist = self.pose_hist[student_id]
        hist.append(raw_pose)
        if len(hist) > CFG.SMOOTH_N:
            hist.pop(0)
        return max(set(hist), key=hist.count)

    def _mouth_ratio(
        self,
        person_index: int,
        person: Person,
        face_map: dict[int, Any],
        frame_shape: tuple[int, int, int],
    ) -> float | None:
        if person.mouth_ratio is not None:
            return person.mouth_ratio
        if person_index in face_map:
            return get_mouth_open_ratio(face_map[person_index], frame_shape[0], frame_shape[1])
        if CFG.ALLOW_POSE_MOUTH_FALLBACK and person.pose_available:
            return fallback_mouth_ratio_from_pose(person.kpts)
        return None

    def _mouth_delta(self, student_id: int | str, mouth_ratio: float | None, seconds: float) -> float | None:
        if mouth_ratio is None:
            return None
        hist = self.mouth_hist[student_id]
        hist.append((seconds, mouth_ratio))
        cutoff = seconds - CFG.MOUTH_MOTION_WINDOW_SECONDS
        self.mouth_hist[student_id] = [(ts, ratio) for ts, ratio in hist if ts >= cutoff]
        ratios = [ratio for _, ratio in self.mouth_hist[student_id]]
        if len(ratios) < 2:
            return None
        return max(ratios) - min(ratios)

    def _mouth_source(self, person_index: int, person: Person, face_map: dict[int, Any]) -> str | None:
        if person.mouth_ratio is not None:
            return person.mouth_source or "crop"
        if person_index in face_map:
            return "full"
        if CFG.ALLOW_POSE_MOUTH_FALLBACK and person.pose_available:
            return "pose"
        return None

    def _score(self, key: str, observed: bool, inc: float) -> None:
        if observed:
            self.scores[key] = min(CFG.SCORE_MAX, self.scores[key] + inc)
        else:
            self.scores[key] = max(0.0, self.scores[key] - CFG.SCORE_DECAY)

    def _cooldown_ready(self, student_id: int | str, alert_type: str, seconds: float) -> bool:
        key = f"{student_id}:{alert_type}"
        if seconds < self.last_alert[key] + CFG.COOLDOWN_SECONDS:
            return False
        self.last_alert[key] = seconds
        return True

    def _assign_phones(
        self,
        phones: list[Phone],
        rows: list[StudentRow],
        seconds: float,
        timestamp: str,
        alerts: list[AlertSignal],
    ) -> None:
        seen_students: set[int | str] = set()
        for phone in phones:
            row = nearest_row_to_box(phone.box, rows)
            if row is None:
                continue
            row.phone = True
            if row.id in seen_students:
                continue
            seen_students.add(row.id)

            self._score(f"{row.id}:phone", True, inc=4.0)
            row.phone_score = self.scores[f"{row.id}:phone"]
            self.phone_events[row.id].append(seconds)
            self.phone_events[row.id] = prune_window(self.phone_events[row.id], seconds)
            phone_count = len(self.phone_events[row.id])

            if self._cooldown_ready(row.id, "phone", seconds):
                alerts.append(
                    AlertSignal(
                        student_id=row.id,
                        alert_type="phone",
                        timestamp=timestamp,
                        seconds=round(seconds, 2),
                        detail=f"Phone-sized object detected near student {row.id}",
                        count=phone_count,
                        confidence_score=round(row.phone_score, 2),
                        evidence={"phone_count": phone_count},
                    )
                )


def prune_window(events: list[float], now: float) -> list[float]:
    return [event_time for event_time in events if now - event_time <= CFG.WINDOW_SECONDS]


def estimate_head_pose(
    keypoints: np.ndarray | None,
    box: tuple[int, int, int, int],
    image_width: int,
    allow_box_fallback: bool = True,
) -> tuple[str, float]:
    def box_fallback() -> tuple[str, float]:
        x1, _, x2, _ = box
        cx = (x1 + x2) / 2.0
        yaw = (cx - image_width / 2.0) / max(image_width, 1)
        if yaw < -0.20:
            return "Looking Left", yaw
        if yaw > 0.20:
            return "Looking Right", yaw
        return "Forward", yaw

    if keypoints is None or len(keypoints) < 5:
        if not allow_box_fallback:
            return "Forward", 0.0
        return box_fallback()

    def visible(index: int) -> bool:
        return index < len(keypoints) and float(keypoints[index, 2]) >= CFG.KP_CONF

    if visible(0) and (visible(1) or visible(2)):
        nose_x = float(keypoints[0, 0])
        eye_xs = [float(keypoints[i, 0]) for i in (1, 2) if visible(i)]
        eye_center = sum(eye_xs) / len(eye_xs)
        if visible(1) and visible(2):
            eye_span = max(abs(float(keypoints[2, 0]) - float(keypoints[1, 0])), 1.0)
        else:
            x1, _, x2, _ = box
            eye_span = max((x2 - x1) * 0.25, 1.0)
        yaw = (nose_x - eye_center) / eye_span
        if yaw < -CFG.YAW_THRESH:
            return "Looking Left", yaw
        if yaw > CFG.YAW_THRESH:
            return "Looking Right", yaw
        return "Forward", yaw

    if visible(3) and visible(4):
        ear_center = (float(keypoints[3, 0]) + float(keypoints[4, 0])) / 2.0
        ear_span = max(abs(float(keypoints[4, 0]) - float(keypoints[3, 0])), 1.0)
        nose_x = float(keypoints[0, 0]) if visible(0) else ear_center
        yaw = (nose_x - ear_center) / ear_span
        if yaw < -CFG.YAW_THRESH:
            return "Looking Left", yaw
        if yaw > CFG.YAW_THRESH:
            return "Looking Right", yaw
        return "Forward", yaw

    if not allow_box_fallback:
        return "Forward", 0.0
    return box_fallback()


def assign_face_landmarks(
    persons: list[Person],
    face_results: Any | None,
    image_height: int,
    image_width: int,
) -> dict[int, Any]:
    assignment: dict[int, Any] = {}
    if face_results is None or getattr(face_results, "multi_face_landmarks", None) is None:
        return assignment

    faces = list(face_results.multi_face_landmarks)
    if len(persons) == 1 and len(faces) == 1:
        assignment[0] = faces[0]
        return assignment

    used_faces: set[int] = set()
    for person_index, person in enumerate(persons):
        px, py = face_anchor(person)
        best_idx, best_face, best_distance = None, None, float("inf")
        for face_index, face in enumerate(faces):
            if face_index in used_faces:
                continue
            nose = face.landmark[1]
            nx, ny = nose.x * image_width, nose.y * image_height
            if not face_nose_matches_person(person, nx, ny):
                continue
            distance = float(np.hypot(px - nx, py - ny))
            if distance < best_distance:
                best_idx, best_face, best_distance = face_index, face, distance

        max_distance = max(CFG.FACE_ASSIGN_MAX_DIST_PX, box_width(person.box) * 0.50, box_height(person.box) * 0.20)
        if best_face is not None and best_distance <= max_distance:
            assignment[person_index] = best_face
            used_faces.add(best_idx)

    return assignment


def face_anchor(person: Person) -> tuple[float, float]:
    if person.kpts is not None and len(person.kpts) > 0 and float(person.kpts[0, 2]) >= CFG.KP_CONF:
        return float(person.kpts[0, 0]), float(person.kpts[0, 1])
    x1, y1, x2, y2 = person.box
    return (x1 + x2) / 2.0, y1 + (y2 - y1) * 0.22


def face_nose_matches_person(person: Person, nose_x: float, nose_y: float) -> bool:
    x1, y1, x2, y2 = person.box
    box_w = box_width(person.box)
    box_h = box_height(person.box)
    pad_x = box_w * 0.12
    return x1 - pad_x <= nose_x <= x2 + pad_x and y1 <= nose_y <= y1 + box_h * 0.50


def get_mouth_open_ratio(face_landmarks: Any, image_height: int, image_width: int) -> float | None:
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


def talking_detail(nearest_id: int | str | None, count: int, reason: str | None) -> str:
    if nearest_id is None:
        return f"Mouth-open signal persisted with no nearby student assigned ({count} confirmations)"
    return f"Mouth open while facing nearby student {nearest_id} ({count} confirmations)"


def dominant_mouth_talkers(persons: list[Person], mouth_ratios: dict[int, float | None]) -> set[int | str]:
    candidates = [
        (person.id, ratio)
        for idx, person in enumerate(persons)
        if (ratio := mouth_ratios.get(idx)) is not None and ratio >= CFG.MOUTH_OPEN_RATIO
    ]
    if not candidates:
        return set()

    candidates.sort(key=lambda item: item[1], reverse=True)
    return {student_id for student_id, _ in candidates[: CFG.MAX_TALKERS_PER_FRAME]}


# def paper_share_observation(person: Person, persons: list[Person]) -> ShareObservation:
#     keypoints = person.kpts
#     if keypoints is None or len(persons) < 2:
#         return ShareObservation()
#
#     _, y1, _, y2 = person.box
#     body_cx, _ = box_center(person.box)
#     body_w = box_width(person.box)
#     body_h = box_height(person.box)
#     left_shoulder = visible_keypoint(keypoints, 5, CFG.SHARE_KP_CONF)
#     right_shoulder = visible_keypoint(keypoints, 6, CFG.SHARE_KP_CONF)
#     if left_shoulder is None or right_shoulder is None:
#         return ShareObservation()
#
#     torso_left = min(left_shoulder[0], right_shoulder[0])
#     torso_right = max(left_shoulder[0], right_shoulder[0])
#     shoulder_w = max(torso_right - torso_left, body_w * 0.18, 1.0)
#     shoulder_y = (left_shoulder[1] + right_shoulder[1]) / 2.0
#     best: ShareObservation | None = None
#
#     for point_index, label in ((9, "left-wrist"), (10, "right-wrist")):
#         point = visible_keypoint(keypoints, point_index, CFG.SHARE_KP_CONF)
#         if point is None:
#             continue
#
#         px, py = point
#         if py < shoulder_y - body_h * 0.18 or py > y2 + body_h * 0.10:
#             continue
#
#         if px < body_cx:
#             direction = -1
#             extension = (torso_left - px) / shoulder_w
#         else:
#             direction = 1
#             extension = (px - torso_right) / shoulder_w
#         if extension < CFG.WRIST_EXTEND_FRAC:
#             continue
#
#         target = nearest_student_in_direction(person, persons, point, direction)
#         if target is None:
#             continue
#
#         target_distance = point_distance_to_box(point, target.box)
#         target_limit = max(CFG.SHARE_TARGET_MAX_DISTANCE_PX, body_w * 0.40, box_width(target.box) * 0.30)
#         if target_distance > target_limit:
#             continue
#
#         score = extension + max(0.0, target_limit - target_distance) / target_limit
#         observation = ShareObservation(
#             observed=True,
#             target_id=target.id,
#             target_distance=target_distance,
#             reason=f"{label}-extended",
#             evidence={
#                 "share_reason": f"{label}-extended",
#                 "target_distance": round(target_distance, 1),
#                 "hand_extension": round(direction * extension, 3),
#             },
#         )
#         if best is None or score > float(best.evidence.get("score", -1.0)):
#             observation.evidence["score"] = round(score, 3)
#             best = observation
#
#     return best or ShareObservation()
#
#
# def paper_share_detail(observation: ShareObservation, count: int) -> str:
#     target = observation.target_id if observation.target_id is not None else "nearby student"
#     reason = observation.reason or "hand extended"
#     return f"{reason} toward student {target} ({count} confirmations)"
#
#
# def arm_extended_from_torso(
#     keypoints: np.ndarray,
#     point: tuple[float, float],
#     direction: int,
#     box: tuple[int, int, int, int],
# ) -> bool:
#     px, _ = point
#     x1, _, x2, _ = box
#     body_w = box_width(box)
#     left_shoulder = visible_keypoint(keypoints, 5, CFG.GESTURE_KP_CONF)
#     right_shoulder = visible_keypoint(keypoints, 6, CFG.GESTURE_KP_CONF)
#     if left_shoulder is not None and right_shoulder is not None:
#         torso_left = min(left_shoulder[0], right_shoulder[0])
#         torso_right = max(left_shoulder[0], right_shoulder[0])
#         shoulder_w = max(torso_right - torso_left, body_w * 0.20)
#         if direction < 0:
#             return px <= torso_left - shoulder_w * 0.18
#         return px >= torso_right + shoulder_w * 0.18
#
#     if direction < 0:
#         return px <= x1 + body_w * 0.05
#     return px >= x2 - body_w * 0.05
#
#
# def visible_keypoint(keypoints: np.ndarray, index: int, threshold: float) -> tuple[float, float] | None:
#     try:
#         if index < len(keypoints) and float(keypoints[index, 2]) >= threshold:
#             return float(keypoints[index, 0]), float(keypoints[index, 1])
#     except Exception:
#         return None
#     return None
#
#
# def nearest_student_in_direction(
#     person: Person,
#     persons: list[Person],
#     point: tuple[float, float],
#     direction: int,
# ) -> Person | None:
#     body_cx, _ = box_center(person.box)
#     candidates = [
#         other
#         for other in persons
#         if other.id != person.id and direction * (box_center(other.box)[0] - body_cx) > 0
#     ]
#     if not candidates:
#         return None
#     return min(candidates, key=lambda other: point_distance_to_box(point, other.box))
#
#
def fallback_mouth_ratio_from_pose(keypoints: np.ndarray | None) -> float | None:
    if keypoints is None or len(keypoints) < 7:
        return None
    try:
        if min(float(keypoints[i, 2]) for i in (0, 1, 2, 5, 6)) < CFG.KP_CONF:
            return None
        eye_distance = abs(float(keypoints[2, 0]) - float(keypoints[1, 0]))
        shoulder_y = (float(keypoints[5, 1]) + float(keypoints[6, 1])) / 2.0
        nose_y = float(keypoints[0, 1])
        if eye_distance < 5:
            return None
        return float(abs(shoulder_y - nose_y) * 0.05 / eye_distance)
    except Exception:
        return None


def nearest_student(person: Person, persons: list[Person]) -> tuple[Person | None, float | None]:
    my_center = box_center(person.box)
    best_person, best_distance = None, float("inf")
    for other in persons:
        if other.id == person.id:
            continue
        distance = float(np.hypot(my_center[0] - box_center(other.box)[0], my_center[1] - box_center(other.box)[1]))
        if distance < best_distance:
            best_person, best_distance = other, distance
    return best_person, best_distance if best_person is not None else None


def is_close_neighbor(
    my_box: tuple[int, int, int, int],
    neighbor_box: tuple[int, int, int, int],
    distance: float | None,
) -> bool:
    if distance is None:
        return False
    dynamic_limit = max(CFG.NEIGHBOR_MAX_DISTANCE_PX, (box_width(my_box) + box_width(neighbor_box)) * 0.95)
    return distance <= dynamic_limit


def face_toward_neighbor(
    pose: str,
    yaw: float,
    my_box: tuple[int, int, int, int],
    neighbor_box: tuple[int, int, int, int],
) -> bool:
    my_cx, _ = box_center(my_box)
    neighbor_cx, _ = box_center(neighbor_box)
    strong_turn = abs(yaw) >= CFG.FACE_TOWARD_THRESH
    if neighbor_cx > my_cx:
        return pose == "Looking Right" and strong_turn
    return pose == "Looking Left" and strong_turn


# def wrist_toward_neighbor(person: Person, neighbor: Person) -> bool:
#     keypoints = person.kpts
#     if keypoints is None:
#         return False
#
#     x1, y1, x2, y2 = person.box
#     body_cx, _ = box_center(person.box)
#     neighbor_cx, _ = box_center(neighbor.box)
#     direction = 1 if neighbor_cx > body_cx else -1
#     body_w = max(x2 - x1, 1)
#     torso_top = y1 + (y2 - y1) * 0.20
#     torso_bottom = y1 + (y2 - y1) * 0.92
#
#     for wrist_index in (9, 10):
#         if wrist_index >= len(keypoints) or float(keypoints[wrist_index, 2]) < CFG.KP_CONF:
#             continue
#         wrist_x = float(keypoints[wrist_index, 0])
#         wrist_y = float(keypoints[wrist_index, 1])
#         if not (torso_top <= wrist_y <= torso_bottom):
#             continue
#         extension = direction * (wrist_x - body_cx) / body_w
#         if extension < CFG.WRIST_EXTEND_FRAC:
#             continue
#         if point_distance_to_box((wrist_x, wrist_y), neighbor.box) < point_distance_to_box((wrist_x, wrist_y), person.box) + body_w:
#             return True
#     return False
#
#
def nearest_row_to_box(box: tuple[int, int, int, int], rows: list[StudentRow]) -> StudentRow | None:
    if not rows:
        return None
    cx, cy = box_center(box)
    inside_rows = [row for row in rows if point_inside_expanded_box((cx, cy), row.box, scale=0.18)]
    if inside_rows:
        return min(inside_rows, key=lambda row: point_distance_to_box((cx, cy), row.box))

    nearest = min(rows, key=lambda row: point_distance_to_box((cx, cy), row.box))
    distance = point_distance_to_box((cx, cy), nearest.box)
    distance_limit = max(
        CFG.PHONE_ASSIGN_MAX_DISTANCE_PX,
        box_width(nearest.box) * 0.60,
        box_height(nearest.box) * 0.30,
    )
    if distance > distance_limit:
        return None
    return nearest


def point_inside_expanded_box(point: tuple[float, float], box: tuple[int, int, int, int], scale: float) -> bool:
    x1, y1, x2, y2 = box
    pad_x = (x2 - x1) * scale
    pad_y = (y2 - y1) * scale
    return x1 - pad_x <= point[0] <= x2 + pad_x and y1 - pad_y <= point[1] <= y2 + pad_y


def point_distance_to_box(point: tuple[float, float], box: tuple[int, int, int, int]) -> float:
    px, py = point
    x1, y1, x2, y2 = box
    dx = max(x1 - px, 0, px - x2)
    dy = max(y1 - py, 0, py - y2)
    return float(np.hypot(dx, dy))


def box_center(box: tuple[int, int, int, int]) -> tuple[float, float]:
    x1, y1, x2, y2 = box
    return (x1 + x2) / 2.0, (y1 + y2) / 2.0


def box_width(box: tuple[int, int, int, int]) -> float:
    return float(max(1, box[2] - box[0]))


def box_height(box: tuple[int, int, int, int]) -> float:
    return float(max(1, box[3] - box[1]))
