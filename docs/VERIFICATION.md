# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial pre-commit audit of T-610's uncommitted diff on `m6-storefront-redesign` at `d251d9a`. This is not a completion audit.

Files in the diff:
- `cart/cart-lines.tsx`, `cart/cart-drawer.tsx`, `lib/cart/use-remove-with-undo.ts`
- `checkout/checkout-page.tsx`, `checkout/shipping-form.tsx`, `checkout/paid-stamp.tsx`
- the checkout and confirmation pages
- `globals.css` (`stamp` and `flip` keyframes)
- `lib/haptics.ts` (activation rule, D-115)
- `ui/counter.tsx` (the T-604 correction)
- the tests and tracker rows

Cross-cutting checks these touch:
- SEC-06: Undo re-adds a line built on the client.
- FR-CART-02, FR-CART-04, FR-CART-06, FR-CART-09, FR-NOT-01
- NFR-05 (form errors and focus)
- DRY-07, tests, types

Open findings from earlier partial audits (T-615..T-626) are not re-counted.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01 (build):** this skill may not run `pnpm build`. The T-610 `/implement` run built with exit 0, and the running :3100 server serves that build.
- **EFF-08 (Lighthouse):** scheduled for T-613.
- **Backend:** no backend change.
- **BLD-07 (CI):** the branch has not been pushed.

## Findings

None in this diff.

One lead was opened and dropped as unconfirmed: `cart-lines.tsx:80-81` uses `AnimatePresence mode="popLayout"` inside a non-positioned `<ul>`. The installed types state no positioning requirement. The pop logic pins the exiting element at its own offset within its `offsetParent`, so placement is consistent whichever ancestor that is. No misplacement was observed, so it is not filed.

## Commands run

```
--- TST-05
 Test Files  61 passed (61)
      Tests  333 passed (333)
--- BLD-02
typecheck exit 0
--- BLD-03
lint exit 0
--- DRY-07 (changed files)
DRY-07 done   (no block over 5 lines)
--- SEC-06: the server add sends ids only; the price is never sent
15:export async function addToServerCart(input: AddToCart): Promise<CartData> {
16-  const body =
17-    "product" in input
18-      ? {
19-          product: input.product.id,
20-          size: input.size,
21-          color: input.color,
22-          quantity: input.quantity ?? 1,
23-        }
24-      : { saved_design: input.design.id, size: input.size, quantity: input.quantity ?? 1 };
backend/carts/serializers.py:57:    def get_unit_price(self, item):
backend/carts/serializers.py:58:        return unit_price(item, self.context["prices"])
--- popLayout lead
80:      <ul className="flex flex-col gap-4">
81:        <AnimatePresence initial={false} mode="popLayout">
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | SEC-06 holds: Undo's rebuilt line sends only ids, size, colour and quantity, and the server prices it. The tracking token used for the browser check was kept out of the transcript. |
| 2. Efficiency | pass; EFF-08 not verified | The seal and mask are CSS. Line animations reuse the lazy `domMax` features. |
| 3. DRY and layering | pass | One Undo hook serves the drawer and checkout. The shared input style replaces two copies (`FIELD` and the inline email and promo classes). |
| 4. Tests | pass | 6 new tests, plus 2 existing checkout tests strengthened (focus on the first invalid field; success and error haptics). The known-failure run is recorded. The `Counter` correction is recorded as its own change-log row. |
| 5. Spec conformance | pass | FR-CART-02: line fields intact. FR-CART-04: one page, three sections, editable cart. FR-CART-06: cancel and failure messages unchanged, with retry allowed. FR-CART-09: confirmation shows number, summary, estimate and tracking link. |
| 6. Build and types | pass for typecheck and lint; BLD-01 not verified | |
| 7. Client contract and acceptance | pass | No API change. |
