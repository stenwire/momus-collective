# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial, pre-commit audit of T-604's uncommitted diff on `m6-storefront-redesign` at `b5ae362`, not a completion audit. Covered: `components/ui/*` (Button, IconButton, Chip, Tag, Skeleton, Toaster, Marquee, KineticText, Counter, Reveal and their tests), `lib/cn.ts`, `lib/toast.ts`, the `globals.css` additions, the layout, the 15 storefront files whose amber CTAs moved to `buttonClasses()`, and the product page, design tool and shop filter controls moved to `Chip`. Also covered: the cross-cutting checks these touch (NFR-01, NFR-05, DRY-07, tests, types). Earlier partial audits' open findings (T-615..T-619) are not re-counted.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 3
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01 (build):** this skill may not run `pnpm build`. The T-604 `/implement` run built with exit 0.
- **EFF-08 (Lighthouse):** scheduled for T-613.
- **Backend:** no backend change.
- **BLD-07 (CI):** the branch has not been pushed.
- **Rendered layout at 360px:** not checked in this run (finding 3's overflow is therefore unconfirmed).

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | Spec conformance (visual, NFR-05 legibility) | `frontend/src/components/ui/kinetic-text.tsx:25` | Each word sits in an `overflow-hidden` mask one line-box tall. Display headlines run at leading ≤ 1, so descenders (the "p" in "dressed up") would be clipped once the word settles. This is latent: no page renders `KineticText` until T-607. | Pad the mask below and cancel the padding with a negative margin (e.g. `pb-[0.15em] -mb-[0.15em]`) (T-620). |
| 2 | minor | Spec conformance (WCAG 2.2.1) | `frontend/src/lib/toast.ts:33` | Toast timers run regardless of the person. An action toast (Undo, used by T-610) can disappear while someone is hovering over it or has focus on it, even at 8 s. | Pause the dismiss timer while the toast is hovered or holds focus, and resume it on leave (T-621). |
| 3 | minor | Spec conformance (NFR-01) | `frontend/src/components/ui/chip.tsx:22`, `frontend/src/components/design/font-picker.tsx:28` | `Chip` is `inline-flex` with `whitespace-nowrap`, so the font picker's `truncate` no longer produces an ellipsis: the label is an anonymous flex item. The old block-level button did truncate. A long font label could overflow its half-width cell at 360px, though no render confirmed that here. | Wrap Chip children in a `min-w-0 truncate` span, so callers' `truncate` works again (T-622). |

## Commands run

```
--- TST-05
 Test Files  54 passed (54)
      Tests  294 passed (294)
--- BLD-02
typecheck exit 0
--- BLD-03
lint exit 0
--- DRY-07 (every changed .ts/.tsx/.css file and components/ui/*)
DRY-07 scan done   (no block over 5 lines)
--- opened
src/components/ui/kinetic-text.tsx:25:          <span key={i} className="inline-block overflow-hidden align-bottom">
src/lib/toast.ts:33:  setTimeout(() => useToasts.getState().dismiss(id), entry.action ? ACTION_TOAST_MS : TOAST_MS);
src/components/ui/chip.tsx:22:        "relative inline-flex min-h-11 min-w-11 items-center justify-center border px-3 text-sm whitespace-nowrap transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none",
src/components/design/font-picker.tsx:28:              className="truncate px-2"
--- transition-all in ui, catalog, design
(none)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | Primitives render children as React text; no `dangerouslySetInnerHTML`. The `<noscript>` style is a fixed literal. |
| 2. Efficiency | pass, EFF-08 not verified | Press, headline and counter motion is CSS (D-112), and no new dependency was added. |
| 3. DRY and layering | pass | 17 hand-copied amber CTAs now go through one `buttonClasses()`, and four option-button copies through `Chip`. |
| 4. Tests | pass | 10 primitive tests. The loading-label test was strengthened after it missed a known failure (jsdom has no CSS); this is recorded in the T-604 change log. |
| 5. Spec conformance | 3 minor | Findings 1–3. The 44px floor holds at every Button size and on Chip and IconButton. |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | |
| 7. Client contract and acceptance | pass | No API change; labels and `aria-pressed` semantics are unchanged, and existing tests pass untouched. |
