# Verification Report

**Milestone:** M2 - Catalog and Storefront
**Scope:** All 17 M2 tasks (T-201..T-217): the product list/detail/category/
collection endpoints and their admin CRUD counterparts, search, sorting,
infinite scroll, SSR with metadata/JSON-LD, the `/shop`/`/shop/<category>`/
`/product/<slug>` URL structure, image optimization and Lighthouse
performance, the accessibility pass, and homepage brand assets. Plus every
cross-cutting checklist item M2's code touches: admin permission boundaries,
CORS (a mid-task discovery during T-216), query-count efficiency, DRY-07
comment length across backend/frontend/CI YAML, the full test suite,
prohibited-scope greps project-wide, backend and frontend lint/format/types,
and the `/api/v1/` contract.
**Date:** 2026-10-01
**Blockers:** 0
**Major:** 1
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** Security items SEC-01/02/03/06/07/10/15
(payment, promo-code, design-file, user-content sanitization) are M3/M4/M5
scope. EFF-07 (Celery for async work) is not applicable — M2 adds no
email/webhook/long-running work. CI-SEC-01..05 were verified at M0 and are
not re-run per milestone.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | Spec conformance (SPC-16 / NFR-01) | `frontend/src/components/catalog/category-filter.tsx:25,39`, `frontend/src/components/catalog/search-input.tsx:16`, `frontend/src/components/catalog/sort-select.tsx:21` | Three interactive controls render under the 44x44px touch-target floor NFR-01/SPC-16 require: category filter pills (`px-3 py-1.5` + `text-sm` ≈ 32px tall), the search input and sort dropdown (`px-3 py-2` + `text-sm` ≈ 36px tall). `ProductDetailView`'s size/color buttons and `ProductModal`'s close button already use `min-h-11`/`h-11 w-11` (44px) correctly — this is an inconsistency, not a project-wide gap. | Add `min-h-11` (and `min-w-11` where the element is icon-only) to all three components, matching the pattern already used in `ProductDetailView` and `ProductModal`. |

## Commands run

