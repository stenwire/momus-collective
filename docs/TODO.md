# TODO

Source of truth for task state, alongside `docs/MILESTONES.md`. Both are read in
full at the start of every `/implement` run.

State: `[ ]` not started, `[~]` in progress or blocked, `[x]` done with proof.

**A task is never ticked on inspection.** `[x]` requires pasted output from a
real command in the run that set it.

Task IDs are banded by milestone: T-0xx = M0, T-1xx = M1, T-2xx = M2,
T-3xx = M3, T-4xx = M4, T-5xx = M5. Never reuse a retired ID.

## Queue

| ID | Milestone | Task | Dep | State |
|---|---|---|---|---|
| T-001 | M0 | `git init`, set branch `main`, add `.gitignore` covering `.next/`, `__pycache__/`, `.pytest_cache/`, `.venv/`, `.env`; initial commit | - | [ ] |
| T-002 | M0 | Create monorepo layout: `frontend/`, `backend/`, keep `assets/` at root | T-001 | [ ] |
| T-003 | M0 | Scaffold Next.js 14+ App Router app in `frontend/` with TypeScript and Tailwind; `pnpm --dir frontend build` exits 0 | T-002 | [ ] |
| T-004 | M0 | Add frontend lint and typecheck scripts to `frontend/package.json`; both exit 0 | T-003 | [ ] |
| T-005 | M0 | Add frontend test runner with one real assertion; `pnpm --dir frontend test` collects non-zero and passes | T-004 | [ ] |
| T-006 | M0 | Initialise `backend/` with `uv`, Python 3.12+, Django and DRF; `manage.py check` reports no issues | T-002 | [ ] |
| T-007 | M0 | Prove the backend env resolves inside `backend/` — paste `uv run python -c "import sys; print(sys.prefix)"`. Resolves B-005. | T-006 | [ ] |
| T-008 | M0 | Configure ruff in `backend/`; `ruff check .` passes with no `No Python files found` warning, `ruff format --check .` exits 0 | T-007 | [ ] |
| T-009 | M0 | Add pytest + pytest-django with one real assertion; `uv run pytest -q` collects non-zero and passes | T-007 | [ ] |
| T-010 | M0 | Wire PostgreSQL via `DATABASE_URL` and Redis via `REDIS_URL`; prove both connect | T-009 | [ ] |
| T-011 | M0 | Add Celery with the Redis broker; prove a trivial task executes | T-010 | [ ] |
| T-012 | M0 | Convert the four brand assets from `.jpg` to `.png` at the PRD's paths; `ls -l assets/*.png` lists all four. Resolves B-006. | T-001 | [ ] |
| T-013 | M0 | Write `.env.example` naming every secret with no values: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `REDIS_URL` | T-010 | [ ] |
| T-014 | M0 | GitHub Actions workflow running frontend build/typecheck/lint/test and backend check/ruff/pytest on push; paste the run. Resolves B-001..B-004. | T-005, T-008, T-009 | [ ] |
| T-101 | M1 | Implement User and Address models per the PRD's Data Models section | T-014 | [ ] |
| T-102 | M1 | Implement Category, Product, Collection, CollectionProduct models | T-101 | [ ] |
| T-103 | M1 | Implement SavedDesign, Cart, CartItem models | T-102 | [ ] |
| T-104 | M1 | Implement Order, OrderItem models with the 8-value status enum and JSON address snapshot | T-103 | [ ] |
| T-105 | M1 | Implement Review, PromoCode, NewsletterSubscriber models | T-104 | [ ] |
| T-106 | M1 | Confirm all money fields are Decimal or integer minor units, no float; migrations complete | T-105 | [ ] |
| T-107 | M1 | Mount all DRF routes under `/api/v1/` | T-106 | [ ] |
| T-108 | M1 | Registration with email verification; duplicate email rejected with a clear message; 8-char minimum | T-107 | [ ] |
| T-109 | M1 | JWT login with refresh tokens, 30-day sessions, Remember Me | T-108 | [ ] |
| T-110 | M1 | Google OAuth login setting `auth_provider` | T-109 | [ ] |
| T-111 | M1 | Forgot-password flow emailing a working reset link | T-109 | [ ] |
| T-112 | M1 | `is_staff` DRF permission class; test 401 anonymous and 403 authenticated non-admin | T-109 | [ ] |
| T-113 | M1 | Rate limiting on login, registration and password reset | T-111 | [ ] |
| T-114 | M1 | Saved addresses: multiple per user, one default (FR-USR-06) | T-109 | [ ] |
| T-115 | M1 | Account settings: name, email with re-verification, phone, password, notification_pref (FR-USR-07) | T-114 | [ ] |
| T-201 | M2 | Product list endpoint with `select_related`/`prefetch_related` and an `assertNumQueries` test | T-115 | [ ] |
| T-202 | M2 | Product grid UI, 4 columns desktop / 2 mobile, cards per FR-CAT-01 | T-201 | [ ] |
| T-203 | M2 | Seed the 11 launch categories; filtering with per-category counts (FR-CAT-02) | T-202 | [ ] |
| T-204 | M2 | Search by slogan and category, debounced 300ms, friendly empty state (FR-CAT-03) | T-203 | [ ] |
| T-205 | M2 | Sorting: Newest, Price asc, Price desc, Most Popular (FR-CAT-04) | T-203 | [ ] |
| T-206 | M2 | Product detail: modal on desktop, full page on mobile, sizes S-XXL, related products (FR-CAT-05) | T-205 | [ ] |
| T-207 | M2 | Collections as homepage carousels, many-to-many with products (FR-CAT-06) | T-206 | [ ] |
| T-208 | M2 | Infinite scroll, 20 initial then batches of 20, loading indicator (FR-CAT-07) | T-202 | [ ] |
| T-209 | M2 | Admin product CRUD: create, edit, archive, bulk price, reorder (FR-ADM-04) | T-201 | [ ] |
| T-210 | M2 | Admin category management: create, rename, reorder, archive (FR-ADM-05) | T-209 | [ ] |
| T-211 | M2 | Admin collection management incl. featured flag and display order (FR-ADM-06) | T-210 | [ ] |
| T-212 | M2 | SSR for homepage, product and category pages; unique meta tags; product JSON-LD (NFR-03) | T-206 | [ ] |
| T-213 | M2 | URL structure `/shop`, `/shop/<category>`, `/product/<slug>` (NFR-03) | T-212 | [ ] |
| T-214 | M2 | WebP conversion and lazy loading; Lighthouse above 80 (NFR-02) | T-212 | [ ] |
| T-215 | M2 | Accessibility pass: alt text, keyboard nav, dark-theme contrast (NFR-05) | T-214 | [ ] |
| T-216 | M2 | Homepage brand assets: raven hero, Our Story mascot, wordmark nav at 140px/110px, avatar favicon and PWA icons | T-212 | [ ] |
| T-301 | M3 | Canvas shirt mockup renderer with live re-render (FR-DES-01, FR-DES-07) | T-216 | [ ] |
| T-302 | M3 | Shirt color selection, all 7 colors, instant mockup update (FR-DES-02) | T-301 | [ ] |
| T-303 | M3 | Text input capped at 80 chars with live counter and sanitization (FR-DES-03) | T-301 | [ ] |
| T-304 | M3 | Font selector, 8-10 curated fonts with previews (FR-DES-04) | T-303 | [ ] |
| T-305 | M3 | Text styling: size, color palette, alignment, letter spacing (FR-DES-05) | T-304 | [ ] |
| T-306 | M3 | Placement presets, exactly four, Center Chest default (FR-DES-06) | T-305 | [ ] |
| T-307 | M3 | Preview mode showing a clean mockup without controls (FR-DES-07) | T-306 | [ ] |
| T-308 | M3 | Design save for logged-in users; guest prompted to register (FR-DES-08) | T-307 | [ ] |
| T-309 | M3 | Design file export at 300 DPI minimum, transparent background, with a test asserting resolution (FR-DES-09) | T-308 | [ ] |
| T-310 | M3 | 10-15 templates across the four named styles (FR-DES-10) | T-307 | [ ] |
| T-311 | M3 | Server-side custom pricing: blank + print + margin, varying by shirt color (FR-DES-11) | T-309 | [ ] |
| T-312 | M3 | Saved-design gallery: edit, add to cart, duplicate, delete (FR-USR-04) | T-311 | [ ] |
| T-313 | M3 | Mobile pass at 360px with 44x44px touch targets (NFR-01) | T-312 | [ ] |
| T-401 | M4 | Cart model and endpoints; localStorage for guests, server-side for users (FR-CART-01) | T-313 | [ ] |
| T-402 | M4 | Guest-to-user cart merge on login, non-destructive, with a test (FR-CART-01) | T-401 | [ ] |
| T-403 | M4 | Cart item rendering per FR-CART-02 incl. Custom Design preview | T-402 | [ ] |
| T-404 | M4 | Cart drawer on desktop, bottom sheet on mobile, count badge (FR-CART-03) | T-403 | [ ] |
| T-405 | M4 | Single-page checkout: Shipping, Order Summary, Payment, editable cart (FR-CART-04) | T-404 | [ ] |
| T-406 | M4 | Guest checkout with email and phone, then account-creation offer (FR-CART-05) | T-405 | [ ] |
| T-407 | M4 | Server-side total computation; reject or ignore client-supplied prices, with a test | T-405 | [ ] |
| T-408 | M4 | Delivery fee bands by state with configurable free-delivery threshold (FR-CART-08) | T-407 | [ ] |
| T-409 | M4 | Promo code redemption validating expiry, max uses, per-user uses, minimum order (FR-CART-07) | T-407 | [ ] |
| T-410 | M4 | Paystack Inline integration: card, bank transfer, USSD; clear error and retry on failure (FR-CART-06) | T-408 | [ ] |
| T-411 | M4 | Paystack webhook with HMAC-SHA512 constant-time verification, 401 before any order state touch; tests for unsigned and wrong-signature (FR-CART-06) | T-410 | [ ] |
| T-412 | M4 | Webhook idempotency: a replayed valid payload creates no second order, with a test | T-411 | [ ] |
| T-413 | M4 | Order creation with `MOM-YYYYMMDD-NNN` numbering and JSON address snapshot | T-412 | [ ] |
| T-414 | M4 | Unguessable guest tracking token, not the sequential order number | T-413 | [ ] |
| T-415 | M4 | Confirmation page and order confirmation email via Resend (FR-CART-09, FR-NOT-01) | T-414 | [ ] |
| T-416 | M4 | Order history, reverse chronological, expandable to full detail (FR-USR-03) | T-413 | [ ] |
| T-417 | M4 | Wishlist: heart on product cards, move to cart (FR-USR-05) | T-416 | [ ] |
| T-501 | M5 | Admin order notification: email with design file attached, WhatsApp summary with link (FR-ADM-01) | T-417 | [ ] |
| T-502 | M5 | Kanban order board with drag-to-update status (FR-ADM-02) | T-501 | [ ] |
| T-503 | M5 | Sortable list view alongside the board (FR-ADM-02) | T-502 | [ ] |
| T-504 | M5 | Order detail view with design download, Paystack reference and status timeline (FR-ADM-03) | T-502 | [ ] |
| T-505 | M5 | Design moderation queue; approve moves to Shirt Acquired (FR-ADM-07) | T-504 | [ ] |
| T-506 | M5 | Rejection with reason, customer notified with revise-or-refund (FR-ADM-07, FR-NOT-03) | T-505 | [ ] |
| T-507 | M5 | Customer status-update notifications honouring `notification_pref` (FR-NOT-02) | T-502 | [ ] |
| T-508 | M5 | Analytics dashboard per FR-ADM-08 | T-504 | [ ] |
| T-509 | M5 | Promo code admin with redemption tracking (FR-ADM-09) | T-508 | [ ] |
| T-510 | M5 | Customer list with totals and last order date (FR-ADM-10) | T-508 | [ ] |
| T-511 | M5 | Newsletter capture in footer and homepage, stored in the database (FR-NOT-04) | T-507 | [ ] |
| T-512 | M5 | Reviews restricted to verified purchasers, with badge, 500-char cap, 1-5 rating (FR-REV-01, FR-REV-02) | T-507 | [ ] |
| T-513 | M5 | Review moderation: admin flag and hide (FR-REV-03) | T-512 | [ ] |
| T-514 | M5 | Aggregate rating on card and detail; Top Rated collection (FR-REV-04) | T-512 | [ ] |
| T-515 | M5 | Review prompt email 3 days after Delivered (FR-REV-05) | T-512 | [ ] |
| T-516 | M5 | Audit every admin route for an explicit `is_staff` permission class (NFR-04) | T-510 | [ ] |
| T-517 | M5 | Confirm no customer PII reaches application logs | T-516 | [ ] |
| T-518 | M5 | Load test to 1,000 concurrent users and 500 orders/month (NFR-06) | T-516 | [ ] |
| T-519 | M5 | Daily database backups and weekly asset backups to secondary storage (NFR-07) | T-518 | [ ] |

