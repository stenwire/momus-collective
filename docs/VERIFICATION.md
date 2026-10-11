# Verification Report

**Milestone:** M2 - Catalog and Storefront
**Scope:** M2 follow-up on `m2-followup-t221` (from `main` at `6da09f9`):
the uncommitted T-221 change giving server-rendered catalog pages a
freshness policy (`frontend/src/lib/api.ts` catalog fetches with
`next.revalidate`, `revalidate = 60` on `frontend/src/app/page.tsx` and
`frontend/src/app/shop/page.tsx`, new `frontend/src/lib/api.test.ts`), plus
every cross-cutting check it touches: NFR-03 server rendering, NFR-02,
the client contract, DRY-07, both test suites, secrets and scope greps.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 0
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** BLD-01 (`pnpm build` writes `.next/`; the T-221
implement run built twice and reported `/` and `/shop` at revalidate 60).
BLD-07 (branch not pushed yet). EFF-08 (Lighthouse not re-run; ISR serves
the same prerendered HTML, so the T-214 scores are not expected to move).
M3-M5-scope checks as before. CI-SEC-01..05 are verified at M0.

## Findings

None.

Checked and judged sound by opening the files:
- `frontend/src/lib/api.ts:8-9,43,57,75,91`: every catalog fetch passes the
  60s `next.revalidate`; the two design fetches keep `no-store` (D-069). No
  server fetch is left without an explicit policy.
- `frontend/src/app/page.tsx:11` and `frontend/src/app/shop/page.tsx:9`
  export `revalidate = 60`. The pages remain prerendered (ISR), so NFR-03's
  server rendering holds. The literal duplicates `CATALOG_REVALIDATE_SECONDS`
  by necessity (segment config must be static), and
  `src/lib/api.test.ts` pins the two equal.
- The dynamic `/product/[slug]` and `/shop/[category]` routes inherit the
  same 60s ceiling through the fetch option: a deactivated product or new
  category can lag by up to a minute, which D-081 accepts.

## Commands run

```
$ pnpm --dir frontend test        (pnpm 11.21.0 via npx)
 Test Files  22 passed (22)
      Tests  124 passed (124)
$ pnpm --dir frontend typecheck
✓ Types generated successfully
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
exit 0
$ cd backend && uv run pytest -q
289 passed, 1 warning in 32.24s
$ cd backend && uv run ruff check .
All checks passed!
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).
$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)
$ PRO-01..08 greps
frontend/src/lib/format.ts:2:  style: "currency",      (known false positive)
frontend/src/lib/format.ts:3:  currency: "NGN",
$ DRY-07 scan over the changed TS files
['frontend/src/app/page.tsx', 'frontend/src/app/shop/page.tsx',
 'frontend/src/lib/api.ts', 'frontend/src/lib/api.test.ts'] violations: 0
$ grep -n "await fetch(" frontend/src/lib/api.ts
43:  ... /api/v1/products/?${query}`, catalogFetch);
57:  ... /api/v1/products/${slug}/`, catalogFetch);
75:  ... /api/v1/categories/`, catalogFetch);
91:  ... /api/v1/collections/`, catalogFetch);
101: ... /api/v1/designs/options/`, {   (cache: "no-store")
114: ... /api/v1/designs/pricing/`, {   (cache: "no-store")
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass | No security surface changed; no secret. |
| 2. Efficiency | pass | ISR keeps the homepage and shop prerendered and cached, regenerating at most once a minute in the background. |
| 3. DRY and layering | pass | One constant and one shared fetch option for every catalog read; the unavoidable segment-config literal is pinned by a test. DRY-07 0 violations. |
| 4. Tests | pass | Frontend `124 passed` (5 new), backend `289 passed`. The fix was proven live in the implement run against a reproduction of the original defect on `main`. |
| 5. Spec conformance | pass | NFR-03 holds (pages still server-rendered); admin catalog edits (FR-ADM-04/05/06) now reach public pages within a minute. |
| 6. Build and types | pass (partial) | Typecheck and lint clean; BLD-01/BLD-07 as in the header. |
| 7. Client contract and acceptance | pass | No API change; the browser ignores the `next` option, so client fetching is unchanged. |
