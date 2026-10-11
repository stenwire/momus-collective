# Verification Report

**Milestone:** M4 - Cart, Checkout and Payment
**Scope:** Completion audit of all of M4 (T-401..T-421) at `8238c55` on
`m4-cart-checkout-and-payment`. Covers the cart, checkout, delivery fees and
promo codes, Paystack start/verify and webhook, order creation, tracking,
confirmation page and email, order history and the wishlist. Also covers the
cross-cutting checks this code touches: authz, PII, secrets, query counts,
DRY-07, both suites and the scope greps.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 3
**Minor:** 4
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm --dir frontend build` was not run
here because it writes `.next/`, which an audit may not do); BLD-07 and
CI-SEC-01..05 (the branch is not pushed yet, so there is no workflow run for
this tip; Ruff `S` was run locally over the M4 apps instead, see below); EFF-08
(Lighthouse not run).

PASS means there are zero blockers. It does **not** mean M4 is complete:
DoD 7 is still `[ ]`, and T-420 and T-421 are open behind blockers B-011 and
B-012 (finding 3).

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | 1. Security (SEC-07) | `backend/orders/checkout.py:117-118`, `backend/promocodes/services.py:62-78` | Promo limits (`max_uses`, `max_uses_per_user`) are enforced only by an unlocked `check()` when the quote is built and the session opens. At order creation, `record_use` counts the use without enforcing the limits: it only flags the order in `notes`. Concurrent checkouts can therefore exceed a code's limits. So can one customer who opens several sessions with a one-per-customer code. Each extra use still needs its own paid order and is flagged, and D-086 chose this trade knowingly. But the redemption-time re-check SEC-07 asks for does not refuse anything. | Reserve the use before payment. When a session opens, lock the `PromoCode` row and count both recorded redemptions and pending, unexpired sessions holding the code. Keep `record_use` as the post-payment backstop. |
| 2 | major | 2. Efficiency (EFF-07) | `backend/orders/webhooks.py:47-48` | The webhook settles and fulfils inline: order, items, promo use and cart clear all run in the request. The PRD's tech stack names webhook processing as a Celery task, and no Decisions row records the departure. The heavy parts (print files, thumbnails, email) do run in Celery (`orders.tasks.order_paid`). | After the signature check, queue `settle` for `charge.success` and return 200. `settle` is already idempotent and row-locked. Alternatively, record a decision that inline settlement is deliberate. The browser's `checkout/verify` must stay synchronous either way. |
| 3 | major | 7. Acceptance (API-06) | `docs/MILESTONES.md` M4 DoD 7; `docs/TODO.md` T-420, T-421 | DoD 7 is unproven: USSD completion fails inside Paystack's test environment (B-011, T-420). Live delivery through Resend's real API is unproven because no key is configured (B-012, T-421). The tests check the backend against Resend's API contract. | Already queued: T-420 (B-011) and T-421 (B-012). No new task. |
| 4 | minor | 4. Tests (naming) | `backend/orders/tests/test_delivery.py:132`, `backend/orders/tests/test_fulfilment.py:211`, `backend/carts/tests/test_cart_api.py:195` | M4's admin-boundary tests (401 anonymous, 403 customer) and the cart's query-count test exist and pass, but the skill's proof selectors don't pick them up. `-k authz` selects 2 tests; `-k num_queries` selects 3 of the 5 list endpoints' query tests. | Rename them to include `authz` and `num_queries`. |
| 5 | minor | 3. DRY (DRY-01) | `backend/orders/tasks.py:53`, `backend/orders/serializers.py:85` | The email computes each line total itself, where `_item_payload` already does. | Build the email's lines from `_item_payload`. |
| 6 | minor | 3. DRY (dead code) | `backend/promocodes/services.py:49-59` | Since D-086, no production code calls `redeem`. Its docstring says it is "Called inside the order's transaction", which is no longer true. Only `promocodes/tests` exercise it. | Remove it and its tests, or reuse its lock for finding 1's reservation. |
| 7 | minor | 3. DRY (DRY-04) | `frontend/src/lib/orders/types.ts:44-50` | The customer-facing pipeline restates five statuses and their labels in TypeScript ("Shirt acquired", where the backend enum says "Shirt Acquired"). It doesn't read them from the API, so an M5 change to the enum would need a matching edit here. | Expose the ordered pipeline (status, label) from the API and render from it. |

## Commands run

```
$ git rev-parse --short HEAD && git branch --show-current
8238c55
m4-cart-checkout-and-payment

$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv
$ uv run pytest -q
435 passed, 5 warnings in 44.71s
$ uv run pytest -q -k webhook
14 passed, 421 deselected, 1 warning in 1.42s
$ uv run pytest -q -k authz
2 passed, 433 deselected, 1 warning in 1.14s
$ uv run pytest -q -k num_queries
3 passed, 432 deselected, 1 warning in 1.41s
$ uv run ruff check . && uv run ruff format --check .
All checks passed!
150 files already formatted
$ uv run python manage.py check && uv run python manage.py makemigrations --check --dry-run
System check identified no issues (0 silenced).
No changes detected
$ uv run ruff check --select S orders carts promocodes config/email.py designs --exclude '**/tests/**' --output-format concise
All checks passed!

