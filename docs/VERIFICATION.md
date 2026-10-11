# Verification Report

**Milestone:** M2 - Catalog and Storefront
**Scope:** All M2 code at `161f10a` (unchanged since the prior verified commit
`d2b45ae`; only `docs/` changed in between) plus the uncommitted
`.github/workflows/ci.yml` fix for PR #5's failing `frontend` job. Every
cross-cutting checklist item M2 touches was re-run. BLD-07 was checked
against PR #5's actual GitHub check results, not inferred from local runs.
**Date:** 2026-10-11
**Blockers:** 0
**Major:** 2
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** BLD-01 locally (`pnpm build` writes `.next/`,
which this skill forbids); CI's `frontend` job runs the build. SEC-01/02/03/
06/07/10/15 are M3/M4/M5 scope. EFF-07 is not applicable (M2 adds no async
work). EFF-08 was not re-run: no frontend code changed since T-214's
Lighthouse proof. CI-SEC-01..05 are verified at M0 and not re-run per
milestone; all five passed on PR #5.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | 6. Build and types (BLD-07) | `.github/workflows/ci.yml:92` | At `161f10a`, CI's `frontend` job fails after every real step passes, including the T-217 SSR marker assertion. The step backgrounds `uv run python manage.py runserver`, a uv process that holds uv's cache lock until the job ends. setup-uv's post-job `Pruning cache...` waits 300s for the lock and exits 2 (run 36896037273, job 110483156582). The prior M2 run recorded BLD-07 as pass without consulting the PR's checks. | T-219: start the server with `.venv/bin/python manage.py runserver --noreload` so no uv process outlives the step. This change is in the working tree, uncommitted; it is unproven until CI runs it. |
| 2 | major | 1. Security and input trust (SEC-11) / 6. BLD-07 | `.github/workflows/ci.yml:33` | The GitGuardian check fails PR #5 (incident 37641282, "Generic Password", commit `a94cf81`) on `POSTGRES_PASSWORD: momus`. Confirmed by opening the file: this is the password of the `frontend` job's ephemeral `postgres` service container, which exists only for the job and is reachable only from the runner. It authenticates nothing outside CI, so it is not a committed secret and not a blocker. It is still a failing required-looking check on the PR. The `backend` job (line 133) has carried the identical value since M0. | T-220: resolve the incident in the GitGuardian dashboard as a test credential. No rotation is needed. |

## Commands run

```
$ gh pr checks 5
GitGuardian Security Checks	fail
frontend build, types, lint, test	fail	6m10s
CI mirrors verify checklist	pass
CI-SEC-01 secret scan (gates)	pass
CI-SEC-02 semgrep (reports)	pass
CI-SEC-03 ruff S ruleset (reports)	pass
CI-SEC-04 eslint security (reports)	pass
CI-SEC-05 dependency audit (reports)	pass
Security report	pass
backend check, lint, format, test	pass

$ gh run view 36896037273 --job 110483156582 --log-failed  (excerpt)
✓ Generating static pages using 3 workers (7/7) in 241ms
##[group]Run grep -q "CI SSR CHECK MARKER" frontend/.next/server/app/index.html || {
##[endgroup]
Post job cleanup.
Pruning cache...
##[error]The process '/opt/hostedtoolcache/uv/0.12.21/x86_64/uv' failed with exit code 2
...
Terminate orphan process: pid (3400) (uv)

$ git diff --stat d2b45ae HEAD
 docs/MILESTONES.md   |   6 +--
 docs/TODO.md         |   1 +
 docs/VERIFICATION.md | 108 +++++++++++++++------------------------------------

$ cd backend && uv run python -c "import sys;print(sys.prefix)"
/Users/Apple/Desktop/Lab/playground/sten_lab/momus-collective/backend/.venv

$ cd backend && uv run pytest -q
172 passed, 1 warning in 16.66s

$ cd backend && uv run ruff check .
All checks passed!
$ cd backend && uv run ruff format --check .
91 files already formatted
$ cd backend && uv run python manage.py check
System check identified no issues (0 silenced).
$ cd backend && uv run python manage.py makemigrations --check --dry-run
No changes detected

$ pnpm --dir frontend test        (pnpm 11.21.0 via npx; not on local PATH)
      Tests  25 passed (25)
$ pnpm --dir frontend typecheck
✓ Types generated successfully
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
(exit 0)

$ uv run --no-project --with pyyaml python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
(exit 0)
$ uv run --no-project --with pyyaml python .github/scripts/check-ci-mirrors-checklist.py
ok: 5 CI-SEC rules linked in both files

$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
(no output)
$ rg -nwi "printful|printify|afrprint|jaraprint" --glob '!*.md'
(no output)
$ rg -nw "tenant|tenant_id|storefront_builder" --glob '!*.md'
(no output)
$ rg -nw "currency|exchange_rate|USD|EUR|GBP" --glob '!*.md'
frontend/src/lib/format.ts:2:  style: "currency",
frontend/src/lib/format.ts:3:  currency: "NGN",
(Intl.NumberFormat's NGN-only option keys; known false positive, unchanged.)
$ rg -nw "layers|freeDrag|free_drag|backPlacement|back_placement|imageUpload" --glob '!*.md'
(no output)
$ rg -nw "inventory|stock_count|stock_level|reorder_point" --glob '!*.md'
(no output)
$ rg -nwi "abandoned_cart|abandonedCart|cart_reminder" --glob '!*.md'
(no output)
$ rg -nw "referral_code|affiliate|subscription_plan|billing_cycle|recurring_charge" --glob '!*.md'
(no output)
$ rg -nwi "instagram_shop|tiktok_shop|i18n|gettext|ab_test|experiment_variant" --glob '!*.md'
(no output)

$ cd backend && uv run pytest -q -k "authz or num_queries or webhook"
172 deselected, 1 warning in 0.08s
(No test names carry these keywords. Coverage confirmed by reading instead:
401/403 assertions in test_admin_{categories,collections,products}.py;
CaptureQueriesContext constant-count tests in test_product_list.py:64-67
and test_categories.py:55. All run inside the 172 passed above.)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1. Security and input trust | pass, 1 major | No application secret committed; SEC-11 grep clean. Finding 2 is a CI-only throwaway credential flagged by GitGuardian, not a secret. Admin 401/403 tests still pass. |
| 2. Efficiency | pass | No code change since `d2b45ae`; query-count tests pass within the full suite. |
| 3. DRY and layering | pass | The only new comment (`ci.yml:90-91`) is 2 lines and states a non-obvious reason. |
| 4. Tests | pass | Backend `172 passed`, frontend `25 passed`; both non-zero. |
| 5. Spec conformance | pass | No code change since the prior run; prohibited-scope greps clean. |
| 6. Build and types | fail at HEAD, 1 major | BLD-02..06 pass locally. BLD-07 fails on PR #5 (finding 1); the fix is uncommitted. BLD-01 not run locally (writes `.next/`); CI's build step itself succeeds. |
| 7. Client contract and acceptance | pass | No route, serializer or page change since `d2b45ae`. |
