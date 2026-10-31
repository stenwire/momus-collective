FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY --chmod=u=rwX,go=rX . .

RUN DJANGO_SECRET_KEY=build DJANGO_DEBUG=False DJANGO_ALLOWED_HOSTS=* \
    DATABASE_URL=sqlite:///x REDIS_URL=redis://x/0 CELERY_TASK_ALWAYS_EAGER=false \
    PAYSTACK_SECRET_KEY= PAYSTACK_PUBLIC_KEY= RESEND_API_KEY= TERMII_API_KEY= \
    CALLMEBOT_API_KEY= GOOGLE_OAUTH_CLIENT_ID= \
    python manage.py collectstatic --noinput \
    && useradd --system --uid 1001 app \
    && mkdir -p /app/private /app/staticfiles \
    && chown -R app /app/private /app/staticfiles
USER app

EXPOSE 8000

CMD ["sh", "-c", "exec gunicorn config.wsgi --worker-class gthread --workers ${WEB_CONCURRENCY:-4} --threads ${WEB_THREADS:-4} --bind 0.0.0.0:${PORT:-8000} --error-logfile -"]
