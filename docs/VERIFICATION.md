# Verification Report

**Milestone:** M4 - Cart, Checkout and Payment
**Scope:** Checkpoint audit, not the completion gate: T-401..T-405 at
`f2b3dd5` on `m4-cart-checkout-and-payment` (cart API and services, one
cart per user, guest/server cart store and `useCart`, guest-to-user merge,
`CartLines`, bag button and drawer, `/checkout` with shipping form and
checkout options, and the M2 `@modal/[...catchAll]` fix). T-406..T-417 are
not built yet and are out of scope here; payment, webhook, orders, promo,
delivery fees, confirmation, history and wishlist are therefore not audited.
Cross-cutting checks those five tasks touch: authz on cart endpoints,
server-side pricing, query counts, DRY-07, both suites, scope greps.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 0
**Minor:** 2
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm build` writes `.next/`; the T-405
implement run built every route). BLD-07 (branch not pushed). EFF-08.
SEC-01/02/03 (webhook) and SEC-06/07 at checkout (T-407..T-412 not built).
Everything listed as not yet built above.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | 7. Client contract and acceptance | `frontend/src/components/cart/cart-sync.tsx:21-25` | After a merge, the guest store is cleared and the server's `skipped` list (`api.ts:46` types it) is ignored, so a guest line that could not merge, e.g. a product archived since it was bagged, disappears without a word. | T-418: tell the customer which items could not be carried over and why. |
| 2 | minor | 5. Spec conformance (FR-CART-02) | `backend/carts/serializers.py` (`get_product`), `backend/carts/services.py:24-28` | An archived product already in a server or guest cart still shows as an ordinary priced line; the cart exposes no availability, so the customer learns only at checkout. Checkout itself (T-407) is not built yet, so nothing can be bought today; it must refuse such lines. | T-419: expose availability on cart lines and mark unavailable ones; T-407 rejects them at checkout. |

## Commands run

```
$ git status --porcelain
(clean)
$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ cd backend && uv run pytest -q
324 passed, 1 warning in 38.19s
$ cd backend && uv run pytest -q carts orders
51 passed, 1 warning in 6.99s
$ cd backend && uv run ruff check .
All checks passed!
$ cd backend && uv run ruff format --check .
127 files already formatted
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).
$ cd backend && uv run python manage.py makemigrations --check --dry-run
No changes detected
$ pnpm --dir frontend test        (pnpm 11.21.0 via npx)
 Test Files  28 passed (28)
      Tests  152 passed (152)
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
$ DRY-07 scan over the 39 .py/.ts/.tsx files changed since main
39 files; violations: 0
$ grep for merge feedback and cart availability
cart-sync.tsx:21-25  mergeGuestCart(lines).then(cart => { clear(); setQueryData(...) })
skipped: referenced only in the MergeResult type (api.ts:46)
is_active exposed in cart line: 0
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | Every cart endpoint is `IsAuthenticated`; another user's line or design 404s or is refused; cookie-authenticated writes carry CSRF. Prices are recomputed from server data on every read, and a client `unit_price` is ignored (tested). |
| 2. Efficiency | pass | Cart reads are constant-query (tested, with a known-failure run in T-401). Merge loops at most 50 lines, by design. |
| 3. DRY and layering | pass | One `add_line` serves add and merge; one `unit_price`. `SIZES` is mirrored between `catalog/options.py` and `lib/constants.ts` with a comment; DRY-06 covers colours only. DRY-07 0 violations. |
| 4. Tests | pass | Backend `324 passed`, frontend `152 passed`. Merge non-destructiveness, line caps, ownership and query counts are all tested. |
| 5. Spec conformance | pass, 1 minor | FR-CART-01..04 hold as built: persistence (live), merge (live), line contents, drawer/sheet, single-page checkout. Finding 2. |
| 6. Build and types | pass (partial) | Typecheck, lint, ruff, checks and migrations clean. BLD-01/07 as in the header. |
| 7. Client contract and acceptance | pass, 1 minor | All new routes under `/api/v1/`; additive only. Finding 1. |
