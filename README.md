# Sightline

Sightline is an MVP for exam-integrity review and academic risk support.

The first build is intentionally small: admin setup, teacher course/exam workflows, student enrollment/exam submission, invigilator uploaded-video review, and teacher at-risk student identification.

## MVP Roles

- Admin manages everything through Django admin and admin APIs.
- Teacher creates courses, creates exams, uploads course material if needed, and identifies academically at-risk students before the semester ends.
- Invigilator uploads exam videos and monitors/reviews and alerts exam evidence.
- Student enrolls in courses and gives/submits exams.

## MVP Scope

### In scope now

- password login
- four roles: `admin`, `teacher`, `student`, `invigilator`
- Django admin and admin APIs for platform management
- teacher course and exam creation
- optional course-material upload
- student course enrollment
- student exam attempt/submission
- uploaded exam-video analysis
- suspicious-event alerts with timestamps, confidence, and evidence references
- invigilator review actions: confirm, dismiss, or follow up
- teacher at-risk student view before semester end

### Out of scope for first build

- live CCTV or RTSP camera monitoring
- automated cheating verdicts
- disciplinary automation
- full LMS/SIS integrations
- full custom admin frontend
- mobile app

## Additional Requirement: ProcBot

ProcBot is the browser-monitoring pipeline for BLC quizzes.

```mermaid
flowchart TD
  A[Student Opens BLC Quiz] --> B[ProcBot Extension Activates]
  B --> C[Tab Visibility API]
  B --> D[Webcam MediaPipe @ 1fps]
  B --> E[Event Logger]
  C --> F[Anomaly Classified: TabSwitch / FaceGone / MultiPerson / Phone]
  D --> F
  E --> F
  F --> G[WebSocket Event -> FastAPI]
  G --> H[Dashboard Alert with Evidence Screenshot]
```

| Detection | Method | Cost | Cadence |
| --- | --- | --- | --- |
| TabSwitch | Browser API | Extremely low | Realtime |
| FaceGone | MediaPipe BlazeFace Short-Range FP16 | Low | Every 1 sec |
| MultiPerson | MediaPipe BlazeFace Short-Range FP16 | Low | Every 1 sec |
| Phone | MediaPipe EfficientDet-Lite0 INT8 | Low | Every 1 sec |

Cadence:

- Realtime: tab switch only.
- Every 1 sec: face detection and multi-person detection.
- Every 1 sec: phone detection.

## Architecture

```mermaid
flowchart LR
  WEB[Next.js Web App] --> API[Django API]
  WEB --> ADMIN[Django Admin]
  API --> DB[(SQLite or PostgreSQL)]
  API --> CEL[Celery Worker]
  CEL --> INF[Video Analysis Worker]
  INF --> OBJ[(Evidence Files)]
  PB[ProcBot Extension] --> FAST[FastAPI / WebSocket Gateway]
  FAST --> API
  FAST --> WEB
```

For local development, SQLite is enough. PostgreSQL, Redis, object storage, and a FastAPI/WebSocket gateway remain deployment options.

## Repository Layout

```text
.
├── apps/
│   ├── api-django/        # Django API, domain models, seed data
│   ├── web/               # Next.js web workspace
│   └── worker-inference/  # Video-analysis worker scaffold
├── docs/
│   └── product/           # Simplified MVP docs
├── infra/                 # Local infrastructure
├── packages/              # Shared packages, if needed later
└── scripts/               # Repo maintenance scripts
```

## Running Locally

Use this path when you want to run the API and web app directly on your machine.

Prerequisites:

- Python 3.12
- Node.js 22
- pnpm

Install `pnpm` if you do not already have it:

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
```

Create your local env file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

The default `.env.example` is ready for normal local development. It uses SQLite unless you uncomment `DATABASE_URL`.

Install dependencies:

```bash
pnpm install
pnpm run api:install
```

Create the local database and seed demo users:

```bash
pnpm run api:migrate
pnpm run api:seed
```

Start both apps:

```bash
pnpm run dev
```

Always run the API through `pnpm run api:dev`, `pnpm run api:runserver`, or `uv run` so Python dependencies resolve from the project virtualenv (`.venv`). Do not start Django with system Python (`python manage.py runserver`) — ML dependencies such as `matplotlib` and `ultralytics` may fail or destabilize the API.

Open:

- Web app: `http://localhost:3000`
- API: `http://127.0.0.1:8000/api/`
- Django admin: `http://127.0.0.1:8000/admin/`

Demo users all use password `sightline`:

- `admin`
- `teacher`
- `invigilator`
- `student`

Useful local commands:

```bash
pnpm run api:dev
pnpm run api:runserver
pnpm run api:migrate
pnpm run api:seed
pnpm run web:lint
pnpm run web:build
```

To disable exam-detection model warmup on startup (for example when ML deps are unavailable), set `SIGHTLINE_EXAM_DETECTION_WARMUP=0` in `.env`.

## Running With Docker

Use this path when you want Docker to run the whole stack for you: Next.js web, Django API, Celery worker, PostgreSQL, Redis, and nginx.

Prerequisites:

- Docker Desktop, or Docker Engine with Docker Compose
- pnpm, only for the helper scripts

Create a local env file if you do not already have one:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Build and start the stack:

```bash
pnpm run docker:up
```

The first Docker build can take a while because it installs Python, Node, and AI/video-analysis dependencies.

Open:

- Main app through nginx: `http://localhost`
- Web app directly: `http://localhost:3000`
- API directly: `http://localhost:8000/api/`
- Django admin directly: `http://localhost:8000/admin/`

Seed demo users after the API container is running:

```bash
pnpm run docker:seed
```

Stop the stack:

```bash
pnpm run docker:down
```

Reset Docker data completely, including PostgreSQL data and uploaded media:

```bash
docker compose down -v
```

View container logs:

```bash
docker compose logs -f
```

## Production CI/CD

The production flow mirrors the reference deployment pattern:

- `.github/workflows/ci.yml` runs Django checks/tests, web lint/build, and Docker image builds.
- `.github/workflows/deploy-production.yml` reuses CI, builds and pushes API/web images to GHCR, then deploys them over SSH with Docker Compose.
- `compose.prod.yml` is the production compose shape for server use or local validation.
- `.env.production.example` lists the GitHub Actions secrets needed by the deploy workflow.

Required server dependencies:

- Docker
- Docker Compose v2, or legacy `docker-compose`

Configure the secrets from `.env.production.example` in GitHub, then push to `main` or run `Deploy Production` manually from GitHub Actions. The deploy job creates `/opt/sightline`, writes `.env`, `docker-compose.yml`, and nginx config there, pulls the latest GHCR images, starts the stack, waits for nginx health, and prunes old Docker resources.

By default, production nginx binds to host port `3322` to avoid conflicts with any existing web server on ports `80` or `443`. Put a reverse proxy such as Caddy, nginx, or Cloudflare Tunnel in front of `http://127.0.0.1:3322` for `https://memofi.tech`.

To validate the production compose file locally, provide the required image/database variables and run:

```bash
pnpm run docker:prod:config
```

## Current Implementation Notes

The codebase still contains some prototype tables and endpoints from an earlier larger platform. Treat the docs in `docs/product` as the source of truth for the current MVP.
