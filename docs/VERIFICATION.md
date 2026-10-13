# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial, pre-commit audit of M6 so far, not a completion audit: T-600 (trackers, `design-system/momus-collective/MASTER.md`) and T-601's uncommitted diff (`globals.css` tokens and base layer, `lib/fonts.ts`, `layout.tsx`, `manifest.ts`, `lib/design/fonts.ts`, `vitest.setup.ts`, `theme.test.ts`) on `m6-storefront-redesign` at `36bc88b` plus the working tree. Also audited: the cross-cutting checks that diff touches (NFR-01, NFR-02, NFR-05, DRY-07, build and types, tests) and the whole-tree SEC-11 and prohibited-scope greps. T-602..T-614 are not built, so most of M6's Definition of Done is untested by design.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 2
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01 (frontend build).** This skill may not run `pnpm build`, because it writes `.next/`.
- **EFF-08 (Lighthouse).** It needs a built preview; it is scheduled in T-613.
- **BLD-04, BLD-05 and BLD-06 (backend).** M6 has changed no backend file.
- **BLD-07 (CI).** The branch has not been pushed.
- **SEC-01..SEC-10 and SEC-12..SEC-15, and EFF-01..EFF-05 and EFF-07.** These are backend read checks; M6 has touched no backend path.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | Spec conformance (SPC-17, NFR-05) | `frontend/src/components/auth/form-field.tsx:10` (also `newsletter-form.tsx:41`, `design/slogan-input.tsx:31`, `design/save-design.tsx:112`, `catalog/search-input.tsx:16`, `catalog/sort-select.tsx:22`, `catalog/product-reviews.tsx:79`, `checkout/checkout-page.tsx:178,223`) | Storefront inputs carry `focus:outline-none`. That utility beats T-601's base-layer laurel `:focus-visible` ring, so these inputs show only an amber border change on focus. Focus stays visible, so this is not a WCAG failure, but it falls short of M6 DoD 6's ring. | Drop `focus:outline-none` from storefront inputs and give them the token border (T-615). Admin inputs are out of scope (D-109). |
| 2 | minor | Efficiency (EFF-08, NFR-02) | `frontend/src/components/cart/cart-lines.tsx:9` | `CartDrawer` is mounted in the root layout and imports `ShirtCanvas`, which imports `lib/design/fonts`. Every route therefore preloads all the design-tool fonts. The built `index.html` preloads 11 woff2 files totalling 181,652 bytes, though the homepage draws no custom design. This predates M6 (T-403), but M6 DoD 9 depends on it. | Load `ShirtCanvas` in cart lines with `next/dynamic`, or stop preloading the design-only fonts, so the fonts arrive only when a custom line renders (T-616). |

## Commands run

```
$ git diff --stat HEAD && git ls-files --others --exclude-standard
 docs/TODO.md                     |  3 +-
 frontend/src/app/globals.css     | 62 ++++++++++++++++++++++++++++++++++++++++
 frontend/src/app/layout.tsx      | 23 ++++++---------
 frontend/src/app/manifest.ts     |  4 +--
 frontend/src/lib/design/fonts.ts |  5 +---
 frontend/vitest.setup.ts         |  4 +--
 6 files changed, 78 insertions(+), 23 deletions(-)
frontend/src/app/theme.test.ts
frontend/src/lib/fonts.ts

--- TST-05 (cd frontend && corepack pnpm test)
 Test Files  50 passed (50)
      Tests  265 passed (265)
--- BLD-02 (corepack pnpm typecheck)
typecheck exit 0
--- BLD-03 (corepack pnpm lint)
$ eslint --max-warnings 0
lint exit 0

--- SEC-11
backend/orders/tests/test_payment.py:23:    settings.PAYSTACK_SECRET_KEY = "sk_test_local"
backend/orders/tests/test_payment.py:99:    settings.PAYSTACK_SECRET_KEY = ""
backend/orders/tests/test_payment.py:176:        "auth": "Bearer sk_test_local",
backend/orders/tests/test_webhook.py:14:SECRET = "sk_test_webhook"
backend/orders/tests/test_webhook.py:73:        resp = post(body, sign(body, secret="sk_test_someone_else"))
backend/orders/tests/test_webhook.py:87:    settings.PAYSTACK_SECRET_KEY = ""
backend/orders/tests/test_fulfilment.py:21:SECRET = "sk_test_fulfil"
(test fixtures with placeholder values, not real keys)
--- PRO-01  (no matches)
--- PRO-02  (no matches)
--- PRO-03
frontend/src/lib/format.ts:2:  style: "currency",
frontend/src/lib/format.ts:3:  currency: "NGN",
frontend/src/lib/format.ts:8:  style: "currency",
frontend/src/lib/format.ts:9:  currency: "NGN",
backend/notifications/tests/test_admin_alerts.py:223:            "currency": "NGN",
(single-currency NGN formatting, not multi-currency)
--- PRO-04..PRO-08  (no matches)

--- DRY-07 (comment blocks over 5 lines in the changed files)
done   (none found)

--- Font preloads in the existing build (read-only, from the T-601 /implement build)
11 preload links in .next/server/app/index.html; woff2 sizes:
17844 13128 13820 9792 29296 9552 12004 22296 35680 9464 8596  (= 181,652 bytes)
$ grep -rln "lib/design/fonts" src   -> design/template-picker.tsx, design/font-picker.tsx, design/shirt-canvas.tsx
$ grep import cart-lines.tsx         -> line 9: import { ShirtCanvas } from "../design/shirt-canvas";
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass (SEC-11, CI-SEC not run) | SEC-11 found only test fixtures. The other SEC checks are not verified: M6 touched no backend path. |
| 2. Efficiency | 1 minor; EFF-08 not verified | Finding 2. Lighthouse is in T-613. |
| 3. DRY and layering | pass | DRY-07: no block over 5 lines. Anton and Space Mono are now defined once and shared by the UI and the design tool. |
| 4. Tests | pass | 265 tests, including 13 new token-contrast tests. Their known-failure run is recorded in the T-601 change log. |
| 5. Spec conformance | 1 minor | Finding 1. PRO-01..PRO-08 are clean. The contrast tokens meet AA (DoD 2 is still open until T-613 records the pairs actually in use). |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | The build cannot run under this skill's write rules. |
| 7. Client contract and acceptance | pass | No API change. API-06: M6's DoD rows are open, as expected mid-milestone. |
