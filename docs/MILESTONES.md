# Milestones

Status values: `not started`, `in progress`, `awaiting verify`, `complete`.

**A milestone reaches `complete` only after `/verify` has run for it and
`docs/VERIFICATION.md`'s header names that milestone with zero blockers.**
Re-read that header immediately before writing `complete`.

Requirement IDs are the PRD's own scheme (`FR-<MODULE>-<NN>`, `NFR-<NN>`), used
exactly as written. 61 IDs exist; 60 are in MVP scope. FR-NOT-05 is excluded —
its own heading marks it "(Phase 2)" and the Out of Scope list repeats it.

| Milestone | Name | Requirements | Depends on | Status |
|---|---|---|---|---|
| M0 | Foundation | foundation | - | complete |
| M1 | Data Models and Auth | FR-USR-01, FR-USR-02, FR-USR-06, FR-USR-07, NFR-04 | M0 | complete |
| M2 | Catalog and Storefront | FR-CAT-01..07, FR-ADM-04, FR-ADM-05, FR-ADM-06, NFR-02, NFR-03, NFR-05 | M1 | in progress |
| M3 | Custom Design Tool | FR-DES-01..11, FR-USR-04, NFR-01 | M2 | not started |
| M4 | Cart, Checkout and Payment | FR-CART-01..09, FR-USR-03, FR-USR-05, FR-NOT-01 | M3 | not started |
| M5 | Admin Pipeline, Notifications and Reviews | FR-ADM-01, FR-ADM-02, FR-ADM-03, FR-ADM-07, FR-ADM-08, FR-ADM-09, FR-ADM-10, FR-NOT-02, FR-NOT-03, FR-NOT-04, FR-REV-01..05, NFR-06, NFR-07 | M4 | not started |

Branch per milestone, cut from `main`: `m0-foundation`,
`m1-data-models-and-auth`, `m2-catalog-and-storefront`, `m3-custom-design-tool`,
`m4-cart-checkout-and-payment`,
`m5-admin-pipeline-notifications-and-reviews`.

---

## M0 - Foundation

Delivers the monorepo skeleton and the toolchain every later milestone's proof
commands depend on. It comes first because **not one proof command runs today**:
`pnpm` finds no `package.json`, `pytest` collects zero tests, `ruff` finds no
Python files, and `manage.py` does not exist. Until this milestone lands, every
`[x]` in `docs/TODO.md` would be unprovable. It also converts the four brand
assets from `.jpg` to the `.png` paths the PRD names.

**Requirements:** foundation

### Definition of Done

| # | Criterion | State |
|---|---|---|
| 1 | `git status --porcelain` runs in a repo on branch `main` with an initial commit | [x] |
| 2 | `pnpm --dir frontend build` exits 0 on a Next.js 14+ App Router app with TypeScript and Tailwind | [x] |
| 3 | `pnpm --dir frontend typecheck` exits 0 | [x] |
| 4 | `pnpm --dir frontend lint` exits 0 | [x] |
| 5 | `pnpm --dir frontend test` collects a non-zero number of tests and passes | [x] |
| 6 | `cd backend && uv run python manage.py check` reports no issues | [x] |
| 7 | `cd backend && uv run pytest -q` collects a non-zero number of tests and passes | [x] |
| 8 | `cd backend && uv run ruff check .` passes and reports no `No Python files found` warning | [x] |
| 9 | `cd backend && uv run ruff format --check .` exits 0 | [x] |
| 10 | The backend `uv` environment resolves inside `backend/`, not a borrowed virtualenv — proved by pasting `uv run python -c "import sys; print(sys.prefix)"` | [x] |
| 11 | `ls -l assets/*.png` lists wordmark, avatar, mascot-human and mascot-raven |[x] |
| 12 | PostgreSQL and Redis connect from the backend via `DATABASE_URL` and `REDIS_URL` |[x] |
| 13 | A GitHub Actions workflow runs every command in rows 2-9 on push |[x] |
| 14 | `.gitignore` covers `.next/`, `__pycache__/`, `.pytest_cache/`, `.venv/`, `.env` | [x] |
| 15 | `.env.example` names every secret without holding a value: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `REDIS_URL` |[x] |

### Verification

