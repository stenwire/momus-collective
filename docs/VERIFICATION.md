# Verification Report

**Milestone:** M2 - Catalog and Storefront
**Scope:** All 18 M2 tasks (T-201..T-218): the product list/detail/category/
collection endpoints and their admin CRUD counterparts, search, sorting,
infinite scroll, SSR with metadata/JSON-LD, the `/shop`/`/shop/<category>`/
`/product/<slug>` URL structure, image optimization and Lighthouse
performance, the accessibility pass, homepage brand assets, and the T-218
touch-target fix this re-run confirms. Plus every cross-cutting checklist item
M2's code touches: admin permission boundaries, CORS (a mid-task discovery
during T-216), query-count efficiency, DRY-07 comment length across
backend/frontend/CI YAML, the full test suite, prohibited-scope greps
project-wide, backend and frontend lint/format/types, and the `/api/v1/`
contract.
**Date:** 2026-10-01
**Blockers:** 0
**Major:** 0
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** Security items SEC-01/02/03/06/07/10/15
(payment, promo-code, design-file, user-content sanitization) are M3/M4/M5
scope. EFF-07 (Celery for async work) is not applicable — M2 adds no
email/webhook/long-running work. CI-SEC-01..05 were verified at M0 and are
not re-run per milestone.

## Findings

None. The one major finding from the prior M2 run (three components under
the 44x44px touch-target floor) was fixed by T-218 and is confirmed closed
below.

## Commands run

```
$ cd backend && uv run pytest -q
........................................................................ [ 41%]
........................................................................ [ 83%]
............................                                             [100%]
172 passed, 1 warning in 321.68s (0:05:21)

$ pnpm --dir frontend test
Test Files  9 passed (9)
     Tests  25 passed (25)

$ pnpm --dir frontend typecheck
✓ Types generated successfully

$ pnpm --dir frontend lint
(no output; exit 0)

$ Live-browser re-verification of T-218's fix (jsdom computes no real
  layout, so this can only be confirmed against an actual rendered page):
  pnpm build && pnpm start, Django live, Playwright's
  getComputedStyle(el).height against a real /shop page:
  - category pill ("Philosophy (1)"): "44px"
  - search input: "44px"
  - sort select: "44px"

$ rg -nwi "printful|printify|afrprint|jaraprint" --glob '!*.md'
(no output)
$ rg -nw "tenant|tenant_id|storefront_builder" --glob '!*.md'
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
(PRO-03's "currency" grep still matches Intl.NumberFormat's mandatory NGN-only
option key in frontend/src/lib/format.ts -- confirmed false positive in the
prior run by reading the file; unchanged this run, re-confirmed still a
false positive.)

$ git status --porcelain
(no output; clean tree before and after this audit)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | Unchanged from the prior M2 run: all 3 admin viewsets declare `IsStaffUser`, 401/403 tested; no hardcoded secrets or new fallback defaults; CORS scoped to an explicit allowlist with no wildcard/credentials. T-218 touched only CSS class strings, no security surface. |
| 2. Efficiency | pass | Unchanged: constant query count (T-201), denormalized fields read directly (EFF-03), 20/batch infinite scroll, 300ms debounce, lazy WebP, Lighthouse 0.92/0.88 all previously proven and unaffected by T-218. |
| 3. DRY and layering | pass | Unchanged: zero DRY-07 violations across backend Python, frontend TypeScript, and CI YAML. T-218's fix added one Tailwind utility class to each of three existing `className` strings — no new files, no layering change. |
| 4. Tests | pass | Backend `172 passed`, frontend `25 passed`, both unchanged from before T-218 (a CSS-only fix has no unit-testable surface under jsdom, which computes no real layout — verified instead via live Playwright measurement, documented above). |
| 5. Spec conformance | pass | **The prior run's one finding is now closed**: `CategoryFilter`, `SearchInput`, and `SortSelect` all measure exactly 44px in a real rendered browser, confirmed individually rather than inferred from the `min-h-11` class name alone. SPC-01/02/14/15 and all 8 PRO-01..08 prohibited-scope checks re-confirmed clean. |
| 6. Build and types | pass | Unchanged: typecheck/lint clean, `pnpm build` compiles all 7 routes, backend `manage.py check`/migrations clean, CI's `frontend` job (T-217) still proves real SSR content. |
| 7. Client contract and acceptance | pass | Unchanged: all catalog/admin routes under `/api/v1/`, no breaking v1 change, `/shop`/`/shop/<category>`/`/product/<slug>` all exist, all 18 M2 tasks and all 16 M2 DoD rows are `[x]` with pasted proof in `docs/TODO.md`. |
