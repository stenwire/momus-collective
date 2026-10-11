# Verification Report

**Milestone:** M3 - Custom Design Tool
**Scope:** All 14 M3 tasks (T-301..T-314) on `m3-custom-design-tool`: the
`designs` app (options, sanitizer, saved-design API, print renderer, Celery
export, private file download, pricing models and admin endpoint), the
`/design` tool, `/login`, `/register`, `/account/designs`, the shared nav, and
the uncommitted T-313 touch-target changes in the working tree. Plus every
cross-cutting checklist item M3 code touches: admin authorization, server-side
pricing, money types, input sanitization, design-file access (SEC-15),
query counts, DRY-01/03/06/07, the full test suites, prohibited-scope greps,
lint/format/types, and the `/api/v1/` contract.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 1
**Minor:** 3
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm build` writes `.next/`, which
this skill forbids; the T-313 implement run built every route against a live
backend). BLD-07 (the branch is not pushed, so no CI run exists for M3 yet).
EFF-08 (Lighthouse not re-run; M3 changed only one class on the homepage
CTA). SEC-01/02/03/07 and SPC-07/08/09/10/11/12/13 are M4/M5 scope.
CI-SEC-01..05 are verified at M0 and not re-run per milestone.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | 5. Spec conformance (SPC-03) / 3. DRY-06 | `backend/catalog/admin_serializers.py:16` | `AdminProductSerializer` accepts any list for `shirt_colors`, so an admin can give a catalog product "Neon", outside SPC-03's exact seven, and the product detail page will offer it as a choice. M3 created the single shirt-colour definition (`designs/options.py:93`), but the catalog validator does not use it, so the codebase has a second, unconstrained notion of shirt colour. | T-315: validate `shirt_colors` against `designs.options.SHIRT_COLORS` in `AdminProductSerializer`, with a test rejecting an unknown colour. |
| 2 | minor | 1. Security and input trust / 5. FR-DES-09 | `backend/designs/tasks.py:13-18` | `generate_design_file` renders the config it read at start, then sets `design_file_url` unconditionally. If the design's config is PATCHed during the render (about 0.1s), `perform_update` clears the URL, then the task writes a file of the old config and sets the URL again, so a stale print file survives with a live link. A design deleted mid-flight makes `.get()` raise `DoesNotExist` in the worker. Both need concurrent action within a sub-second window. | T-316: set the URL with a conditional `filter(id=..., config=<rendered config>).update(...)` and discard the file when no row matched; return quietly when the design no longer exists. |
| 3 | minor | 1. Security and input trust | `frontend/src/components/auth/logout-button.tsx:17` | Logout clears `savedId` and `name` but leaves the draft `config` (the slogan text) and `savedConfig` in localStorage (`momus-design-draft`), so the next person on a shared device sees the previous account's in-progress design. | T-317: reset the whole design draft on logout. |
| 4 | minor | 5. Spec conformance | `backend/designs/serializers.py:63` | The PRD's `SavedDesign.preview_image_url` is never populated: the gallery renders thumbnails live from the config with the same canvas renderer. A defensible choice, but it is recorded in no Decisions row. | T-318: record the decision (live thumbnails; field left blank until an image host exists), or populate the field. |

## Commands run

```
$ git log --oneline main..HEAD
6758dde M3 T-312: saved-design gallery with edit, add to cart, duplicate, delete
b16e4f1 M3 T-311: server-side custom pricing per shirt colour, admin-set
63184b6 M3 T-309: 300 DPI transparent print file, private and owner-only
e69e822 M3 T-308: save designs to the account, guests prompted to register
b15b47b M3 T-314: frontend login, register, JWT refresh and auth-aware nav
53f0fda M3 T-310: twelve templates across four styles, parenthetical asides
57edb0c M3 T-307: preview mode with a clean mockup and no controls
1a6d7c9 M3 T-306: four front placement presets with print-area guide
7d4bd76 M3 T-305: text size, contrast-filtered colours, alignment, spacing
c8ff079 M3 T-304: nine curated apparel fonts with in-face previews
ba7d98d M3 T-303: 80-char slogan input with live counter and sanitization
83c3e0d M3 T-302: all seven shirt colors with instant mockup update
ddf00d7 M3 T-301: canvas shirt mockup with live text re-render

