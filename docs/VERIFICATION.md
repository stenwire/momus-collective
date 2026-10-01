# Verification Report

**Milestone:** M1 - Data Models and Auth
**Scope:** All 16 M1 tasks (T-101..T-116): the 14 PRD data models, JWT login
with Remember Me, Google OAuth, forgot-password, the `is_staff` admin
permission boundary, rate limiting, saved addresses, account settings, and
the T-116 fix for the prior run's minor finding. Plus every cross-cutting
checklist item M1's code touches: secrets handling, DEBUG/ALLOWED_HOSTS,
CSRF, PII scoping, comment-length (DRY-07), the full test suite,
prohibited-scope greps project-wide, backend lint/format/migrations, and the
`/api/v1/` contract.
**Date:** 2026-10-01
**Blockers:** 0
**Major:** 0
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** Efficiency (EFF-01..08), most of Spec conformance
(SPC-01..12, SPC-15..17) and most of Client contract (API-04, API-05, API-07,
API-08) — all catalog, design-tool, cart/checkout, and notification surfaces
that M1 does not touch. Security items SEC-01..03, 06, 07, 10, 15 (payment,
promo-code, design-file, user-content sanitization) are likewise M4/M3/M5
scope and not verified here. CI-SEC-01..05 were verified at M0 and are not
re-run per milestone.

## Findings

None. The one minor finding from the prior M1 run
(`confirm_email_change`'s unhandled `IntegrityError` race) was fixed by
T-116 and is confirmed closed below.

## Commands run

```
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).

$ uv run python manage.py makemigrations --check --dry-run
No changes detected

$ uv run ruff check . && uv run ruff format --check .
All checks passed!
76 files already formatted

$ uv run python -c "import sys; print(sys.prefix)"
C:\Users\nwank\Desktop\sten_lab\momus-collective\backend\.venv

$ uv run pytest -q
........................................................................ [ 60%]
................................................                          [100%]
120 passed, 1 warning in 216.99s (0:03:36)

$ uv run pytest -q accounts/tests/test_account_settings.py::test_email_change_confirm_returns_400_on_a_uniqueness_race -v
accounts\tests\test_account_settings.py .                                [100%]
1 passed, 1 warning in 10.26s

$ uv run pytest -q tests/test_admin_permission.py -v
tests\test_admin_permission.py ...                                       [100%]
3 passed, 1 warning in 7.58s

$ rg -nwi "printful|printify|afrprint|jaraprint" --glob '!*.md'
(no output)
$ rg -nw "tenant|tenant_id|storefront_builder" --glob '!*.md'
(no output)
$ rg -nw "currency|exchange_rate|USD|EUR|GBP" --glob '!*.md'
(no output)
$ rg -nw "layers|freeDrag|free_drag|backPlacement|back_placement|imageUpload" --glob '!*.md'
(no output)
$ rg -nw "inventory|stock_count|stock_level|reorder_point" --glob '!*.md'
(no output)
$ rg -nwi "abandoned_cart|abandonedCart|cart_reminder" --glob '!*.md'
(no output)
$ rg -nw "referral_code|affiliate|subscription_plan|billing_cycle|recurring_charge" --glob '!*.md'
(no output)
$ rg -nwi "instagram_shop|tiktok_shop|i18n|gettext|ab_test|experiment_variant" --glob '!*.md'
(no output)

$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)

$ grep -n "env(" config/settings.py
SECRET_KEY = env("DJANGO_SECRET_KEY")               # no fallback
DEBUG = env("DJANGO_DEBUG")                          # defaults False
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")          # defaults []
REDIS_URL = env("REDIS_URL")                         # no fallback
FRONTEND_URL = env("FRONTEND_URL", default=...)      # non-secret default
GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID")  # no fallback
DEFAULT_FROM_EMAIL = env(..., default=...)           # non-secret default
EMAIL_BACKEND = env(..., default=...)                # non-secret default

$ grep -n "DEFAULT_THROTTLE" config/settings.py
"DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
"DEFAULT_THROTTLE_RATES": {

$ grep -n "tracking_token\|generate_tracking_token" orders/models.py
def generate_tracking_token():
tracking_token = models.CharField(
    max_length=64, unique=True, default=generate_tracking_token, editable=False

$ grep -n "CsrfViewMiddleware" config/settings.py
"django.middleware.csrf.CsrfViewMiddleware",

$ grep -n "get_queryset\|request.user" accounts/address_views.py accounts/account_views.py
(all PII-bearing endpoints scoped to request.user; see T-114/T-115/T-116 change log rows)

$ grep -rn "logging\.\|logger\." --include="*.py" accounts/ config/ | grep -v tests/
(no output)

$ git check-ignore -v backend/.env
.gitignore:20:.env    backend/.env

$ git ls-files | grep "\.env$"
(no output)

DRY-07 comment-block scan (Python, excluding migrations/.venv): violations: []

$ git status --porcelain
(no output; clean tree before and after this audit)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass (M1 scope) | SEC-04/05 (admin boundary, 401/403 tests), SEC-08 (rate limiting), SEC-09 (CSRF middleware active), SEC-11 (no hardcoded secrets or fallback defaults), SEC-12 (DEBUG/ALLOWED_HOSTS safe defaults), SEC-13 (unguessable `tracking_token`), SEC-14 (PII endpoints scoped to `request.user`, no logging calls in `accounts`/`config`) all confirmed. The prior run's finding — `confirm_email_change`'s unhandled `IntegrityError` race — is fixed: T-116 wraps the save in `transaction.atomic()` and catches the race, re-proved by a test that forces the exact collision. SEC-01/02/03/06/07/10/15 are M3/M4/M5 scope, not verified. |
| 2. Efficiency | not verified | No list endpoints exist yet; EFF-01..08 are catalog/frontend/design-tool scope (M2/M3). |
| 3. DRY and layering | pass | DRY-05: views stay thin, logic lives in serializers/model methods/token helpers. DRY-07: zero comment blocks over 5 lines across all tracked Python. DRY-01..04/06 are pricing/order-status/design-tool scope, not yet built. |
| 4. Tests | pass | TST-01: `120 passed`, non-zero. TST-03: registration, duplicate-email, login, password reset, token refresh, and Google OAuth each have a dedicated passing test. TST-04: admin 401/403 boundary tested. TST-02/05 are payment/frontend scope, not yet built. TST-06: spot-checked — tests assert on response status, body fields, and database state, not merely "did not raise." |
| 5. Spec conformance | not verified (M1 scope only) | No SPC items name M1 directly; all are catalog/design/cart/review scope. Prohibited-scope greps (PRO-01..08) are project-wide and all clean. |
| 6. Build and types | pass (backend only) | BLD-04: ruff check/format clean over 76 files. BLD-05: `manage.py check` clean, no missing migrations. BLD-06: confirmed `sys.prefix` is the project-local `.venv`. BLD-01/02/03/07 are frontend/CI scope, not re-run per milestone. |
| 7. Client contract and acceptance | pass (M1 scope) | API-01: all DRF routes under `/api/v1/`. API-02: M1 only adds routes/fields within v1, nothing removed or renamed. API-06: all 16 M1 tasks and all 14 M1 DoD rows are `[x]` with pasted proof in `docs/TODO.md`. API-03/04/05/07/08 require a frontend consumer or payment/notification surfaces that don't exist yet. |
