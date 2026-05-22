# Product Documentation

This folder is the MVP source of truth for Sightline.

Read in order:

1. [Product requirements](./01-product-requirements.md)
2. [Domain workflows and data](./02-domain-workflows-and-data.md)
3. [System architecture](./03-system-architecture.md)
4. [Delivery, validation, and roadmap](./04-delivery-validation-and-roadmap.md)

The MVP is deliberately narrow:

- teacher uploads an exam video
- backend queues analysis
- worker produces suspicious-event alerts with evidence
- invigilator reviews the alerts
- admin manages the simple setup

The only product roles for MVP are `admin`, `teacher`, `student`, and `invigilator`.

No CCTV, RTSP camera, academic-risk analytics, or schedule-reminder module is required for MVP. ProcBot browser monitoring is documented as a later feature, not as the first build target.
