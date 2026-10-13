# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial, pre-commit audit, not a completion audit. It covers T-602's uncommitted diff on `m6-storefront-redesign` at `fb3a336`:
- the `motion` 14.1.0 and `lucide-react` 1.55.0 dependencies
- `lib/motion.ts` and `lib/motion-features.ts`
- `components/providers/motion-provider.tsx` and its test
- the root layout and the tracker rows

It also covers the cross-cutting checks that diff touches: the CI-SEC-05 dependency audit, NFR-02 bundle cost, DRY-07, tests, and types. Two minor findings from the T-601 audit are still open and queued (T-615, T-616); they are not re-counted here.
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 1
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01 (build).** This skill may not run `pnpm build`. The T-602 `/implement` run built with exit 0.
- **EFF-08 (Lighthouse).** Scheduled in T-613.
- **Backend dimensions and SEC-01..SEC-15 read checks.** M6 changes no backend file.
- **BLD-07 (CI).** The branch has not been pushed.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | Security (CI-SEC-05) | `frontend/package.json:18`, `frontend/next.config.ts:12` | `next` is pinned at 16.3.6. `pnpm audit --prod` lists six Next advisories fixed in 16.3.8, including a high-severity server-side request forgery (SSRF) in image optimization. That one is reachable here because `remotePatterns` allows any HTTPS host (D-062). This predates M6 (it is not from T-602's packages), but the image optimizer serves every storefront page M6 restyles. | Upgrade `next` and `eslint-config-next` to 16.3.8, then rebuild and re-run the gates (T-617). |

## Commands run

```
--- CI-SEC-05 (corepack pnpm audit --prod)
8 vulnerabilities found
Severity: 1 low | 4 moderate | 3 high
(by package, from --json)
high source-map-js >=1.0.0 <1.2.2 | via . | source-map-js allows event-loop denial of service through in
high sharp <0.35.5 | via . | sharp : Vulnerability in librsvg dependency CVE-2026-96889
moderate next >=16.3.0 <16.3.8 | via . | Next.js: Pending `use cache` fill can leak Draft Mode conten
moderate next >=16.0.0 <16.3.8 | via . | Next.js has cache poisoning of SSG and ISR pages in self-hos
low next >=16.0.0 <16.3.8 | via . | Next.js has information disclosure in development server's M
moderate next >=16.0.0 <16.3.8 | via . | Next.js has information disclosure in App Router metadata im
moderate next >=16.0.0 <16.3.8 | via . | Next.js has cache poisoning in SSG/ISR rendering that leads
high next >=16.0.0 <16.3.8 | via . | Next.js has Server-Side Request Forgery in Image Optimizatio
(none from motion or lucide-react)
$ grep -n '"next"\|eslint-config-next' package.json
18:    "next": "16.3.6",
33:    "eslint-config-next": "16.3.6",
$ grep -n -A4 remotePatterns next.config.ts
12:    remotePatterns: [{ protocol: "https", hostname: "**" }],
$ pnpm view next@16.3 version
16.3.8
--- TST-05
 Test Files  51 passed (51)
      Tests  270 passed (270)
--- BLD-02
typecheck exit 0
--- BLD-03
lint exit 0
--- DRY-07 (changed files)
none over 5
--- licences
motion MIT, lucide-react ISC
--- full `motion` component imports outside tests
(none outside tests)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | 1 major | Finding 1; the advisories predate M6. The new packages carry no advisories. |
| 2. Efficiency | pass, EFF-08 not verified | The T-602 build puts drag and layout in a lazy chunk (30 KB gzip). The homepage's initial JS is 215 KB gzip, with no earlier baseline to compare against. |
| 3. DRY and layering | pass | Motion tokens are defined once, in `lib/motion.ts`. |
| 4. Tests | pass | 5 provider and token tests; known-failure run recorded in the T-602 change log. |
| 5. Spec conformance | pass | The PRD names Framer Motion; `motion` is its current package (D-107, D-111). |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | |
| 7. Client contract and acceptance | pass | No API change. |