## Change log

Append only, newest at the bottom. One row per `/implement` run.

| Date | Task | Change | Proof |
|---|---|---|---|
| 2026-09-26 | scaffold | Generated `/implement` and `/verify` skills, `references/checklist.md`, `docs/MILESTONES.md` and `docs/TODO.md` from the PRD | 4 proof commands run, all `cannot run`; see Blockers B-001..B-004 |

## Decisions

Anything chosen that the spec did not dictate. Append only; supersede by adding
a new row that names the old one, never by editing or deleting.

| ID | Date | Decision | Rationale |
|---|---|---|---|
| D-001 | 2026-09-26 | Keep the PRD's own requirement ID scheme (`FR-<MODULE>-<NN>`, `NFR-<NN>`) unchanged. 61 IDs, no duplicates, no gaps. | The PRD specifies a scheme, so none was derived. Alternative — renumbering into a generator scheme — would break every cross-reference in the PRD. |
| D-002 | 2026-09-26 | Treat FR-NOT-05 as out of scope despite its position inside the in-scope Notifications section. MVP count is 60, not 61. | Its own heading reads "(Phase 2)" and "Abandoned cart email automation" is repeated in the Out of Scope list. The gap in the FR-NOT sequence is intentional and is recorded as a prohibited-scope check (PRO-06), not a deliverable. |
| D-003 | 2026-09-26 | Six milestones ordered M0 Foundation, M1 Data Models and Auth, M2 Catalog and Storefront, M3 Custom Design Tool, M4 Cart Checkout and Payment, M5 Admin Pipeline Notifications and Reviews. | The PRD gives no explicit delivery sequence, so ordering was derived from dependencies: auth precedes catalog because admin CRUD needs the `is_staff` boundary; the design tool precedes the cart because a cart line item can be a saved design; admin fulfillment comes last because it acts on orders. |
| D-004 | 2026-09-26 | Monorepo: `frontend/` for Next.js, `backend/` for Django, `assets/` at the root. | User-selected. The PRD describes one product across two stacks and never says two repos. Proof commands therefore always name their directory. |
| D-005 | 2026-09-26 | Base branch `main`, one branch per milestone, pull request opened when the milestone's last task is proved, never self-merged. | User-selected. The repo had no existing convention and no `.git` at all, so one was chosen rather than imposed silently. Keeps the template's milestone-branch and PR rules load-bearing. |
| D-006 | 2026-09-26 | The PRD's `.png` asset paths win over the `.jpg` files on disk; convert in M0 (T-012). | User-selected. The PRD is normative and read-only for this project, so reality is changed to match it rather than the reverse. Note for the conversion: the raven, mascot and wordmark are line art that benefit from PNG transparency, so this is not merely a rename. |
| D-007 | 2026-09-26 | Admin authorization is Django's `is_staff`; `403` for an authenticated non-admin, `401` for anonymous. | User-selected. NFR-04 requires an admin-only panel but names no role model or failure code. `is_staff` avoids adding a field the PRD's User model does not have. |
| D-008 | 2026-09-26 | The Paystack webhook verifies HMAC-SHA512 over the raw body against `x-paystack-signature` in constant time, rejecting with `401` before touching order state. | User-selected. FR-CART-06 specifies a webhook but never says to verify it. Unverified, anyone could forge a paid order by POSTing to a public URL. This is a `blocker`-severity check in `/verify`. |
| D-009 | 2026-09-26 | No global coverage percentage. Tests gate on non-zero collection plus coverage of every payment, auth and admin-authz path. | User-selected. The PRD contains no testing requirement at all. A percentage target invites tests written to hit the number; path coverage targets where a bug is expensive. |
| D-010 | 2026-09-26 | List endpoints must issue a constant query count regardless of page size, enforced by `assertNumQueries`. | User-selected. NFR-02 gives page-load targets but nothing about query counts, and `Product.total_orders`/`avg_rating` plus card tags are a classic N+1 shape. |
| D-011 | 2026-09-26 | All DRF routes under `/api/v1/`; additive changes allowed within v1, removals/renames/validation-tightening/status-code changes require v2. | User-selected. NFR-03 fixes page URLs but gives no API versioning policy, leaving `/verify` no rule for what breaks the client contract. |
| D-012 | 2026-09-26 | The backend uses a project-local `uv` environment under `backend/`, and every backend proof command names its directory. | During scaffolding a bare `uv run` from the repo root resolved to an unrelated project's virtualenv (`waitlist-BE-fPoBPHaW`). A proof from the wrong interpreter measures nothing. T-007 exists to prove the env is local. |
| D-013 | 2026-09-26 | Prohibited-scope greps exclude `*.md`, and `subscription` is not used as a bare grep term. | Tested during scaffolding: `rg -nw tenant` matched the PRD's own `single-tenant` prose on lines 5, 11 and 237. Separately, FR-NOT-04's newsletter makes "subscribe"/"subscriber" legitimate vocabulary, so PRO-07 targets recurring-billing identifiers instead. A check that cries wolf gets ignored. |
| D-014 | 2026-09-26 | Code comments are capped at 5 lines per block, enforced as checklist item DRY-07 at `minor` severity and as a binding constraint in `/implement`. | User instruction, saved to global and project memory. Recorded here so the rule reaches generated code: a convention stated only in `CLAUDE.md` is advisory, whereas `/implement`'s constraint list is followed literally and `/verify` audits it. |

