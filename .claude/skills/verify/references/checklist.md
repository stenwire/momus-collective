# Verification checklist — momus collective storefront

Every check carries a provenance tag. A check with no tag does not belong here.

- `[prd]` — stated in `momus collective — Storefront PRD.md`. The section is cited.
- `[code]` — an existing convention confirmed by opening the file. Cited `file:line`.
- `[user]` — the user decided it during scaffolding. What they chose is cited.

At scaffold time there are **no `[code]` checks**: the project was greenfield and
there was no code to cite a convention from. As the build lands, a later scaffold
or retarget run may add them. Do not invent one.

Effort markers: `read` means open the file and confirm. `run` means execute the
command. Every `run` command below was executed during scaffolding, and all of
them reported `cannot run` because nothing is built yet — see the Blockers table
in `docs/TODO.md`. They become live as M0 lands.

---

## 1. Security and input trust

| ID | Check | Source | Effort |
|---|---|---|---|
| SEC-01 | The Paystack webhook computes HMAC-SHA512 over the **raw request body** with the Paystack secret key and compares it to `x-paystack-signature` in constant time (`hmac.compare_digest`). A missing or mismatched signature returns `401`. | `[user]` chose "Verify HMAC-SHA512 signature, reject 401" | read |
| SEC-02 | The signature check runs **before** any order state is read or written. Parsing the body into an order and verifying afterwards fails this check even if the verification is present. | `[user]`, same decision | read |
| SEC-03 | Webhook rejection is covered by tests for both an unsigned request and a wrong-signature request. | `[user]`, same decision | run: `cd backend && uv run pytest -q -k webhook` |
| SEC-04 | Every route under `/api/v1/admin/` declares an explicit DRF permission class keyed on `is_staff`. No admin route relies on an implicit default. | `[user]` chose "is_staff flag, 403 on non-admin"; `[prd]` NFR-04 "Admin panel accessible only to authenticated admin users" | read |
| SEC-05 | An authenticated non-admin receives `403` and an anonymous request `401` on admin endpoints, covered by tests. | `[user]`, same decision | run: `cd backend && uv run pytest -q -k authz` |
| SEC-06 | Order totals, item prices, and discounts are recomputed server-side from server-held values. A `price` or `total` field arriving in a request body is validated or ignored, never trusted. | `[prd]` FR-CART-06, Data Models (`Order.subtotal/total`) | read |
| SEC-07 | Promo code application re-checks expiry, `max_uses`, `max_uses_per_user`, and `min_order_value` server-side at redemption time, not only at display time. | `[prd]` FR-CART-07, `PromoCode` model | read |
| SEC-08 | Rate limiting is applied to login, registration, and password reset endpoints. | `[prd]` NFR-04 "Rate limiting on auth endpoints ... to prevent brute force" | read |
| SEC-09 | CSRF protection is active on all form-handling endpoints. | `[prd]` NFR-04 "CSRF protection on all forms" | read |
| SEC-10 | User-generated content — custom design text (80 char max), review text (500 char max) — is length-validated and escaped on render. Design text reaching the canvas or a generated file is sanitized. | `[prd]` NFR-04 "Input sanitization on all user-generated content", FR-DES-03, FR-REV-01 | read |
| SEC-11 | No secret is committed. `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `REDIS_URL` are read from the environment with no hardcoded fallback default. | `[prd]` Tech Stack; NFR-04 | run: `rg -n "sk_live\|sk_test\|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'` |
| SEC-12 | `DEBUG` is `False` by default and only enabled via environment. `ALLOWED_HOSTS` is not `["*"]` in a production path. | `[prd]` NFR-04 "All traffic over HTTPS" | read |
| SEC-13 | A guest order-tracking link is unguessable (signed token or UUID), not a sequential order number. `MOM-20260926-001` is enumerable by design and must not be the only credential. | `[prd]` FR-CART-05 "link to track their order", `Order.order_number` format | read |
| SEC-14 | Customer PII (phone, email, shipping address) is not written to application logs, and is returned only on endpoints scoped to the owning user or an admin. | `[prd]` FR-ADM-01, Data Models (`User`, `Address`) | read |
| SEC-15 | Design files and uploaded assets are served from storage with either a signed URL or an access check. An order's design file is not readable by URL guess. | `[prd]` FR-DES-09, FR-ADM-03 "design file download" | read |

## 2. Efficiency

