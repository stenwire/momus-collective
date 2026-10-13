# Verification Report

**Milestone:** M6 - Storefront Redesign
**Scope:** Partial, pre-commit audit of T-617's uncommitted diff on `m6-storefront-redesign` at `392302a`; not a completion audit.
- **Files:** `frontend/package.json` (`next` and `eslint-config-next` 16.3.8), `pnpm-lock.yaml`, `pnpm-workspace.yaml` (overrides for sharp 0.35.5 and source-map-js 1.2.2), and the tracker rows.
- **Cross-cutting checks a dependency change touches:** CI-SEC-05, CI's frozen-lockfile install, BLD-02/03, TST-05, and DRY-07 on the YAML comment.
- **Not re-counted:** open findings from earlier partial audits (T-616, T-618..T-621, T-623..T-627).
**Date:** 2026-10-13
**Blockers:** 0
**Major:** 0
**Minor:** 1
**Verdict:** PASS
**Dimensions not verified:**
- **BLD-01:** this skill may not run `pnpm build`. The T-617 `/implement` run built with exit 0 on Next 16.3.8 and smoke-tested routes and the image optimizer.
- **EFF-08:** Lighthouse is T-613.
- **Backend:** no backend change.
- **BLD-07:** the branch has not been pushed, so CI has not run.

Process deviation in this audit run: to check whether the remaining advisory predates T-617, a copy of the HEAD lockfile was written to the session scratchpad, outside the repo. It was read once and deleted in the same run. This skill permits no files other than these two.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | minor | Security (CI-SEC-05) | `frontend/pnpm-lock.yaml` (`braces@3.0.3`) | The full audit, dev dependencies included, reports one high advisory: `braces` ≤3.0.3, a stack-exhaustion DoS, via `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. It is dev-only (the lint toolchain) and predates T-617: the HEAD lockfile has the same `braces@3.0.3`. The production audit is clean. | Add `braces: 3.0.4` (or later) to the `pnpm-workspace.yaml` overrides (T-628). |

## Commands run

```
--- CI-SEC-05
pnpm audit --prod  -> No known vulnerabilities found
pnpm audit         -> Severity: 1 high
high braces <=3.0.3 patched >=3.0.4 | braces vulnerable to stack-exhaustion denial of service through deeply
  via ['.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>braces']
HEAD lockfile: braces@3.0.3      working lockfile: braces@3.0.3
--- lockfile matches manifests (the way CI installs)
pnpm install --frozen-lockfile --lockfile-only -> Already up to date (exit 0)
.github/workflows/ci.yml:78:      - run: pnpm --dir frontend install --frozen-lockfile
.github/workflows/security.yml:234:          pnpm install --frozen-lockfile
--- TST-05 / BLD-02 / BLD-03
      Tests  342 passed (342)
typecheck exit 0
lint exit 0
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | 1 minor | Finding 1 (dev-only, predates T-617). The production audit is clean: the six Next advisories, including the image-optimizer SSRF, plus sharp and source-map-js are all resolved. |
| 2. Efficiency | pass, EFF-08 not verified | |
| 3. DRY and layering | pass | Overrides live in one place, `pnpm-workspace.yaml`. Its comment is 2 lines. |
| 4. Tests | pass | 342 pass on the new versions. |
| 5. Spec conformance | pass | The stack stays "Next.js 14+" (D-021). |
| 6. Build and types | typecheck and lint pass; BLD-01 not verified | The frozen-lockfile install that CI runs is satisfied. |
| 7. Client contract and acceptance | pass | No API change. |
