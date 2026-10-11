# Verification Report

**Milestone:** M3 - Custom Design Tool
**Scope:** M3 at `cb0ead8` (previously verified PASS through T-320) plus the
uncommitted T-321 change that moves browser auth to httpOnly cookies with
CSRF: `config/authentication.py`, `accounts/session_views.py`, settings
(CORS credentials, CSRF trusted origins, cookie flags), the frontend auth
store, `authFetch`, `AuthBootstrap`, logout, and the M1 rate-limit test
isolation fix. Plus every cross-cutting check M3 code touches.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 1
**Minor:** 1
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm build` writes `.next/`; the T-321
implement run built and served every route). BLD-07 for the T-321 change
(not yet pushed; PR #6's last CI run, before T-321, passed every check).
EFF-08 (Lighthouse not re-run). M4/M5-scope checks as before.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | 1. Security and input trust (session correctness) | `backend/accounts/session_views.py:99-104`, `frontend/src/lib/auth/api.ts:93-94` | Cookies are shared by every tab. When two tabs refresh at once with the same refresh token, one rotates it and sets new cookies; the other's request carries the now-spent token, gets a 401, and its response calls `clear_auth_cookies`, deleting the cookies the first tab just set. The user is logged out everywhere. The frontend then signs out without checking whether another tab already renewed the session. Two tabs left open past the 15-minute access lifetime make this realistic. | T-322: do not clear cookies on a failed refresh (a spent token is harmless to leave); on refresh failure, the frontend re-reads `GET /auth/session/`, which carries whatever cookies another tab set, before declaring the user signed out. Test the two-tab race. |
| 2 | minor | 1. Security and input trust | `backend/accounts/session_views.py:52-57` | `_rotate` validates the refresh token and then blacklists it as two separate steps. Two simultaneous requests can both pass validation and each mint a new token family, so rotation does not strictly spend a token once. SimpleJWT's stock endpoint shares the pattern. | T-323: spend the token atomically (create the `BlacklistedToken` row inside a transaction and treat an existing row as already spent), with a test. |

## Commands run

```
$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ cd backend && uv run pytest -q
285 passed, 1 warning in 31.72s
$ cd backend && uv run pytest -q accounts/tests/test_session.py
17 passed, 1 warning in 5.83s
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
      Tests  117 passed (117)
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
$ rg -n "localStorage" frontend/src --glob '!*.test.*'
frontend/src/lib/design/store.ts:43   (design draft only, no auth data)
frontend/src/components/auth/auth-bootstrap.tsx:12   (removes legacy tokens)
```

Read-checks performed by opening the files: `config/authentication.py`
(Bearer wins; cookie path enforces CSRF; an invalid cookie is anonymous),
`accounts/session_views.py` (no token in any response body; refresh cookie
path-scoped; `remember` claim honoured on rotation), `config/settings.py`
(credentials CORS limited to the explicit allowlist; CSRF trusted origins
mirror it; Secure by default), `frontend/src/lib/auth/api.ts` (credentials
included; CSRF header on unsafe methods only), `auth-bootstrap.tsx`,
`logout-button.tsx`, `accounts/tests/test_rate_limiting.py` (the
`monkeypatch.setitem` restore).

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass, 1 major, 1 minor | Tokens are unreadable by page script (httpOnly), never in a response body, and the refresh cookie travels only to the session endpoints. Every cookie-authenticated write needs the CSRF token, with foreign origins refused, which SEC-09 now covers for real. Credentialed CORS is limited to the allowlist. Session login keeps the `auth-login` throttle (SEC-08). Findings 1 and 2. |
| 2. Efficiency | pass | No change to query counts; one session request per full page load. |
| 3. DRY and layering | pass | Cookie helpers in one module; session views reuse the existing credential serializer and `issue_token_pair`. |
| 4. Tests | pass | Backend `285 passed` (17 new session tests, CSRF enforcement proven by a known-failure run in T-321), frontend `117 passed`. The test-isolation leak in `test_rate_limiting.py` is fixed, so the suite no longer runs at a silently lowered login rate. |
| 5. Spec conformance | pass | No change to the design tool; NFR-04 CSRF on forms is now actually enforced for browser writes. |
| 6. Build and types | pass (partial) | Typecheck, lint, ruff, checks and migrations clean. BLD-01/BLD-07 as in the header. |
| 7. Client contract and acceptance | pass | The session endpoints are additive; no existing v1 endpoint, field or status code changed. Bearer clients keep working (tested). |
