# Verification Report

**Milestone:** M1 - Data Models and Auth
**Scope:** M1 follow-up on `m1-followup-t117` (from `main` at `6da09f9`):
the uncommitted T-117 change to `/api/v1/auth/token/refresh/`
(`accounts/auth_views.py` `remembers`, `rotate_refresh_token`,
`RefreshView`; `accounts/session_views.py` now delegating to the shared
rotation; `accounts/urls.py`; new `accounts/tests/test_refresh_lifetime.py`),
plus every cross-cutting check that auth code touches: FR-USR-02 session
lifetimes, rate limits, the v1 contract, secrets, DRY-07, the full backend
suite.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 0
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** BLD-01 and frontend checks (no frontend file
changed in this follow-up). BLD-07 (branch not pushed yet). EFF-08 not
applicable. M4/M5-scope checks as before. CI-SEC-01..05 are verified at M0.

## Findings

None.

Checked and judged sound by opening the files:
- `accounts/auth_views.py:43-48` `remembers`: a pre-claim session-only
  token's `exp - iat` is exactly 43,200s, so the strict `>` maps it to
  session-only; a 30-day token maps to remembered.
- `accounts/auth_views.py:51-72` `rotate_refresh_token`: the spend is
  atomic under `select_for_update`; a token without an `OutstandingToken`
  row is denied. All tokens here are minted by `for_user`, which always
  creates that row, so this cannot arise in practice.
- `accounts/urls.py:11` routes `token/refresh/` to `RefreshView`; its
  error mapping comes from SimpleJWT's `TokenViewBase`, so the 401/400
  bodies are unchanged (API-02), as `test_the_response_contract_is_unchanged`
  asserts against the stock view's recorded output.

## Commands run

```
$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ cd backend && uv run pytest -q
296 passed, 1 warning in 34.25s
$ cd backend && uv run pytest -q accounts
83 passed, 1 warning in 18.31s
$ cd backend && uv run ruff check .
All checks passed!
$ cd backend && uv run ruff format --check .
117 files already formatted
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).
$ cd backend && uv run python manage.py makemigrations --check --dry-run
No changes detected
$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)
$ PRO-01..08 greps
frontend/src/lib/format.ts:2:  style: "currency",      (known false positive)
frontend/src/lib/format.ts:3:  currency: "NGN",
$ DRY-07 scan over the changed and new .py files
backend/accounts/auth_views.py
backend/accounts/session_views.py
backend/accounts/urls.py
backend/accounts/tests/test_refresh_lifetime.py
4 files; violations: 0
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | Bearer refresh now spends tokens atomically, as the cookie flow does; a spent or invalid token gets the same 401 as before. No secret, no fallback default. |
| 2. Efficiency | pass | A refresh is a fixed handful of queries (lock, blacklist check and insert, user lookup). |
| 3. DRY and layering | pass | One rotation implementation now serves both the bearer and cookie flows; DRY-07 0 violations. |
| 4. Tests | pass | `296 passed`; 7 new lifetime and contract tests, proven against the stock view in the implement run (3 failed there). |
| 5. Spec conformance | pass | FR-USR-02: a session-only login now stays session-length through refreshes. |
| 6. Build and types | pass (backend) | Ruff, checks and migrations clean; backend env is `backend/.venv`. Frontend not touched. |
| 7. Client contract and acceptance | pass | Same path, same response keys, same 401/400 bodies (API-02). |
