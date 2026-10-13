# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial, pre-commit audit of the uncommitted minor-findings batch on `m6-storefront-redesign` at `535ec4b` (T-616, T-618..T-621, T-623..T-627, with T-628 blocked). This is not a completion audit.

Files covered:
- `cart/cart-lines.tsx` and `lib/design/fonts.ts`
- `lib/haptics.ts`
- `ui/kinetic-text.tsx`, `lib/toast.ts`, `ui/toaster.tsx`, `ui/sheet.tsx`
- `app/layout.tsx`
- `catalog/collection-carousel.tsx`, `catalog/category-filter.tsx`
- `design/shirt-canvas.tsx`
- The tests and tracker rows, including B-016

Cross-cutting checks those files touch: NFR-02 font preloads, NFR-05 (skip link, timing, accessible names), D-066 (the design-font list), DRY-07, tests and types.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 1
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01 (build):** this skill may not run `pnpm build`. The batch's `/implement` run built with exit 0 and measured the preloads.
- **EFF-08 (Lighthouse):** scheduled for T-613.
- **Backend:** no backend change.
- **BLD-07 (CI):** the branch has not been pushed.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | DRY and layering | `frontend/src/components/ui/kinetic-text.tsx:25`, `frontend/src/components/hero.tsx:8-17` | `KineticText` has no importer outside its own test. The hero builds the same word-by-word rise in its own `Words` helper, and the two copies have already drifted. T-620 padded the unused primitive (`pb-[0.15em] -mb-[0.15em]`), while the live hero uses `pb-[0.08em]` with no negative margin. | Let `KineticText` take the hero's two-line and strike-through layout and use it from the hero, or delete `KineticText` and its test (T-629). |

## Commands run

```
--- TST-05
 Test Files  64 passed (64)
      Tests  350 passed (350)
--- BLD-02
typecheck exit 0
--- BLD-03
lint exit 0
--- DRY-07 (changed files)
DRY-07 done   (no block over 5 lines)
--- KineticText importers (non-test)
src/components/ui/kinetic-text.tsx
--- the hero's own word animation
8:function Words({ text, from }: { text: string; from: number }) {
11:    <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
13:        className="inline-block animate-rise"
--- D-066: only preload flags and a comment changed in lib/design/fonts.ts
(the seven family/weight definitions are unchanged apart from `preload: false`)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | No input path. T-628's dev-only advisory is tracked as B-016 (no patched release exists). |
| 2. Efficiency | pass, EFF-08 not verified | Home preloads drop from 11 font files (181,652 bytes) to 4 (66,700). Canvas tweens no longer reallocate per frame. |
| 3. DRY and layering | 1 minor | Finding 1. |
| 4. Tests | pass | 8 new tests and 1 updated (touch versus desktop). The known-failure result (7 of 7 fail with fixes reverted) is recorded, along with the harness incident that produced it. |
| 5. Spec conformance | pass | NFR-05: skip link; toasts pause while read (WCAG 2.2.1); carousel heading named cleanly. D-066: design fonts unchanged. |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | |
| 7. Client contract and acceptance | pass | No API change. |
