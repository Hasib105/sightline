from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any

from .behavior_engine import AlertSignal


class SemanticReport:
    @staticmethod
    def alert_record(signal: AlertSignal, screenshot_path: str) -> dict[str, Any]:
        base = asdict(signal)
        base["screenshot"] = screenshot_path
        base["semantic"] = SemanticReport.explain(signal)
        return base

    @staticmethod
    def explain(signal: AlertSignal) -> dict[str, Any]:
        alert_type = signal.alert_type
        evidence = signal.evidence or {}

        if alert_type == "phone":
            risk = "high"
            signals = ["phone detected near the student's body area"]
            summary = f"Student {signal.student_id} has phone evidence at {signal.timestamp}."
        elif alert_type == "talking":
            risk = "medium"
            mouth = evidence.get("mouth_ratio")
            reason = evidence.get("reason")
            signals = [str(reason or "talking signal persisted")]
            if mouth is not None:
                signals.append(f"mouth-open ratio {mouth}")
            summary = f"Student {signal.student_id} appears to be talking at {signal.timestamp}."
        # Paper-sharing detection is disabled for now.
        # elif alert_type == "paper-sharing":
        #     risk = "medium"
        #     neighbor = signal.neighbor_id or "a nearby student"
        #     reason = evidence.get("share_reason", "wrist/hand extended away from own body")
        #     signals = [
        #         str(reason),
        #         f"movement aimed toward student {neighbor}",
        #     ]
        #     summary = (
        #         f"Student {signal.student_id} shows a possible paper-sharing gesture "
        #         f"toward student {neighbor} at {signal.timestamp}."
        #     )
        else:
            risk = "medium"
            pose = evidence.get("pose", "head turned")
            signals = [f"{pose}", "repeated head yaw left/right"]
            summary = f"Student {signal.student_id} repeatedly looked away at {signal.timestamp}."

        return {
            "risk_level": risk,
            "signals": signals,
            "summary": summary,
            "human_review_recommended": True,
        }

    @staticmethod
    def session_report(
        video_name: str,
        alerts: list[dict[str, Any]],
        model_name: str,
        report_path: str | None = None,
    ) -> dict[str, Any]:
        counts: dict[str, int] = {}
        for alert in alerts:
            counts[alert["alert_type"]] = counts.get(alert["alert_type"], 0) + 1

        report = {
            "video_name": video_name,
            "model": model_name,
            "alert_counts": counts,
            "total_alerts": len(alerts),
            "alerts": alerts,
        }
        if report_path is not None:
            report["report_path"] = str(Path(report_path))
        return report
