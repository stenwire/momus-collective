#!/bin/zsh
# D-095: the API under gunicorn in production mode on :8000, with a
# throwaway Paystack secret so the webhook can be signed locally. The
# frontend production build (`next start`) and a Celery worker must be up.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../backend"
SECRET="loadtest-$(date +%s)"
lsof -ti tcp:8000 -sTCP:LISTEN | xargs kill 2>/dev/null || true
sleep 1
DJANGO_DEBUG=False DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1 \
  PAYSTACK_SECRET_KEY=$SECRET PAYSTACK_PUBLIC_KEY=pk_loadtest \
  .venv/bin/gunicorn config.wsgi -w ${WORKERS:-12} -k ${WORKER_CLASS:-sync} \
  --threads ${THREADS:-1} -b 127.0.0.1:8000 \
  --access-logfile /dev/null --error-logfile "${LOG:-/tmp/gunicorn-loadtest.log}" &
GUNICORN=$!
trap "kill $GUNICORN 2>/dev/null" EXIT
for i in {1..30}; do curl -sf -o /dev/null localhost:8000/api/v1/health/ && break; sleep 1; done
k6 run -e WEBHOOK_SECRET=$SECRET -e RUN=$(date +%s) "$HERE/nfr06.js" "$@"
