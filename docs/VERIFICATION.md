# Verification Report

**Milestone:** M3 - Custom Design Tool
**Scope:** Final M3 audit at `a47afa8`: all 23 M3 tasks (T-301..T-323),
including the httpOnly cookie auth (T-321) and the two findings it raised
(T-322 cross-tab refresh, T-323 atomic token spend), re-confirmed closed by
opening the files. Every cross-cutting checklist item M3 code touches:
admin authorization, server-side pricing, money types, input sanitization,
design-file access (SEC-15), CSRF (SEC-09), auth rate limits (SEC-08),
query counts, DRY-01/03/06/07, both test suites, prohibited-scope greps,
lint/format/types, and the `/api/v1/` contract.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 0
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm build` writes `.next/`, which
this skill forbids; the T-322 implement run built and served every route).
BLD-07 for commits after PR #6's last CI run (T-319..T-323 not yet pushed;
CI will run on push). EFF-08 (Lighthouse not re-run). SEC-01/02/03/07 and
SPC-07..13 are M4/M5 scope. CI-SEC-01..05 are verified at M0.

## Findings

None. The prior run's findings are closed:
1 (major) closed: `backend/accounts/session_views.py` `session_refresh` no
longer calls `clear_auth_cookies` on failure (0 occurrences in the
function), and `frontend/src/lib/auth/api.ts:101` re-reads the session
before signing out.
2 (minor) closed: `session_views.py:66-77` spends the token inside
`transaction.atomic()` with `select_for_update()` on its `OutstandingToken`
row before creating the `BlacklistedToken`.

## Commands run

```
$ git status --porcelain
(clean)
$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ cd backend && uv run pytest -q
289 passed, 1 warning in 32.57s
$ cd backend && uv run ruff check .
All checks passed!
$ cd backend && uv run ruff format --check .
116 files already formatted
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).
$ cd backend && uv run python manage.py makemigrations --check --dry-run
No changes detected
$ pnpm --dir frontend test        (pnpm 11.21.0 via npx)
 Test Files  21 passed (21)
      Tests  119 passed (119)
$ pnpm --dir frontend typecheck
✓ Types generated successfully
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
exit 0
$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)
$ PRO-01..08 greps
frontend/src/lib/format.ts:2:  style: "currency",      (known false positive)
frontend/src/lib/format.ts:3:  currency: "NGN",
$ grep -c clear_auth_cookies in session_refresh -> 0
$ grep select_for_update / transaction.atomic / BlacklistedToken.objects.create
66:    with transaction.atomic():
68:            OutstandingToken.objects.select_for_update()
77:        BlacklistedToken.objects.create(token=outstanding)
$ DRY-07 scan over the 86 .py/.ts/.tsx/.yml files changed since main
86 files; violations: 0
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | Browser tokens are httpOnly, Secure and SameSite, never in a response body, and the refresh cookie is path-scoped. Cookie-authenticated writes need the CSRF token, with foreign origins refused (SEC-09). Refresh tokens are spent exactly once, proven by a threaded test, and a racing tab can no longer log the user out. Admin endpoints are `IsStaffUser` with 401/403 tests; prices are server-computed; design text is sanitized on write and at render; print files are private, owner or staff only. Residual, not a defect: if a tab's single retried session read still beats the other tab's rotation, that tab shows signed-out until its next navigation; its cookies are intact. |
| 2. Efficiency | pass | Constant-query design list; pricing 2 queries; per-design file prefix; rendering in Celery. |
| 3. DRY and layering | pass | One shirt-colour definition shared by catalog and tool; pricing in one module; cookie helpers in one module; DRY-07 0 violations. |
| 4. Tests | pass | Backend `289 passed`, frontend `119 passed`. Known-failure checks are recorded for CSRF enforcement, the race guard, atomic spend, cookie clearing and the money scan. |
| 5. Spec conformance | pass | SPC-03/04/05/06/16 hold; NFR-04's CSRF and rate limiting are enforced on browser sessions; D-078 records thumbnails. |
| 6. Build and types | pass (partial) | Typecheck, lint, ruff, checks and migrations clean. BLD-01/BLD-07 as in the header. |
| 7. Client contract and acceptance | pass | Session endpoints are additive; the one tightened field is the user-ratified exception (D-077, D-079). All 23 M3 tasks and 14 DoD rows are `[x]` with pasted proof. |
