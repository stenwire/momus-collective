# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial pre-commit audit of the uncommitted T-611 and T-622 diff on `m6-storefront-redesign` at `c8a405b`. Not a completion audit.

Files audited:
- `design/shirt-canvas.tsx` (colour and font tweens)
- `design/design-controls.tsx` (haptics)
- Restyled: `swatch-picker`, `template-picker`, `slogan-input`, `font-picker`, `option-buttons`, `design-preview`, `design-tool`, `save-design`, `app/design/page.tsx`
- `orders/revision-tool.tsx`, `ui/chip.tsx`, `catalog/category-filter.tsx`
- The tests and tracker rows

Cross-cutting checks these touch: FR-DES-01, 02, 04, 07 and 09; SEC-10 (draw-time sanitising); NFR-01 at 360px; PRD L31; DRY-07; tests; types.

Open findings from earlier partial audits (T-615..T-626, less T-622 now closed) are not re-counted.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 1
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01:** this skill may not run `pnpm build`. The T-611 `/implement` run built with exit 0, and its overflow scans ran against that build.
- **EFF-08:** Lighthouse, scheduled in T-613.
- **Backend:** no backend change.
- **BLD-07:** the branch has not been pushed.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | Efficiency (NFR-02) | `frontend/src/components/design/shirt-canvas.tsx:126` | During a colour or font tween, `draw()` sets `canvas.width` on every animation frame. Each assignment reallocates and clears the backing store, about 16 times per 260ms tween. Nothing renders wrongly, but it is avoidable work on low-end phones. | Size the canvas once per effect run (and on resize), then have the frame step only call `drawDesign` (T-627). |

## Commands run

```
--- TST-05
 Test Files  62 passed (62)
      Tests  338 passed (338)
--- BLD-02
typecheck exit 0
--- BLD-03
lint exit 0
--- DRY-07 (changed files)
DRY-07 done   (no block over 5 lines)
--- FR-DES-09: the print file is rendered server-side, not by drawDesign
grep -rln drawDesign src (non-test) -> src/components/design/shirt-canvas.tsx
../backend/designs/render.py:95:def render_design_png(config):
--- SEC-10: sanitising still applied at draw time
76:    sanitizeDesignText(config.text, options.text_limits),
--- canvas sizing per frame
123:    const draw = (shirtHex?: string, reveal?: number) => {
126:      canvas.width = Math.round(options.canvas_size * scale);
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | SEC-10: design text is still sanitised at draw time; the tween draws the same sanitised characters. |
| 2. Efficiency | 1 minor; EFF-08 not verified | See finding 1. Tweens are skipped under reduced motion. |
| 3. DRY and layering | pass | Haptics for every discrete design choice go through one `pick`. `Chip` leaves wrapping to callers, the same rule as `inputClasses` (cn does not merge). |
| 4. Tests | pass | 5 new tests; the 38 existing design tests are unchanged. The known-failure run is recorded. |
| 5. Spec conformance | pass | FR-DES-01/07: live re-render, final frame within 260ms. FR-DES-02: all 7 colours. FR-DES-04: font previews kept. FR-DES-09: print path untouched. PRD L31: raven on the design page. NFR-01: no overflowing control at 360px. |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | |
| 7. Client contract and acceptance | pass | No API change. |
