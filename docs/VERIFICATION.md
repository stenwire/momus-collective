# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Pre-commit audit of the uncommitted working tree on `m6-storefront-redesign` (122 paths: 79 modified, 4 deleted, 39 untracked), not the milestone as a whole.
- **Backend:** lint, format, Django checks, migration check, full test suite; SEC-04/SEC-08/SEC-11 reads over the new `support/` app and the changed admin views; PRO greps.
- **Frontend:** typecheck, lint, full test suite; DRY-07 comment scan over every changed and untracked source file.
- **Not opened file by file:** most of the 122 paths. Only the files named in the findings were opened.
**Date:** 2026-11-01
**Blockers:** 0
**Major:** 2
**Minor:** 1
**Verdict:** PASS (0 blockers; 2 major findings open and queued as T-631, T-632)
**Dimensions not verified:** BLD-01 (`next build` writes `.next/`, forbidden without `--fix`), EFF-08 (no Lighthouse run), CI-SEC-01..05 (scanners not run locally), SEC-15 and SPC-* for the new admin products, categories, pricing and complaints screens (not opened), API-01..05 beyond the support endpoints.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | Build (BLD-04) | `backend/support/models.py:24`, `backend/support/tests/test_complaints.py:73`; 6 files under `backend/support/` | `ruff check` reports 2 × E501 and `ruff format --check` reports 6 files that would be reformatted, all in the new `support/` app. | Run `uv --directory backend run ruff format support` and wrap the two long lines. |
| 2 | major | Process (API-06) | `docs/TODO.md`, `docs/MILESTONES.md` | The tree holds substantial work no tracker mentions: the `support/` complaints app and `/complaints` page, admin products, categories, complaints and pricing screens, profile page, `backend/Dockerfile`, R2/S3 storage wiring, pagination module. `grep -ci complaint` returns 0 in both trackers. The trackers are the stated source of truth. | Add tasks (with proof) for each piece, or split it onto its own branch, before the PR describes it as M6. |
| 3 | minor | Hygiene | `frontend/AGENTS.md`, `frontend/CLAUDE.md`, `frontend/public/mascot-human-old.png`, `frontend/public/mascot-human-cutout.png` | Untracked tool-instruction files and two image variants sit beside the real mascot asset; `mascot-human.png` is deleted. | Decide which asset is canonical (SPC-15 names `mascot-human.png`) and drop the rest. |

## Commands run

```
$ uv --directory backend run ruff check . --output-format concise
support/models.py:24:89: E501 Line too long (89 > 88)
support/tests/test_complaints.py:73:89: E501 Line too long (96 > 88)
Found 2 errors.

$ uv --directory backend run ruff format --check .
6 files would be reformatted, 210 files already formatted
(support/apps.py, models.py, serializers.py, tests/test_complaints.py, urls.py, views.py)

$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).

$ cd backend && uv run python manage.py makemigrations --check --dry-run
No changes detected

$ uv --directory backend run pytest -q -x -p no:cacheprovider
695 passed, 514 warnings in 89.70s (0:01:29)

$ corepack pnpm --pm-on-fail=ignore --dir frontend typecheck
✓ Types generated successfully   (tsc --noEmit exited 0)

$ corepack pnpm --pm-on-fail=ignore --dir frontend lint
$ eslint --max-warnings 0         (exit 0, no output)

$ corepack pnpm --pm-on-fail=ignore --dir frontend test
Test Files  75 passed (75)
Tests       391 passed (391)

SEC-11: only hits are test fixtures (backend/orders/tests/test_payment.py, test_webhook.py, test_fulfilment.py: sk_test_* literals)
SEC-04: support/views.py:31 AdminComplaintViewSet permission_classes = [IsStaffUser]; catalog, designs, promocodes admin views all declare IsStaffUser
SEC-08: support/views.py:14-17 FileComplaint is AllowAny with ScopedRateThrottle, scope "complaints"
PRO-01/05/06/07 grep over backend and frontend/src: no hits
DRY-07: no comment block over 5 lines in any changed or untracked .py/.ts/.tsx/.css file
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| Security | pass (partial) | Reads limited to the support app and admin permission classes; CI scanners not run. |
| Efficiency | not verified | No query-count or Lighthouse run on the new endpoints. |
| DRY and layering | pass (partial) | DRY-07 clean; the rest not reviewed for new code. |
| Tests | pass | 695 backend, 391 frontend, both non-zero. |
| Spec conformance | not verified | New admin screens not audited against the PRD. |
| Build and types | fail | BLD-02, BLD-03, BLD-05 pass; BLD-04 fails (finding 1); BLD-01 not run. |
| Client contract | not verified | Not reviewed beyond the support routes. |