| ID | Check | Source | Effort |
|---|---|---|---|
| EFF-01 | The product grid endpoint issues a **constant** number of queries regardless of page size, with `select_related` on category and `prefetch_related` on tags/collections. | `[user]` chose "Constant queries per grid page, asserted in a test" | read |
| EFF-02 | Every list endpoint ships with an `assertNumQueries` test that would fail on an N+1 regression. | `[user]`, same decision | run: `cd backend && uv run pytest -q -k num_queries` |
| EFF-03 | `Product.total_orders` and `Product.avg_rating` are read from the denormalised columns, not recomputed per-card with an aggregate query. | `[user]` EFF-01 rationale; `[prd]` Data Models (`Product.total_orders`, `avg_rating`) | read |
| EFF-04 | The shop page loads 20 products and paginates in batches of 20 via infinite scroll. The grid does not render the full catalog at once. | `[prd]` FR-CAT-07; NFR-02 "virtual scrolling or pagination to avoid rendering hundreds of items" | read |
| EFF-05 | Search input is debounced at 300ms. | `[prd]` FR-CAT-03 "debounced at 300ms" | read |
| EFF-06 | Images are lazy-loaded and served as WebP. | `[prd]` NFR-02 "Images lazy-loaded and served in WebP format" | read |
| EFF-07 | Email sending, design file generation, and webhook processing run as Celery tasks, not inline in the request path. | `[prd]` Tech Stack "Celery + Redis for async tasks (email sending, design file generation, webhook processing)" | read |
| EFF-08 | Lighthouse performance is above 80 on the homepage and a product page. | `[prd]` NFR-02 "Lighthouse performance score above 80" | run: Lighthouse against a built preview |

## 3. DRY and layering

| ID | Check | Source | Effort |
|---|---|---|---|
| DRY-01 | Price and total arithmetic lives in one server-side module. The frontend may display a total; it may not be the second implementation of how one is computed. | `[prd]` FR-CART-02, FR-CART-08, FR-DES-11 | read |
| DRY-02 | The delivery-fee rule (Lagos within, Lagos cross, Outside Lagos, free-delivery threshold) is defined once and admin-configurable, not duplicated between checkout and order creation. | `[prd]` FR-CART-08 | read |
| DRY-03 | The custom-design pricing formula (blank cost + print cost + margin, varying by shirt color) is defined once server-side. | `[prd]` FR-DES-11 "The admin sets these values" | read |
| DRY-04 | Order status values exist as one enum shared by the model, the admin board, and the notification copy. The six statuses are not restated as string literals per call site. | `[prd]` `Order.status` enum; FR-ADM-02 | read |
| DRY-05 | Views stay thin: business rules live in services or model methods, not in DRF view bodies. | `[prd]` Tech Stack (Django + DRF) | read |
| DRY-06 | The shirt color list and the text color palette each have a single definition shared by the design tool and the backend validator. | `[prd]` FR-DES-02 (7 colors), FR-DES-05 (8-10 colors) | read |
| DRY-07 | No comment block exceeds 5 lines, and no comment restates what the code plainly does. Applies to TypeScript, Python and docstrings. Severity `major` — a violation is fixed before the milestone is called done. | `[user]` "Code comment MUST be as minimal as possible, with a MAX of 5 lines", raised from `minor` at the user's instruction | read |

## 4. Tests

| ID | Check | Source | Effort |
|---|---|---|---|
| TST-01 | The suite collects a non-zero number of tests. `collected 0 items` is a failure, never a pass. | `[user]` chose "Non-zero collected + cover payment/authz paths" | run: `cd backend && uv run pytest -q` |
| TST-02 | Every payment path has a test: successful charge, failed charge with retry, webhook signature accept, webhook signature reject, duplicate/replayed webhook. | `[user]`, same decision; `[prd]` FR-CART-06 | read |
| TST-03 | Every authentication path has a test: registration, duplicate-email rejection, login, password reset, token refresh, Google OAuth. | `[user]`, same decision; `[prd]` FR-USR-01, FR-USR-02 | read |
| TST-04 | Every admin-authorization path has a test asserting `401` anonymous and `403` authenticated non-admin. | `[user]`, same decision | read |
| TST-05 | The frontend suite runs and collects a non-zero number of tests. | `[user]`, same decision | run: `pnpm --dir frontend test` |
| TST-06 | No test asserts only that a call did not raise. A test that would pass against a stubbed-out implementation is not covering the path. | `[user]` TST-01 rationale ("targets the code where a bug is expensive") | read |

## 5. Spec conformance