- Verified: yes, 2026-09-26 (re-run against `a5d4d1d`, merged via PR #2 at `91dd33b`)
- Report: `docs/VERIFICATION.md`, 0 blockers, 0 major, 0 minor

---

## M1 - Data Models and Auth

Delivers the full data layer from the PRD's Data Models section and the
authentication surface every later milestone builds on. Auth comes before the
catalog because admin product management (M2) needs the `is_staff` boundary to
exist, and because saved designs, carts, and orders all key on `User`.

**Requirements:** FR-USR-01, FR-USR-02, FR-USR-06, FR-USR-07, NFR-04

### Definition of Done

| # | Criterion | State |
|---|---|---|
| 1 | All 14 models exist with the PRD's fields: User, Address, Category, Product, Collection, CollectionProduct, SavedDesign, Cart, CartItem, Order, OrderItem, Review, PromoCode, NewsletterSubscriber |[x] |
| 2 | `cd backend && uv run python manage.py makemigrations --check --dry-run` reports no missing migrations |[x] |
| 3 | Registration rejects a duplicate email with a clear message — test passes | [x] |
| 4 | Password minimum of 8 characters enforced — test passes | [x] |
| 5 | JWT login issues access and refresh tokens; sessions persist 30 days with Remember Me — test passes | [x] |
| 6 | Google OAuth login succeeds and sets `auth_provider` — test passes | [x] |
| 7 | Password reset emails a working link — test passes | [x] |
| 8 | Email verification is sent on registration — test passes | [x] |
| 9 | An authenticated non-admin gets `403` and an anonymous request `401` on an admin route — test passes | [x] |
| 10 | Rate limiting is enforced on login, registration and password reset — test passes | [x] |
| 11 | Saved addresses support multiple per user with one default (FR-USR-06) — test passes | [x] |
| 12 | Account settings update name, email with re-verification, phone, password, notification_pref (FR-USR-07) — test passes | [x] |
| 13 | All routes are under `/api/v1/` |[x] |
| 14 | Money fields are `Decimal` or integer minor units; no float — confirmed by opening the models |[x] |

### Verification

- Verified: yes, 2026-10-01
- Report: `docs/VERIFICATION.md`, 0 blockers, 0 major, 1 minor (T-116 queued)

---

## M2 - Catalog and Storefront

Delivers the browsable, SEO-indexable store: product grid, filtering, search,
sorting, detail pages, collections, and the admin CRUD that populates them. This
is the first milestone a customer could use. It precedes the design tool because
the design tool's pricing and shirt-color options reuse catalog primitives.

**Requirements:** FR-CAT-01..07, FR-ADM-04, FR-ADM-05, FR-ADM-06, NFR-02, NFR-03, NFR-05

### Definition of Done

| # | Criterion | State |
|---|---|---|
| 1 | Product grid renders 4 columns desktop, 2 mobile, each card showing mockup, slogan, category, NGN price and tag (FR-CAT-01) | [x] |
| 2 | All 11 launch categories exist and filter correctly, each showing its product count (FR-CAT-02) | [x] |
| 3 | Search matches slogan and category, debounced at 300ms, with a friendly empty state (FR-CAT-03) | [x] |
| 4 | Sorting by Newest, Price asc, Price desc and Most Popular works (FR-CAT-04) | [x] |
| 5 | Product detail shows mockup, sizes S-XXL, colors, Add to Bag, details and up to 4 related; modal on desktop, full page on mobile (FR-CAT-05) | [x] |
| 6 | Collections render as homepage carousels; a product can belong to several (FR-CAT-06) | [x] |
| 7 | Shop loads 20 then infinite-scrolls in batches of 20 with a loading indicator (FR-CAT-07) | [x] |
| 8 | Admin can create, edit, archive, bulk-price and reorder products (FR-ADM-04) | [x] |
| 9 | Admin can create, rename, reorder and archive categories (FR-ADM-05) | [ ] |
| 10 | Admin can manage collections and set one featured (FR-ADM-06) | [ ] |
| 11 | The grid endpoint issues a constant query count regardless of page size — `assertNumQueries` test passes | [x] |
| 12 | Public pages are server-rendered with unique meta tags and product JSON-LD (NFR-03) | [ ] |
| 13 | URLs match `/shop`, `/shop/<category>`, `/product/<slug>` (NFR-03) | [ ] |
| 14 | Images lazy-load as WebP; Lighthouse performance above 80 (NFR-02) | [ ] |
| 15 | Alt text on every product image, keyboard navigation works, dark-theme contrast checked (NFR-05) | [ ] |
| 16 | Homepage uses the brand assets at their PRD paths, including the raven hero and Our Story mascot | [ ] |

### Verification

- Verified: not yet
- Report: none

---

## M3 - Custom Design Tool

Delivers the differentiating feature: the in-browser text editor that renders a
live shirt mockup and exports a print-ready file. It depends on M2 for shirt
colors and pricing primitives, and must precede M4 because the cart accepts a
custom design as a line item.

**Requirements:** FR-DES-01..11, FR-USR-04, NFR-01

### Definition of Done

| # | Criterion | State |
|---|---|---|
| 1 | Canvas renders a shirt mockup and re-renders live as the user types (FR-DES-01, FR-DES-07) | [ ] |
| 2 | All 7 shirt colors select and update the mockup instantly (FR-DES-02) | [ ] |
| 3 | Text input caps at 80 characters with a live counter (FR-DES-03) | [ ] |
| 4 | 8-10 curated fonts selectable with previews, covering bold sans, condensed impact, script, monospace, serif and stencil (FR-DES-04) | [ ] |
| 5 | Size, text color, alignment and letter spacing all adjustable (FR-DES-05) | [ ] |
| 6 | Placement offers exactly Upper Chest, Center Chest default, Lower Chest, Full Front — no back, no free-drag (FR-DES-06) | [ ] |
| 7 | Preview button shows a clean mockup without controls (FR-DES-07) | [ ] |
| 8 | Logged-in users save designs with full config; guests are prompted to register (FR-DES-08) | [ ] |
| 9 | Adding to cart generates a PNG or SVG at 300 DPI minimum with transparent background — test asserts the resolution (FR-DES-09) | [ ] |
| 10 | 10-15 templates across Bold Statement, Minimalist, Stacked Text and Disclaimer Style (FR-DES-10) | [ ] |
| 11 | Custom pricing computes server-side as blank + print + margin, varying by shirt color (FR-DES-11) | [ ] |
| 12 | Saved-design gallery supports edit, add to cart, duplicate and delete (FR-USR-04) | [ ] |
| 13 | The tool is fully usable at 360px with touch targets at least 44x44px (NFR-01) | [ ] |
| 14 | Design text is sanitized before it reaches the canvas or the generated file | [ ] |

### Verification

- Verified: not yet
- Report: none

---

## M4 - Cart, Checkout and Payment

Delivers revenue: persistent cart, checkout, Paystack payment, and the order
record. It depends on M3 because a cart line item may be a saved design. This is
the milestone with the highest blocker density — webhook verification and
server-side total computation both live here.

**Requirements:** FR-CART-01..09, FR-USR-03, FR-USR-05, FR-NOT-01

### Definition of Done

| # | Criterion | State |
|---|---|---|
| 1 | Cart persists across refresh: localStorage for guests, server-side for users (FR-CART-01) | [ ] |
| 2 | A guest cart merges into an existing server cart on login without losing either — test passes (FR-CART-01) | [ ] |
| 3 | Cart items show thumbnail, slogan or Custom Design preview, size, color, quantity controls, unit price and remove (FR-CART-02) | [ ] |
| 4 | Cart is a right drawer on desktop, bottom sheet on mobile, with a count badge (FR-CART-03) | [ ] |
| 5 | Single-page checkout with Shipping, Order Summary and Payment; cart editable from checkout (FR-CART-04) | [ ] |
| 6 | Guest checkout completes with email and phone, then offers account creation (FR-CART-05) | [ ] |
| 7 | Paystack Inline handles card, bank transfer and USSD; failed payments show a clear error and allow retry (FR-CART-06) | [ ] |
| 8 | The webhook verifies HMAC-SHA512 over the raw body against `x-paystack-signature` in constant time, rejecting with `401` **before touching order state** — tests cover unsigned and wrong-signature (FR-CART-06) | [ ] |
| 9 | A replayed valid webhook does not create or confirm a second order — test passes | [ ] |
| 10 | Promo codes validate expiry, max uses, per-user uses and minimum order value at redemption — test passes (FR-CART-07) | [ ] |
| 11 | Delivery fees apply per state band with a configurable free-delivery threshold (FR-CART-08) | [ ] |
| 12 | Order totals are recomputed server-side; a client-supplied price is rejected or ignored — test passes | [ ] |
| 13 | Order numbers follow `MOM-YYYYMMDD-NNN` (FR-CART-09) | [ ] |
| 14 | Confirmation page and email both show order number, summary, estimated delivery and tracking link (FR-CART-09, FR-NOT-01) | [ ] |
| 15 | The guest tracking link is unguessable, not the sequential order number | [ ] |
| 16 | Order history lists orders reverse-chronologically and expands to full detail (FR-USR-03) | [ ] |
| 17 | Wishlist adds from a product card heart and moves items to cart (FR-USR-05) | [ ] |
| 18 | `Order.shipping_address` is a JSON snapshot that does not follow later edits to the saved address — test passes | [ ] |

### Verification

- Verified: not yet
- Report: none

---

## M5 - Admin Pipeline, Notifications and Reviews

Delivers the operational half: the admin's fulfillment board, design moderation,
analytics, the customer notification stream, and social proof. It comes last
because every one of these acts on orders that M4 creates.

**Requirements:** FR-ADM-01, FR-ADM-02, FR-ADM-03, FR-ADM-07, FR-ADM-08, FR-ADM-09, FR-ADM-10, FR-NOT-02, FR-NOT-03, FR-NOT-04, FR-REV-01..05, NFR-06, NFR-07

### Definition of Done

| # | Criterion | State |
|---|---|---|
| 1 | A paid order notifies the admin by email with the design file attached and by WhatsApp with a summary and link (FR-ADM-01) | [ ] |
| 2 | Kanban board shows Paid, Shirt Acquired, Printed, Out for Delivery, Delivered and Cancelled; dragging updates status and notifies the customer (FR-ADM-02) | [ ] |
| 3 | A sortable list view is available alongside the board (FR-ADM-02) | [ ] |
| 4 | Order detail shows customer info, items, design file download, Paystack reference, status timeline and notes (FR-ADM-03) | [ ] |
| 5 | Custom designs enter a moderation queue before fulfillment; approval moves the order to Shirt Acquired (FR-ADM-07) | [ ] |
| 6 | Rejection captures a reason and notifies the customer with revise-or-refund options (FR-ADM-07, FR-NOT-03) | [ ] |
| 7 | Analytics shows revenue by period, orders by status, top 10 products, category breakdown, custom vs catalog ratio, AOV and a 30-day trend (FR-ADM-08) | [ ] |
| 8 | Admin manages promo codes with redemption and remaining-use tracking (FR-ADM-09) | [ ] |
| 9 | Customer list shows name, email, phone, order count, total spent and last order date (FR-ADM-10) | [ ] |
| 10 | Status changes notify by the customer's `notification_pref` — email, WhatsApp or both (FR-NOT-02) | [ ] |
| 11 | Newsletter capture in footer and homepage stores subscribers in the database (FR-NOT-04) | [ ] |
| 12 | Only verified purchasers can review; reviews carry the Verified Purchase badge (FR-REV-01, FR-REV-02) | [ ] |
| 13 | Review text caps at 500 characters with a 1-5 rating (FR-REV-01) | [ ] |
| 14 | Admin can flag and hide reviews (FR-REV-03) | [ ] |
| 15 | Products show average rating and review count on card and detail; Top Rated collection works (FR-REV-04) | [ ] |
| 16 | A review prompt email fires 3 days after Delivered (FR-REV-05) | [ ] |
| 17 | Every admin route asserts an explicit `is_staff` permission class — test passes (NFR-04) | [ ] |
| 18 | Load testing confirms 1,000 concurrent users and 500 orders/month are served (NFR-06) | [ ] |
| 19 | Daily database backups and weekly asset backups to secondary storage are configured (NFR-07) | [ ] |
| 20 | Customer PII does not appear in application logs — confirmed by opening the logging config | [ ] |

### Verification

- Verified: not yet
- Report: none
