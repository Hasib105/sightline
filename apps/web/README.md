# Sightline Web

This is the Next.js web app for Sightline, kept in the monorepo at `apps/web` so the operator interface evolves alongside the Django API.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Shadcn UI

## Local development

1. Copy `.env.example` to `.env.local`.
2. Keep the server running on `http://localhost:8000` unless you change the env values.
3. Start the web app:

```bash
pnpm run dev
```

The app runs on `http://localhost:3000` by default.

## Environment

- `NEXT_PUBLIC_API_BASE_URL`
  Base URL for the Django API and docs.
- `NEXT_PUBLIC_AUTH_BASE_URL`
  Base URL for the server social-auth routes.
- `NEXT_PUBLIC_WEB_BASE_URL`
  Public web base URL used as the post-auth redirect target (default: `http://localhost:3000`).

## Current scope

- A Sightline landing page aligned with the product docs
- Dashboard/admin routes for the operator workspace
- Auth pages for local prototype flows
- API proxying to the Django backend