| ID | Check | Source | Effort |
|---|---|---|---|
| SPC-01 | The 11 launch categories exist exactly as named: Philosophy, Self-Aware, Tech, Geopolitics, Pop Culture, Dad Jokes, Engineering, Relationships, Religion, Hot Takes, Chaotic. | `[prd]` FR-CAT-02 | read |
| SPC-02 | Size options are exactly S, M, L, XL, XXL. | `[prd]` FR-CAT-05 | read |
| SPC-03 | Shirt colors are exactly Black, White, Navy, Charcoal, Maroon, Forest Green, Deep Purple. | `[prd]` FR-DES-02 | read |
| SPC-04 | Custom design text is capped at 80 characters with a live counter. | `[prd]` FR-DES-03 | read |
| SPC-05 | Text placement offers exactly Upper Chest, Center Chest (default), Lower Chest, Full Front. Back-of-shirt and free-drag are absent. | `[prd]` FR-DES-06 | read |
| SPC-06 | Generated design files are at least 300 DPI with a transparent background. | `[prd]` FR-DES-09 "print-ready resolution of 300 DPI minimum" | read |
| SPC-07 | Order status pipeline matches the enum exactly: paid, moderation, shirt_acquired, printed, out_for_delivery, delivered, cancelled, refunded. | `[prd]` `Order.status`; Overview pipeline | read |
| SPC-08 | A custom-design order enters the moderation queue before fulfillment, and approval moves it to Shirt Acquired. | `[prd]` FR-ADM-07 | read |
| SPC-09 | Only verified purchasers can leave a review, and reviews carry the Verified Purchase badge. | `[prd]` FR-REV-02 "Only verified purchasers can leave reviews" | read |
| SPC-10 | Review text is capped at 500 characters and the rating is 1-5. | `[prd]` FR-REV-01 | read |
| SPC-11 | Guest checkout completes without an account, capturing email and phone. | `[prd]` FR-CART-05 | read |
| SPC-12 | A guest's localStorage cart **merges** into the server cart on login rather than overwriting it. | `[prd]` FR-CART-01 "merges with their server-side cart" | read |
| SPC-13 | Order numbers follow the `MOM-YYYYMMDD-NNN` shape. | `[prd]` Data Models (`Order.order_number`, e.g. `MOM-20260926-001`) | read |
| SPC-14 | Prices are NGN and stored as integer minor units or `Decimal`, never float. | `[prd]` FR-CAT-01 "price in NGN"; Data Models | read |
| SPC-15 | Brand assets resolve at the paths the PRD names: `assets/wordmark.png`, `assets/avatar.png`, `assets/mascot-human.png`, `assets/mascot-raven.png`. | `[prd]` Brand Assets; `[user]` chose "PRD wins — convert to .png in M0" | run: `ls -l assets/*.png` |
| SPC-16 | Touch targets are at least 44x44px and every feature works at 360px width. | `[prd]` NFR-01 | read |
| SPC-17 | Alt text is present on every product image; semantic HTML and keyboard navigation are in place. | `[prd]` NFR-05 | read |

### Prohibited scope

The PRD's Out of Scope list. These are the checks a later run is most likely to
violate by being helpful.

**Two narrowings learned while testing these greps during scaffolding, both
necessary:**

- **Exclude the PRD itself.** `rg -nw tenant` matches the PRD's own
  `single-tenant` prose on lines 5, 11 and 237 — `-w` treats the hyphen as a word
  boundary. A check that fires on the document prohibiting the feature is a check
  that gets ignored. Every grep below excludes `*.md`.
- **`subscription` is unusable as a bare word.** FR-NOT-04's newsletter and the
  `NewsletterSubscriber` model make "subscribe"/"subscriber" legitimate
  vocabulary in this codebase. PRO-07 targets recurring-billing identifiers
  instead.

