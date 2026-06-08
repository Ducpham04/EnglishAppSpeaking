# Observability

The app uses structured server logs by default and optional Sentry reporting when Sentry environment variables are configured.

## Log Sources

- Vercel runtime logs: request errors, server logs, deployment build logs.
- App logger: JSON lines from `src/lib/logger.ts` with `service`, `level`, `message`, and metadata.
- Sentry: optional error dashboard for production exceptions.

## Sentry Setup

Add these variables in Vercel for Production and Preview:

```bash
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=0.1
```

Notes:

- If `SENTRY_DSN` is empty, server-side Sentry capture is disabled and the app still runs normally.
- If `NEXT_PUBLIC_SENTRY_DSN` is empty, browser-side Sentry capture is disabled.
- `SENTRY_AUTH_TOKEN` is only needed when uploading source maps during build.

## Alerts To Configure

- `/api/chat`: spike in 4xx/5xx, quota errors, or AI provider failures.
- `/api/speech/transcribe`: transcription failures, upload size errors, rate-limit spikes.
- `/api/auth/*`: failed registration/login errors.
- Prisma/database errors: any production occurrence should alert.
- Token usage: abnormal growth per user, class, or teacher.

## Incident Workflow

1. Check Vercel deployment health and recent release notes.
2. Check Sentry issue details and affected route/user role.
3. Reproduce on Preview or local seeded DB when possible.
4. Patch on a feature branch, open PR, wait for CI.
5. Merge through `develop` and then `main` if production release is required.
6. Add the fix and verification result to `CHANGELOG.md`.