$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ cd backend && uv run pytest -q
257 passed, 1 warning in 24.78s
$ cd backend && uv run pytest -q designs
84 passed, 1 warning in 8.54s
$ cd backend && uv run ruff check .
All checks passed!
$ cd backend && uv run ruff format --check .
113 files already formatted
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).
$ cd backend && uv run python manage.py makemigrations --check --dry-run
No changes detected

$ pnpm --dir frontend test        (pnpm 11.21.0 via npx; not on local PATH)
 Test Files  20 passed (20)
      Tests  112 passed (112)
$ pnpm --dir frontend typecheck
✓ Types generated successfully
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
exit 0

$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)
$ PRO-01..08 greps (exact commands from the checklist)
frontend/src/lib/format.ts:2:  style: "currency",
frontend/src/lib/format.ts:3:  currency: "NGN",
(PRO-03's known Intl.NumberFormat false positive, unchanged; all other
greps empty.)
$ rg -n "FloatField|float\(" backend/designs backend/carts --glob '!tests/**'
backend/designs/tests/test_render.py:110:  assert float(match.group(1)) == ...
(a test parsing layout constants, not money)

$ DRY-07 scan (AST docstrings, consecutive #, //, /* */) over the 74
  .py/.ts/.tsx/.yml files changed since main
violations: 0
  Scanner known-failure check, in memory: a 6-line # block is detected
  at (2, 6); the 5-line block beside it is not.

$ Live Chromium against the running build: /design, type a slogan,
  reload with the persisted draft present
after reload with a draft, slogan: persisted draft
console errors/warnings: none   (no hydration mismatch from the persisted store)
```

Read-checks performed by opening the files: `designs/serializers.py`
(strict eight-key config, sanitizer, contrast rule, read-only price),
`designs/views.py` (owner-scoped queryset, 404 for others, export via
Celery, file view owner-or-staff), `designs/admin_views.py` (`IsStaffUser`,
validated PATCH in one transaction), `designs/pricing.py` (integer sum,
two queries), `designs/render.py` (re-sanitizes; 300 DPI), `designs/tasks.py`,
`catalog/admin_serializers.py`, `frontend/src/lib/auth/api.ts` (`safeNext`
refuses `//` and `/\`), `logout-button.tsx`, `store.ts`.

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass, 2 minor | Admin pricing endpoint is `IsStaffUser` with 401/403 tests (SEC-04/05). Prices are computed server-side and a client `price` is ignored (SEC-06). Design text and names are sanitized on write and again at render; React and canvas `fillText` never interpret markup (SEC-10). Print files sit outside any public URL and are served only to the owner or staff (SEC-15). No new secret, no hardcoded fallback: `BACKEND_URL` and `DESIGN_FILES_ROOT` are non-secret settings with defaults. Findings 2 and 3. |
| 2. Efficiency | pass | The saved-design list is constant-query with prices (test, 1 vs 11 designs); `price_list()` is 2 queries; print rendering runs in Celery (EFF-07). |
| 3. DRY and layering | pass, 1 major (shared with 5) | Pricing arithmetic lives once in `designs/pricing.py` (DRY-01/03). Shirt colours, text palette, fonts, sizes, placements and templates are defined once in `designs/options.py` and served to the tool (DRY-06), except catalog products (finding 1). DRY-07: 0 violations, scanner proven. |
| 4. Tests | pass | Backend `257 passed`, frontend `112 passed`, both non-zero. Admin authorization (TST-04) is covered for the new endpoint. Tests assert behaviour, including known-failure checks recorded in the change log. |
| 5. Spec conformance | pass, 1 major, 1 minor | SPC-03 (seven colours), SPC-04 (80 characters with live counter), SPC-05 (four placements, no back or free-drag) and SPC-06 (300 DPI, transparent) all hold in the tool, each asserted by tests. SPC-16 holds on every M3 page per T-313's audit. Findings 1 and 4. |
| 6. Build and types | pass (partial) | Typecheck, lint, ruff, `manage.py check` and migrations are clean, and the backend env is `backend/.venv`. BLD-01 and BLD-07 are not verified here: see header. |
| 7. Client contract and acceptance | pass | Every new route is under `/api/v1/`; no existing v1 field, status code or validation changed (API-01/02). The frontend reads only declared fields (API-03). `/design` is server-rendered with its own metadata (API-04/05). All 14 M3 tasks and 14 DoD rows are `[x]` with pasted proof (API-06). |
