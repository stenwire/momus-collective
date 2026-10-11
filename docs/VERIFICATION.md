# Verification Report

**Milestone:** M3 - Custom Design Tool
**Scope:** Re-run against `d4493a5`: all 18 M3 tasks (T-301..T-318),
confirming the four findings of the prior M3 run are closed (T-315..T-318)
and auditing the code those fixes added (`catalog/admin_serializers.py`,
`designs/tasks.py`, `designs/storage.py`, `designs/views.py`,
`lib/design/store.ts`, `logout-button.tsx`). Plus every cross-cutting
checklist item M3 code touches, as in the prior run.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 0
**Minor:** 2
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm build` writes `.next/`, which
this skill forbids; the T-317 implement run built every route). BLD-07 (the
branch is not pushed, so no CI run exists for M3 yet). EFF-08 (Lighthouse not
re-run). SEC-01/02/03/07 and SPC-07..13 are M4/M5 scope. CI-SEC-01..05 are
verified at M0 and not re-run per milestone.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | 7. Client contract (API-02) | `backend/catalog/admin_serializers.py:37` | T-315 tightened validation on the existing v1 field `shirt_colors`, which API-02 (a `[user]` rule, D-011) forbids within v1. D-077 records why: every rejected value was already invalid under SPC-03, and no client writes the field. The reasoning holds, but it is an exception to a rule the user set, and only the user can accept that. | T-319: the user ratifies D-077, or the validation moves behind a v2 admin products route. |
| 2 | minor | 2. Efficiency | `backend/designs/storage.py:22` | `discard_design_files` lists the entire `DESIGN_FILES_ROOT` directory on every config edit and delete to find one design's files. That is O(all stored files) per edit, and would be costly against S3 once storage is swapped (D-074). | T-320: store each design's files under a per-design prefix (`<id>/<digest>.png`) and list only that prefix. |

Prior-run findings, re-confirmed closed by opening the files:
1 (major) closed: `catalog/admin_serializers.py:37-49` validates against `SHIRT_COLORS`.
2 closed: `designs/tasks.py:14-28` skips a missing design, publishes only if `config=config` still matches, otherwise deletes its own file.
3 closed: `logout-button.tsx:17` calls `reset()`, which clears config, saved id, saved config and name (`store.ts:38-39`).
4 closed: D-078 recorded in `docs/TODO.md`.

## Commands run

```
$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ cd backend && uv run pytest -q
267 passed, 1 warning in 26.91s
$ cd backend && uv run ruff check .
All checks passed!
$ cd backend && uv run ruff format --check .
113 files already formatted
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).
$ cd backend && uv run python manage.py makemigrations --check --dry-run
No changes detected
$ pnpm --dir frontend test        (pnpm 11.21.0 via npx)
 Test Files  20 passed (20)
      Tests  112 passed (112)
$ pnpm --dir frontend typecheck
✓ Types generated successfully
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
exit 0
$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)
$ PRO-01..08 greps
frontend/src/lib/format.ts:2:  style: "currency",
frontend/src/lib/format.ts:3:  currency: "NGN",
(PRO-03's known Intl.NumberFormat false positive; all others empty)
$ DRY-07 scan over the 76 .py/.ts/.tsx/.yml files changed since main
76 files; violations: 0   (scanner proven in the prior run on a 6-line block)
$ grep confirmations of the four prior findings (see above)
catalog/admin_serializers.py:37  def validate_shirt_colors(self, value):
designs/tasks.py:23  published = SavedDesign.objects.filter(id=design.id, config=config).update(
logout-button.tsx:17  useDesignStore.getState().reset();
docs/TODO.md: 1 row "| D-078 "
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | Prior findings 2 and 3 closed. Admin endpoints `IsStaffUser` with 401/403 tests; prices server-computed; design text sanitized on write and at render; print files private, owner or staff only; no secret, no fallback default. |
| 2. Efficiency | pass, 1 minor | Constant-query design list; pricing 2 queries; rendering in Celery. Finding 2. |
| 3. DRY and layering | pass | Catalog colours now share `designs/options.py` (DRY-06 closed); pricing in one module (DRY-03); DRY-07 0 violations. |
| 4. Tests | pass | Backend `267 passed`, frontend `112 passed`, non-zero; known-failure checks recorded for the race guard and the money scan. |
| 5. Spec conformance | pass | SPC-03 now holds for catalog products as well as the tool; SPC-04/05/06/16 hold; D-078 records the thumbnail choice. |
| 6. Build and types | pass (partial) | Typecheck, lint, ruff, checks and migrations clean; backend env is `backend/.venv`. BLD-01 and BLD-07 not verified here. |
| 7. Client contract and acceptance | pass, 1 minor | Routes under `/api/v1/`; frontend reads only declared fields; `/design` server-rendered. Finding 1 (API-02 exception pending user ratification). All 18 M3 tasks and 14 DoD rows are `[x]` with proof. |