```
$ cd backend && uv run pytest -q
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed, 1 warning in 323.42s (0:05:23)

$ pnpm --dir frontend test
Test Files  9 passed (9)
     Tests  25 passed (25)

$ cd backend && uv run ruff check . && uv run ruff format --check .
All checks passed!
91 files already formatted

$ uv run python manage.py check
System check identified no issues (0 silenced).

$ uv run python manage.py makemigrations --check --dry-run
No changes detected

$ uv run python -c "import sys; print(sys.prefix)"
C:\Users\nwank\Desktop\sten_lab\momus-collective\backend\.venv

$ pnpm --dir frontend typecheck
✓ Types generated successfully

$ pnpm --dir frontend lint
(no output; exit 0)

$ grep -n "permission_classes" backend/catalog/admin_views.py
(3 matches: AdminProductViewSet, AdminCategoryViewSet, AdminCollectionViewSet — all IsStaffUser)

$ grep -rln "401\|403" backend/catalog/tests/test_admin_*.py
test_admin_categories.py, test_admin_collections.py, test_admin_products.py

$ grep -n "env(" backend/config/settings.py
SECRET_KEY, ALLOWED_HOSTS, REDIS_URL, GOOGLE_OAUTH_CLIENT_ID: no fallback default
FRONTEND_URL, DEFAULT_FROM_EMAIL, EMAIL_BACKEND: non-secret safe defaults
CORS_ALLOWED_ORIGINS built from FRONTEND_URL + CORS_EXTRA_ORIGINS (env.list default [])

$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)

$ rg -nwi "printful|printify|afrprint|jaraprint" --glob '!*.md'
(no output)
$ rg -nw "tenant|tenant_id|storefront_builder" --glob '!*.md'
(no output)
$ rg -nw "currency|exchange_rate|USD|EUR|GBP" --glob '!*.md'
frontend/src/lib/format.ts:2: style: "currency",
frontend/src/lib/format.ts:3: currency: "NGN",
(Intl.NumberFormat's mandatory option key, hardcoded to NGN only -- no
multi-currency logic, no currency selection, no exchange rate. Confirmed
by reading the file: false positive, not a violation.)
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

DRY-07 comment-block scan (backend Python, excluding migrations/.venv): violations: []
DRY-07 comment-block scan (frontend TypeScript): violations: []
.github/workflows/ci.yml's two new T-217 comment blocks: 5 lines each, at the cap

$ cat frontend/src/lib/constants.ts
export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;  # SPC-02 exact match

$ uv run pytest -q backend/catalog/tests/test_categories.py::test_launch_migration_seeds_all_11_categories_in_order
1 passed

$ uv run pytest -q backend/tests/test_no_float_money.py
2 passed

$ ls -l assets/*.png
avatar.png, mascot-human.png, mascot-raven.png, wordmark.png all present, untouched by T-216's crops into frontend/public/

$ grep -n "min-h-11\|min-w-11\|h-11 w-11" frontend/src/components/ (recursive, excluding tests)
product-detail.tsx:56,80,95 and product-modal.tsx:38 all present (44px touch targets)
category-filter.tsx, search-input.tsx, sort-select.tsx: absent (see Finding 1)

$ grep -n "path(" backend/config/urls.py backend/config/api_urls.py backend/catalog/urls.py
confirms all catalog routes mount under /api/v1/ via config.api_urls

$ ls frontend/src/app/shop/ frontend/src/app/product/
confirms /shop, /shop/[category], /product/[slug] all exist as named routes

$ git status --porcelain
(no output; clean tree before and after this audit)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | SEC-04/05 (all 3 admin viewsets declare `IsStaffUser`, 401/403 tested), SEC-11 (no hardcoded secrets or new fallback defaults, including the new `CORS_EXTRA_ORIGINS`), SEC-12 (DEBUG/ALLOWED_HOSTS unchanged and safe), SEC-09 (CSRF middleware unaffected). The new CORS config (T-216 mid-task discovery) uses an explicit origin allowlist with no `CORS_ALLOW_ALL_ORIGINS`/wildcard/credentials flag — confirmed by reading `config/settings.py` directly. SEC-01/02/03/06/07/10/15 are M3/M4/M5 scope. |
| 2. Efficiency | pass | EFF-01/02: constant query count re-confirmed passing and tested against a known N+1 failure (T-201's original proof, re-run here). EFF-03: `total_orders`/`avg_rating` are plain serializer fields, no per-card aggregation. EFF-04 (20/batch infinite scroll), EFF-05 (300ms debounce), EFF-06 (lazy WebP), EFF-08 (Lighthouse 0.92/0.88, both >80) all previously proven in T-204/T-208/T-214 and unchanged. EFF-07 not applicable — M2 adds no async-work candidates. |
| 3. DRY and layering | pass | DRY-05: `catalog/views.py`/`admin_views.py` stay under 100-140 lines each, logic lives in serializers and short viewset actions, no monolithic view. DRY-07: zero comment-block violations across backend Python and frontend TypeScript; the two new CI YAML comment blocks added for T-217 sit exactly at the 5-line cap. |
| 4. Tests | pass | TST-01: backend `172 passed`, frontend `25 passed`, both non-zero. TST-04: admin 401/403 tested across all three admin viewsets. TST-02/03 are payment/most-of-auth scope, unaffected by M2. TST-05 confirmed above. TST-06: spot-checked — tests assert on response status, body fields, and database state. |
| 5. Spec conformance | 1 major finding | SPC-01 (11 categories, exact names and order), SPC-02 (exact 5 sizes), SPC-14 (no float money, project-wide scan), SPC-15 (brand assets at their PRD paths, untouched) all confirmed passing. SPC-16/NFR-01 (44x44px touch targets) fails on three components — see Finding 1. PRO-01..08 all clean (one grep hit on PRO-03 confirmed a false positive by reading the file). |
| 6. Build and types | pass | BLD-01 (frontend builds, re-confirmed in T-217), BLD-02 (typecheck clean), BLD-03 (lint clean), BLD-04 (ruff check/format clean over 91 files), BLD-05 (`manage.py check`/migrations clean), BLD-06 (`sys.prefix` is the project-local venv), BLD-07 (CI's `frontend` job now actually proves real SSR content lands in the build, per T-217 — the prior gap where it silently built nothing is now closed and tested both directions). |
| 7. Client contract and acceptance | pass | API-01: all catalog and admin routes mount under `/api/v1/`, confirmed by reading `urls.py` directly. API-02: M2 only adds new routes/fields within v1; nothing removed, renamed, or tightened. API-05: `/shop`, `/shop/<category>`, `/product/<slug>` all exist as named Next.js routes. API-06: all 17 M2 tasks and all 16 M2 DoD rows are `[x]` with pasted proof in `docs/TODO.md`. API-04 (SSR/meta/JSON-LD) proven in T-212/T-213. API-03/07/08 require cart/payment/notification surfaces M2 doesn't build. |
