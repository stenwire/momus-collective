# backend

Django + Django REST Framework, Python 3.12+, Celery + Redis, PostgreSQL.
All DRF routes are mounted under `/api/v1/`.

Initialised by task T-006. The `uv` environment is project-local to this
directory: a bare `uv run` from the repo root resolved to an unrelated
project's virtualenv during scaffolding (blocker B-005, decision D-012), so
every backend command names this directory — `cd backend && uv run ...`.
A pass from a borrowed interpreter measures nothing.
