# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial, pre-commit audit of T-606's uncommitted diff on `m6-storefront-redesign` at `4a0cd83`. Not a completion audit.
- **Files audited:** `site-nav.tsx`, `site-nav-links.ts`, `auth/auth-nav.tsx`, `cart/cart-button.tsx`, `site-footer.tsx`, `newsletter-form.tsx`, `ui/input.ts`, `ui/page-skeleton.tsx`, `brand/raven.tsx`, `app/template.tsx`, `app/not-found.tsx`, `app/error.tsx`, `app/design/loading.tsx`, `globals.css`, `site-shell.test.tsx`, `sheet.test.tsx`, the `auth-forms.test.tsx` mock, and the tracker rows.
- **Cross-cutting checks these touch:** NFR-01 at 360px, NFR-03 status codes, NFR-05 landmarks and focus, the PRD wordmark size, DRY-07, tests, types.
- Open findings from earlier partial audits (T-615..T-623) are not re-counted.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 1
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01:** this skill may not run `pnpm build`. The T-606 `/implement` run built with exit 0, and the browser checks below ran against that build.
- **EFF-08:** Lighthouse, scheduled in T-613.
- **Backend:** no backend change.
- **BLD-07:** the branch has not been pushed.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | Spec conformance (NFR-05, WCAG 2.4.1) | `frontend/src/app/layout.tsx:33` | There is no skip link anywhere in the app. Now that a sticky header with up to six focusable controls precedes every page, a keyboard user tabs through it on every route before reaching `<main>`. Every storefront page does have a `<main>`, so a skip target exists. | Add a visually hidden "Skip to content" link as the first focusable element, shown on focus, pointing at an `id` on each page's `<main>` or on a wrapper in the template (T-624). |

## Commands run

```
--- TST-05
 Test Files  56 passed (56)
      Tests  307 passed (307)
--- BLD-02
typecheck exit 0
--- BLD-03
lint exit 0
--- DRY-07 (changed files)
DRY-07 done   (no block over 5 lines)
--- browser, read-only, :3100 build from the T-606 run: [scrollWidth, innerWidth] and wordmark width at 360x780
[360,360] 110  <- /
[360,360] 110  <- /shop
[360,360] 110  <- /design
[360,360] 110  <- /no-such-page
[360,360] 110  <- /checkout
[360,360] 110  <- /login
wordmark at 1440: 140
--- status codes
/ -> 200
/no-such-page -> 404
/product/no-such-slug -> 404
--- header hide/return under keyboard (1440x700, /no-such-page scrolled to 600)
header bottom after scrolling down => 0
after Tab: active "momus collective, home", header bottom => 61
--- skip link / main landmarks
grep -i "skip to" app components   -> (none)
storefront pages without <main      -> (none)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | No new input path. The error page doesn't render `error.message`. |
| 2. Efficiency | pass, EFF-08 not verified | Route entrance and badge bump are CSS. The header uses `motion`, already loaded. |
| 3. DRY and layering | pass | Nav links and classes are defined once (`site-nav-links.ts`) and shared by the header, footer and menu; input styles are defined once (`ui/input.ts`). |
| 4. Tests | pass | 7 shell tests. Two known-failure runs and the exit-test stabilisation are recorded in the T-606 change log. |
| 5. Spec conformance | 1 minor | Finding 1. PRD wordmark 110/140px holds; no horizontal scroll at 360px on 6 pages; missing pages answer 404 (D-113). |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | |
| 7. Client contract and acceptance | pass | No API change. |
