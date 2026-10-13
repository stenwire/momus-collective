# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial pre-commit audit of T-607's uncommitted diff on `m6-storefront-redesign` at `bdcde77`. This is not a completion audit.

Files in the diff: `hero.tsx`, `home/raven-tilt.tsx`, `home/slogan-marquee.tsx`, `home/home.test.tsx`, `catalog/collection-carousel.tsx`, `our-story.tsx`, `new-drops.tsx`, `app/page.tsx`, `globals.css`, and the tracker rows.

Cross-cutting checks they touch: NFR-03 (home page server-rendered), NFR-02 (hero image priority), NFR-05, the PRD L29 and L31 placements, DRY-07, tests and types. Earlier partial audits' open findings (T-615..T-624) are not re-counted.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 1
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01:** this skill may not run `pnpm build`. The T-607 `/implement` run built with exit 0, and the built HTML was read below.
- **EFF-08:** Lighthouse is scheduled for T-613.
- **Backend:** no backend change.
- **BLD-07:** the branch has not been pushed.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | Spec conformance (NFR-05) | `frontend/src/components/catalog/collection-carousel.tsx:32-33` | The decorative `№ 01` count sits inside the collection's `<h2>`, so a screen reader announces "Top Rated number 01" and heading navigation lists it that way. | Mark the count `aria-hidden="true"`, or move it outside the heading (T-625). |

## Commands run

```
--- TST-05
 Test Files  57 passed (57)
      Tests  312 passed (312)
--- BLD-02
typecheck exit 0
--- BLD-03
lint exit 0
--- DRY-07 (changed files)
DRY-07 done   (no block over 5 lines)
--- NFR-03: strings in the built .next/server/app/index.html (count)
dressed up, filtered out.</span>: 1
Exiled for telling the truth.: 1
New drops, weekly.: 1
war bad naps good: 1
mascot-human: 1
mascot-raven: 1
--- hero image priority
<link rel="preload" as="image" imageSrcSet="/_next/image?url=%2Fmascot-raven.png&amp;w=32&amp;q=75 32w, ...   (preloaded, not lazy)
--- carousel heading
32:          <span className="ml-3 align-middle font-mono text-xs tracking-widest text-bone-muted">
33:            № {String(collection.products.length).padStart(2, "0")}
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | Slogans render as React text in the marquee and the cards. |
| 2. Efficiency | pass, EFF-08 not verified | The hero raven is preloaded. The headline and strike are CSS. The marquee reuses the hydrated collections query and makes no new request. |
| 3. DRY and layering | pass | Raven artwork goes through one `Raven` component. |
| 4. Tests | pass | 5 home tests. The existing home and carousel tests are unchanged. The known-failure run is recorded in the T-607 change log. |
| 5. Spec conformance | 1 minor | Finding 1. The raven sits right of the text on desktop and above it on mobile (PRD L31). Our Story uses `mascot-human.png` beside the origin story (L29). The tagline is in the H1 and the title. |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | |
| 7. Client contract and acceptance | pass | No API change. The home page stays server-rendered (NFR-03). |
