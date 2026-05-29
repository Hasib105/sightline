from __future__ import annotations

from collections.abc import Callable, Iterator
from pathlib import Path
from threading import Condition
from time import monotonic

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import analysis_group_name


class _LiveFrameState:
    def __init__(self) -> None:
        self.condition = Condition()
        self.frame: bytes | None = None
        self.version = 0
        self.closed = False


_STREAMS: dict[int, _LiveFrameState] = {}


def _state_for(video_id: int) -> _LiveFrameState:
    if video_id not in _STREAMS:
        _STREAMS[video_id] = _LiveFrameState()
    return _STREAMS[video_id]


def publish_live_frame(video_id: int, frame: bytes, payload: dict | None = None) -> None:
    state = _state_for(video_id)
    with state.condition:
        state.frame = frame
        state.version += 1
        state.closed = False
        state.condition.notify_all()
    channel_layer = get_channel_layer()
    if channel_layer is not None:
        async_to_sync(channel_layer.group_send)(
            analysis_group_name(video_id),
            {
                "type": "analysis.frame",
                "frame": frame,
                "payload": payload or {},
            },
        )


def publish_live_status(video_id: int, payload: dict) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is not None:
        async_to_sync(channel_layer.group_send)(
            analysis_group_name(video_id),
            {
                "type": "analysis.status",
                "payload": payload,
            },
        )


def close_live_stream(video_id: int) -> None:
    state = _state_for(video_id)
    with state.condition:
        state.closed = True
        state.condition.notify_all()


def mjpeg_stream(
    video_id: int,
    fallback_path: str = "",
    fallback_path_provider: Callable[[], str] | None = None,
) -> Iterator[bytes]:
    boundary = b"--frame\r\nContent-Type: image/jpeg\r\nCache-Control: no-store\r\n\r\n"
    last_version = -1
    last_fallback_mtime_ns = -1
    last_keepalive = monotonic()

    while True:
        state = _state_for(video_id)
        with state.condition:
            state.condition.wait_for(
                lambda: state.version != last_version or state.closed,
                timeout=0.2,
            )
            if state.version != last_version and state.frame:
                frame = state.frame
                last_version = state.version
            else:
                frame = None
            closed = state.closed

        if frame is None:
            frame, mtime_ns = _read_fallback_frame_if_changed(
                _current_fallback_path(fallback_path, fallback_path_provider),
                last_fallback_mtime_ns,
            )
            if frame:
                last_fallback_mtime_ns = mtime_ns

        if frame:
            last_keepalive = monotonic()
            yield boundary + frame + b"\r\n"
            if closed:
                break
        elif closed:
            break
        elif monotonic() - last_keepalive >= 5.0:
            last_keepalive = monotonic()
            yield b": keep-alive\r\n\r\n"


def _current_fallback_path(
    fallback_path: str,
    fallback_path_provider: Callable[[], str] | None,
) -> str:
    if fallback_path_provider:
        try:
            return fallback_path_provider() or fallback_path
        except Exception:
            return fallback_path
    return fallback_path


def _read_fallback_frame_if_changed(path_value: str, last_mtime_ns: int) -> tuple[bytes | None, int]:
    if not path_value:
        return None, last_mtime_ns
    try:
        path = Path(path_value)
        if not path.exists() or not path.is_file():
            return None, last_mtime_ns
        stat = path.stat()
        if stat.st_mtime_ns == last_mtime_ns:
            return None, last_mtime_ns
        return path.read_bytes(), stat.st_mtime_ns
    except OSError:
        return None, last_mtime_ns
