# Sightline Video Analysis Worker

This worker is an MVP skeleton for uploaded exam-video analysis. It deliberately emits reviewable alert events rather than disciplinary outcomes.

For local development it can create synthetic alert payloads against the Django API:

```bash
python worker.py --api-url http://127.0.0.1:8000/api --interval 30
```

Production behavior should replace the synthetic loop with uploaded-video ingestion, behavior thresholds, evidence extraction, and idempotent alert creation.

Live CCTV/RTSP monitoring is not required for the MVP. ProcBot browser monitoring is a later feature and should use the same reviewable alert pattern when it is added.
