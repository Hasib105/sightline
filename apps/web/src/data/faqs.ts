export const faqs = [
  {
    q: "What is Sightline?",
    a: "Sightline is an MVP for exam-integrity review. A teacher uploads an exam video, the system analyzes it, and an invigilator reviews evidence-backed alerts.",
  },
  {
    q: "Does Sightline automatically accuse students?",
    a: "No. Sightline is AI-assisted review, not an autonomous judge. It flags observable suspicious behavior and keeps human invigilators responsible for review and action.",
  },
  {
    q: "What does the phase-1 prototype include?",
    a: "The scaffold includes a Django control plane, REST endpoints, Channels support, a Next.js web app, a synthetic video-analysis worker, SQLite defaults, and Redis/PostgreSQL compose files for later deployment.",
  },
  {
    q: "Is live camera monitoring part of MVP?",
    a: "No. The MVP starts with uploaded video analysis. Live CCTV or RTSP monitoring can be added later after the upload-analysis-review flow is stable.",
  },
  {
    q: "What roles exist now?",
    a: "The MVP roles are admin, teacher, student, and invigilator.",
  },
  {
    q: "Where does ProcBot fit?",
    a: "ProcBot is a later browser-monitoring feature. It should start with realtime tab-switch detection, then add face and phone detection after the extension event pipeline works.",
  },
  {
    q: "What stack is this repo using?",
    a: "The backend is Python and Django with Channels and Celery. The web app is Next.js and React. A separate Python inference worker handles computer-vision processing outside the request path.",
  },
  {
    q: "Where are the product requirements?",
    a: "The full product documentation is in docs/product, including requirements, domain workflows, architecture, delivery validation, and roadmap.",
  },
] as const;