$ pnpm --dir frontend test
 Test Files  36 passed (36)
      Tests  194 passed (194)
$ pnpm --dir frontend typecheck
✓ Types generated successfully
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
(exit 0)

$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
backend/orders/tests/test_payment.py:23:    settings.PAYSTACK_SECRET_KEY = "sk_test_local"
backend/orders/tests/test_payment.py:99:    settings.PAYSTACK_SECRET_KEY = ""
backend/orders/tests/test_payment.py:176:        "auth": "Bearer sk_test_local",
backend/orders/tests/test_fulfilment.py:21:SECRET = "sk_test_fulfil"
backend/orders/tests/test_webhook.py:14:SECRET = "sk_test_webhook"
backend/orders/tests/test_webhook.py:72:        resp = post(body, sign(body, secret="sk_test_someone_else"))
backend/orders/tests/test_webhook.py:86:    settings.PAYSTACK_SECRET_KEY = ""
(test fixtures only; not keys)
$ rg -n 'env\("(PAYSTACK_SECRET_KEY|PAYSTACK_PUBLIC_KEY|RESEND_API_KEY|DATABASE_URL|REDIS_URL)"' backend/config/settings.py
77:REDIS_URL = env("REDIS_URL")
174:PAYSTACK_SECRET_KEY = env("PAYSTACK_SECRET_KEY")
175:PAYSTACK_PUBLIC_KEY = env("PAYSTACK_PUBLIC_KEY")
183:RESEND_API_KEY = env("RESEND_API_KEY")
$ git check-ignore -v backend/.env
.gitignore:20:.env	backend/.env
$ git log -p main..HEAD | rg -c "sk_(test|live)_[0-9a-f]{40}|pk_(test|live)_[0-9a-f]{40}|re_[A-Za-z0-9]{20,}"
(no output, exit 1: no key-shaped strings in the branch history)

$ rg -n "logger\.|logging\.|print\(" backend/orders backend/carts backend/promocodes backend/config/email.py backend/designs --glob '!**/tests/**'
(no output)
$ rg -n "console\.(log|info|debug)" frontend/src --glob '!*.test.*'
(no output)

PRO-01..08 greps (each with --glob '!*.md'): no hits except PRO-03's
`currency`, which matches only NGN-only checks that reject other currencies:
backend/orders/payments.py:71:            or paystack_data.get("currency") != "NGN"
backend/orders/views.py:137:    (status, amount and currency) settles the session."""
frontend/src/lib/format.ts:2:  style: "currency",
frontend/src/lib/format.ts:3:  currency: "NGN",
plus test fixtures in backend/orders/tests/ (one asserts a USD payment is refused).

DRY-07 scan (consecutive #/ // comment lines, /* */ blocks, Python docstrings)
over every .py/.ts/.tsx/.yml file changed on the branch:
files scanned: 111
DRY-07 violations: 0
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass, 1 major | SEC-01/02: `webhooks.py:34-36` checks HMAC-SHA512 over the raw body with `compare_digest` and returns 401 before any query; tests prove zero queries on rejection. SEC-04/05: `admin/delivery-settings/` and the order print file use `IsStaffUser`, tested 401/403. SEC-06: totals come only from `orders/checkout.py`, and `settle` checks Paystack's amount and currency against the frozen session. SEC-11: keys read with no default; `.env` ignored. SEC-13: tracking by a 256-bit token; the order number opens nothing. SEC-14: no PII logged; the address appears only on the owner-scoped history endpoint, never on tracking. SEC-15: print files are staff-only, email thumbnails token-gated. SEC-07: finding 1. |
| 2. Efficiency | pass, 1 major | Cart, history, tracking and wishlist each have a constant-query test, with known-failure runs logged per task. Print files, thumbnails and email run in Celery after commit. EFF-07's webhook processing: finding 2. EFF-08: not verified. |
| 3. DRY and layering | pass, 3 minor | One quote module, one delivery rule (`orders/delivery.py`, admin-edited), one `add_line` behind add, merge and wishlist move. DRY-07 0 violations. Findings 5-7. |
| 4. Tests | pass, 1 minor | Backend `435 passed`, frontend `194 passed`. TST-02: success, decline and retry, signature accept and reject, replay, race, amount mismatch. Finding 4. |
| 5. Spec conformance | pass | SPC-11 guest checkout, SPC-12 merge, SPC-13 `MOM-YYYYMMDD-NNN`, SPC-14 integer kobo, SPC-16 44px targets and 360px pages checked live per task, SPC-17 alt text on thumbnails. FR-CART-06's admin notification on payment is scheduled as T-501 (M5), not M4. |
| 6. Build and types | pass (partial) | Typecheck, lint, ruff, Django checks and migrations clean, from `backend/.venv`. BLD-01, BLD-07 and CI-SEC: not verified, see header. |
| 7. Client contract and acceptance | pass, 1 major | New routes are all under `/api/v1/`; changes are additive (`checkout/verify` gained `order_number` and `tracking_token`). Frontend types match the declared payloads. API-07 retry holds. API-08: the confirmation email fires once per order. API-06: finding 3. |
