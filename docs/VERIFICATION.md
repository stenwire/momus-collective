# Verification Report

**Milestone:** M5 - Admin Pipeline, Notifications and Reviews
**Scope:** Completion audit of all of M5 (T-501..T-523) at `46afe55` on
`m5-admin-pipeline-notifications-and-reviews`, `main` (PR #10) merged in.
Covers the admin panel (board, list, order detail, moderation, analytics,
promo codes, customers, reviews), notifications (admin alert, customer status
updates, moderation outcomes, review prompts, New Drops), WhatsApp and
storage provider interfaces, newsletter, reviews and ratings, logging
redaction, load test and backups. Also covers the cross-cutting checks this
code touches: admin authz on every route, PII, secrets, query counts,
DRY-07, both suites and the scope greps.
**Date:** 2026-10-12
**Blockers:** 0
**Major:** 3
**Minor:** 3
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm --dir frontend build` is not run
by an audit because it writes `.next/`; the T-523 gate run's restart did
build it); BLD-07 and CI-SEC-01..05 (the branch has no pull request yet, and
CI runs on pull requests); EFF-08 (Lighthouse not run).

PASS means there are zero blockers. M5 is **not complete**: DoD 1 and 10 are
open (finding 3), and findings 1 and 2 should be fixed first.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | 5. Spec (FR-ADM-01, FR-ADM-03) | `backend/notifications/templates/notifications/email/admin_new_order.txt:13`, `…/admin_new_order.html:24`, `backend/notifications/admin_alerts.py:45,85`, `backend/orders/admin_views.py:172-179` | Since PR #10 the customer can pay Paystack's fee on top of the order total. The admin email and WhatsApp still label the order total as "Total paid", and the admin order detail's payment section omits `payment_fee` and the amount actually charged. When a fee was passed on, the admin is shown ₦27,500 paid for a ₦28,020.31 charge. | Add the Paystack fee and the amount paid to the admin payload and detail page. Label the order total as "Order total" in the email and WhatsApp, with a fee line and "Total paid" when there was a fee. |
| 2 | major | 6. Build / ops (D-103, D-104, NFR-07) | repository root; no `Procfile`, gunicorn config or container definition (0 found) | Production depends on three processes that live only in tracker prose: gunicorn with gthread workers and its access log off (the PII guarantee in D-103 relies on that), a Celery worker, and Celery beat (daily backups, the review prompts and New Drops need it). Nothing committed defines them, so a deployment can miss beat (no backups, DoD 19) or leave gunicorn's access log on (tracking tokens in logs). | Commit a process definition (`Procfile` or equivalent) for `web` (gunicorn, gthread, access log off), `worker` and `beat`, with a short deployment note naming the required environment variables. |
| 3 | major | 7. Acceptance (API-06) | `docs/MILESTONES.md` M5 DoD 1 and 10; `docs/TODO.md` T-521, T-522 | No live WhatsApp send has been proven, for the admin alert (CallMeBot, B-013) or for customer updates (Termii, B-014). Both providers are tested against their API formats, and customers who prefer WhatsApp get email meanwhile. | Already queued as T-521 (B-013) and T-522 (B-014). No new task. |
| 4 | minor | 3. DRY (DRY-04) | `frontend/src/components/admin/order-list.tsx:10-19`, `frontend/src/components/admin/order-detail.tsx:12-19` | The admin list's status filter and the detail page's status menu restate the statuses and labels in TypeScript. The board gets its columns from the API, and the customer pipeline was moved to the API in T-427. | Serve the status choices (all statuses, and the board's) from the API and render from them. |
| 5 | minor | 3. DRY / layering | `backend/notifications/admin_alerts.py:10`, `backend/newsletter/new_drops.py:14` | Two apps import the money formatter `naira` from `orders.tasks`, a Celery task module, so loading either imports the order tasks. | Move `naira` to a small shared module (e.g. `config/money.py`) and import it from there. |
| 6 | minor | 1. Security (SEC-14) | `backend/notifications/admin_alerts.py:84-105`, `backend/notifications/whatsapp.py` (`AdminBot`) | The admin WhatsApp summary carries the customer's name, phone and street address, as FR-ADM-01 asks. While the free CallMeBot relay is the provider (D-093), that PII passes through a third-party service with no data agreement. The PRD allows a bot for admin alerts, so this is in scope. | While on the bot, send only the order number, total, item count and admin link (the email has the rest). Keep the full summary for Termii. |

## Commands run

```
$ git rev-parse --short HEAD && git branch --show-current
46afe55
m5-admin-pipeline-notifications-and-reviews

$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ uv run pytest -q
678 passed, 5 warnings in 85.75s (0:01:25)
$ uv run pytest -q -k webhook
18 passed, 660 deselected, 1 warning in 1.78s
$ uv run pytest -q -k authz
70 passed, 608 deselected, 1 warning in 7.73s
$ uv run pytest -q -k num_queries
11 passed, 667 deselected, 1 warning in 5.82s
$ uv run ruff check . && uv run ruff format --check .
All checks passed!
206 files already formatted
$ uv run python manage.py check && uv run python manage.py makemigrations --check --dry-run
System check identified no issues (0 silenced).
No changes detected
$ uv run ruff check --select S notifications reviews newsletter backups accounts/admin_customers.py orders/admin_views.py orders/moderation.py orders/status.py orders/analytics.py promocodes/admin_views.py config/storage.py config/logging.py --exclude '**/tests/**' --output-format concise
All checks passed!

$ pnpm --dir frontend test
 Test Files  49 passed (49)
      Tests  249 passed (249)
$ pnpm --dir frontend typecheck
✓ Types generated successfully
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
(exit 0)

$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md' | rg -v "/tests/"
(no output, exit 1: only test fixtures match)
$ rg -n 'env\("(PAYSTACK_…|RESEND_API_KEY|DATABASE_URL|REDIS_URL|TERMII_API_KEY|CALLMEBOT_API_KEY|S3_ACCESS_KEY_ID|S3_SECRET_ACCESS_KEY)"' backend/config/settings.py
84:REDIS_URL = env("REDIS_URL")
195:    S3_ACCESS_KEY_ID = env("S3_ACCESS_KEY_ID")
196:    S3_SECRET_ACCESS_KEY = env("S3_SECRET_ACCESS_KEY")
224:PAYSTACK_SECRET_KEY = env("PAYSTACK_SECRET_KEY")
225:PAYSTACK_PUBLIC_KEY = env("PAYSTACK_PUBLIC_KEY")
230:TERMII_API_KEY = env("TERMII_API_KEY")
233:CALLMEBOT_API_KEY = env("CALLMEBOT_API_KEY")
242:RESEND_API_KEY = env("RESEND_API_KEY")
(DATABASE_URL is read by env.db("DATABASE_URL"), also with no default)
$ grep -n "TERMII_API_KEY\|CALLMEBOT_API_KEY\|RESEND_API_KEY" .github/workflows/ci.yml
57:      RESEND_API_KEY: ""
58:      TERMII_API_KEY: ""
59:      CALLMEBOT_API_KEY: ""
167:      RESEND_API_KEY: ""
168:      TERMII_API_KEY: ""
169:      CALLMEBOT_API_KEY: ""
$ git log -p main..HEAD | rg -c "sk_(test|live)_[0-9a-f]{40}|re_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}"
(no output, exit 1)

PRO-01..08 (and Mailchimp/Brevo, FR-NOT-04's Phase 2 note), each with
--glob '!*.md', vendor and lock files excluded; match counts:
printful|printify|afrprint|jaraprint: 0
tenant|tenant_id|storefront_builder: 0
exchange_rate|USD|EUR|GBP: 1 -> backend/orders/tests/test_payment.py:138 (a test that a USD payment is refused)
layers|freeDrag|free_drag|backPlacement|back_placement|imageUpload: 0
inventory|stock_count|stock_level|reorder_point: 0
abandoned_cart|abandonedCart|cart_reminder: 0
referral_code|affiliate|subscription_plan|billing_cycle|recurring_charge: 0
instagram_shop|tiktok_shop|i18n|gettext|ab_test|experiment_variant: 0
mailchimp|brevo|sendinblue: 0

DRY-07 scan (consecutive #/// comment lines, /* */ blocks, Python
docstrings) over every .py/.ts/.tsx/.yml/.js/.sh file changed against main,
migrations excluded:
files scanned: 139
DRY-07 violations: 0

$ ls Procfile backend/Procfile backend/gunicorn.conf.py Dockerfile backend/Dockerfile render.yaml railway.json
process-config files found: 0
```

The first attempt at the `USD` grep and the DRY-07 scan ran in one command
whose unscoped `rg` walked the whole working directory and hung. It was
stopped and rerun scoped to `backend frontend/src`; the results above are
from the reruns.

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass, 1 minor | SEC-04/05: `tests/test_admin_routes_authz.py` discovers all 28 staff routes, checks each declares `IsStaffUser`, and checks 401/403 on five methods (part of the 70 `-k authz` tests). SEC-11: every new secret (`TERMII_API_KEY`, `CALLMEBOT_API_KEY`, S3 keys) has no default; CI sets them empty. SEC-13: revise, refund and review-by-token all use the 256-bit tracking token, throttled. SEC-14: `config/logging.py` redacts tokens, emails and phones on every handler (T-517); public endpoints return no PII (reviews show first name and initial, as FR-REV-01 asks); finding 6. SEC-15: print files are staff-only, thumbnails token-gated, S3 objects private. SEC-10: review text 500, design text revalidated on revision, HTML emails autoescaped. |
| 2. Efficiency | pass | Board, list, order detail, moderation queue, customers, reviews, promo codes, wishlist and analytics all have constant-query tests (`-k num_queries` 11, plus per-file query tests). EFF-07: emails, WhatsApp, renders, review prompts, New Drops and backups all run in Celery. NFR-06 proven locally in T-518 (1,000 users, p95 17 ms, 481 orders, 0 failures). EFF-08 not verified. |
| 3. DRY and layering | pass, 2 minor | One status-change service (`orders/status.py`), one moderation module, one storage factory, one WhatsApp factory, one `send_once`. DRY-07 0 violations. Findings 4 and 5. |
| 4. Tests | pass | Backend 678, frontend 249. TST-04: every staff route. Every M5 task logs a known-failure check. |
| 5. Spec conformance | pass, 1 major | FR-ADM-02/03/07/08/09/10, FR-NOT-02/03/04, FR-REV-01..05, NFR-04/06/07 present and proven live per task. SPC-07 statuses unchanged, SPC-08 moderation before fulfilment, SPC-09/10 reviews. Finding 1. |
| 6. Build and types | pass (partial), 1 major | Typecheck, lint, ruff, checks and migrations clean (the `orders 0010` merge migration joins `main`'s 0008). Finding 2. BLD-01, BLD-07 and CI-SEC not verified (header). |
| 7. Client contract and acceptance | pass, 1 major | All new routes under `/api/v1/`; changes additive (session `is_staff`, tracking `pipeline` and `design_review`, product `review_count`). Finding 3 (API-06). |