| ID | Check | Source | Effort |
|---|---|---|---|
| PRO-01 | No POD fulfillment API integration. | `[prd]` Out of Scope | run: `rg -nwi "printful\|printify\|afrprint\|jaraprint" --glob '!*.md'` |
| PRO-02 | No multi-tenant or storefront-builder code. | `[prd]` Out of Scope | run: `rg -nw "tenant\|tenant_id\|storefront_builder" --glob '!*.md'` |
| PRO-03 | No multi-currency or international shipping. | `[prd]` Out of Scope | run: `rg -nw "currency\|exchange_rate\|USD\|EUR\|GBP" --glob '!*.md'` |
| PRO-04 | No full canvas editing: no image upload into the design tool, no layers, no free-drag, no back placement. | `[prd]` Out of Scope; FR-DES-06 | run: `rg -nw "layers\|freeDrag\|free_drag\|backPlacement\|back_placement\|imageUpload" --glob '!*.md'` |
| PRO-05 | No inventory management. | `[prd]` Out of Scope | run: `rg -nw "inventory\|stock_count\|stock_level\|reorder_point" --glob '!*.md'` |
| PRO-06 | No abandoned-cart email. FR-NOT-05 is marked Phase 2 in its own heading; the gap in the FR-NOT sequence is intentional. | `[prd]` FR-NOT-05, Out of Scope | run: `rg -nwi "abandoned_cart\|abandonedCart\|cart_reminder" --glob '!*.md'` |
| PRO-07 | No referral/affiliate program and no subscription billing. Targets recurring-billing identifiers, not the word "subscribe" — the newsletter legitimately uses that. | `[prd]` Out of Scope; narrowing confirmed against FR-NOT-04 | run: `rg -nw "referral_code\|affiliate\|subscription_plan\|billing_cycle\|recurring_charge" --glob '!*.md'` |
| PRO-08 | No Instagram/TikTok shop integration, no multi-language support, no A/B testing, no native mobile app. | `[prd]` Out of Scope | run: `rg -nwi "instagram_shop\|tiktok_shop\|i18n\|gettext\|ab_test\|experiment_variant" --glob '!*.md'` |

**Identifier greps are blind to English.** A retired capability described in
prose — in an API description, a generated OpenAPI schema, admin help text, or
marketing copy — passes every grep above forever. When the project serves a
public contract, grep the generated output separately for the prose names of
these features.

## 6. Build and types

| ID | Check | Source | Effort |
|---|---|---|---|
| BLD-01 | The frontend builds clean. | `[prd]` Tech Stack (Next.js) | run: `pnpm --dir frontend build` |
| BLD-02 | TypeScript typechecks with no errors and no new `any` on a public boundary. | `[prd]` Tech Stack "TypeScript" | run: `pnpm --dir frontend typecheck` |
| BLD-03 | Frontend lint passes. | `[prd]` Tech Stack | run: `pnpm --dir frontend lint` |
| BLD-04 | Backend lint and format pass, over a non-zero number of files. | `[prd]` Tech Stack (Python 3.12+) | run: `cd backend && uv run ruff check . && uv run ruff format --check .` |
| BLD-05 | Django system checks pass and no migration is missing. | `[prd]` Tech Stack (Django) | run: `cd backend && uv run python manage.py check && uv run python manage.py makemigrations --check --dry-run` |
| BLD-06 | The backend command used `backend/`'s own environment. A pass from a borrowed virtualenv is not a pass — during scaffolding a bare `uv run` resolved to an unrelated project's env. | `[user]` monorepo layout decision; observed during scaffolding | read |
| BLD-07 | CI runs the full set on every push. | `[prd]` Tech Stack "GitHub Actions for automated testing and deployment" | run: the workflow run |

## 7. Client contract and acceptance

| ID | Check | Source | Effort |
|---|---|---|---|
| API-01 | All DRF routes live under `/api/v1/`. | `[user]` chose "/api/v1/ prefix, additive-only within a version" | read |
| API-02 | No breaking change has landed within `v1`: no removed or renamed field, no tightened validation on an existing field, no changed status code. Additive changes are fine. | `[user]`, same decision | read |
| API-03 | The frontend consumes no field the serializer does not declare. | `[user]` API-02 rationale | read |
| API-04 | Public pages (homepage, product, category) are server-rendered, with unique meta tags and JSON-LD structured data per product. | `[prd]` NFR-03 | read |
| API-05 | URL structure matches: `/shop`, `/shop/<category>`, `/product/<slug>`, `/design`. | `[prd]` NFR-03 | read |
| API-06 | Every milestone's Definition-of-Done rows in `docs/MILESTONES.md` are `[x]` with pasted proof in `docs/TODO.md`. | `[prd]` delivery structure; scaffolding process | read |
| API-07 | Failed payments surface a clear error and allow retry. | `[prd]` FR-CART-06 | read |
| API-08 | Order confirmation email and status-update notifications fire on the transitions the PRD names, respecting the customer's `notification_pref`. | `[prd]` FR-NOT-01, FR-NOT-02, `User.notification_pref` | read |

---

## Gaps: checks this checklist does not cover

**None at scaffold time.** The five dimensions that lacked a derivable rule —
admin authorization boundary, webhook signature policy, test threshold, query
budget, and API versioning — were put to the user during scaffolding and
answered. Each became a `[user]`-tagged check above rather than an unanswered
question here.

If a later run encounters a dimension where no check can be traced to `[prd]`,
`[code]`, or `[user]`, it belongs in this table as a question — not in the
checklist as a plausible-looking check.

| Dimension | Question | Why it matters |
|---|---|---|
| — | — | — |
