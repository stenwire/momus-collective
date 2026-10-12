# backend

Django + Django REST Framework, Python 3.12+, Celery + Redis, PostgreSQL.
All DRF routes are mounted under `/api/v1/`.

Initialised by task T-006. The `uv` environment is project-local to this
directory: a bare `uv run` from the repo root resolved to an unrelated
project's virtualenv during scaffolding (blocker B-005, decision D-012), so
every backend command names this directory — `cd backend && uv run ...`.
A pass from a borrowed interpreter measures nothing.

## Deployment

`Procfile` defines the processes. All four must run:

| Process | What it does |
|---|---|
| `release` | Applies migrations before a new version starts. |
| `web` | gunicorn, gthread workers (D-104: 8 workers x 4 threads at the load-tested size; tune with `WEB_CONCURRENCY` and `WEB_THREADS`). Its access log stays off: it would write tracking tokens to the logs, and Django's redacted request lines cover requests (D-103). |
| `worker` | Celery: emails, WhatsApp, print files, settling Paystack webhooks. |
| `beat` | Celery beat, exactly one: daily database backup, weekly asset backup, hourly review prompts, Friday New Drops. Without it there are no backups. |

Required environment variables (read with no default; an empty value is
allowed where noted):

- `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_DEBUG` (False)
- `DATABASE_URL`, `REDIS_URL`
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- `RESEND_API_KEY` (empty prints mail to the console)
- `TERMII_API_KEY`, `CALLMEBOT_API_KEY` (empty sends no WhatsApp)
- `GOOGLE_OAUTH_CLIENT_ID`

Also set `FRONTEND_URL`, `BACKEND_URL` and `DEFAULT_FROM_EMAIL` to the public
addresses. Use `FILE_STORAGE_PROVIDER=s3` and `BACKUP_STORAGE_PROVIDER=s3`
with the `S3_*` variables (see `.env.example`), since most hosts wipe local
disk on redeploy. In the Paystack dashboard, point the webhook at
`https://<api-host>/api/v1/payments/paystack/webhook/`.