## Blockers

| ID | Date | Blocks | Blocker | State |
|---|---|---|---|---|
| B-001 | 2026-09-26 | T-003, T-004, T-005 | `pnpm test` / `typecheck` / `lint` / `build` cannot run: `[ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND] No package.json (or package.yaml, or package.json5) was found in "C:\Users\nwank\Desktop\sten_lab\momus-collective"`. Resolved by T-003..T-005, closed by T-014. | open |
| B-002 | 2026-09-26 | T-009 | `uv run pytest` cannot run meaningfully: `collected 0 items` / `no tests ran in 0.10s`. Zero collected is not a pass. Resolved by T-009. | open |
| B-003 | 2026-09-26 | T-008 | `uv run ruff check .` cannot run meaningfully: `warning: No Python files found under the given path(s)` followed by `All checks passed!`. A lint over zero files proves nothing. Resolved by T-008. | open |
| B-004 | 2026-09-26 | T-006 | `uv run python manage.py check` cannot run: `can't open file '...\manage.py': [Errno 2] No such file or directory`. Resolved by T-006. | open |
| B-005 | 2026-09-26 | T-007 | `uv` resolves to an unrelated virtualenv (`C:\Users\nwank\.virtualenvs\waitlist-BE-fPoBPHaW`) because `backend/` has no environment. Every backend proof command is measuring the wrong interpreter until fixed. Resolved by T-007. | open |
| B-006 | 2026-09-26 | T-012, T-216 | Brand assets on disk are `.jpg`; the PRD's Brand Assets section names `.png` for all four. Code written against the PRD paths will not resolve until converted. Resolved by T-012 per D-006. | open |

## Retired requirement IDs

Never reissued. A gap in the sequence is load-bearing: it records that a feature
existed and was removed, so nothing rebuilds it under the same name.

| ID | Retired | Reason |
|---|---|---|
| FR-NOT-05 | 2026-09-26 | Never in MVP scope. Marked "(Phase 2)" in its own PRD heading and repeated in the Out of Scope list. The gap between FR-NOT-04 and the end of the Notifications section is intentional. Enforced by prohibited-scope check PRO-06. |
