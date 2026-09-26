# Verification Report

**Milestone:** M0 - Foundation
**Scope:** M0's own code (frontend scaffold, backend Django/Celery/Postgres/Redis wiring, brand assets, both CI workflows) plus every cross-cutting checklist item M0 touches: SEC-11/12 (secrets, DEBUG), all 8 prohibited-scope greps (project-wide, not milestone-scoped by nature), DRY-07 (every tracked file), TST-01/05/06, BLD-01..07, API-06.
**Date:** 2026-09-26
**Blockers:** 0
**Major:** 2
**Minor:** 0
**Verdict:** PASS
**Dimensions not verified:** 1 Security (SEC-01..10, SEC-13..15 have no code yet — no webhook, no admin route, no order model, no storage layer); 2 Efficiency (wholly — no endpoints exist); 3 DRY (DRY-01..06 have no code to check; DRY-07 fully verified, see findings); 4 Tests (TST-02/03/04 have no payment/auth/admin-authz code yet); 5 Spec conformance (SPC-01..14, 16, 17 have no implementation; SPC-06 is FR-DES-09's design-tool export, out of M0's scope; SPC-15 and prohibited scope fully verified); 7 Client contract (API-01..05, 07, 08 have no routes/pages/notifications yet; API-06 fully verified)

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | 3 DRY and layering | `backend/config/asgi.py:1-8` | DRY-07 fails. Django's generated module docstring is 6 lines (over the 5-line cap). `urls.py` and `manage.py` were trimmed for this rule during M0 (T-015..T-020 covered `.github/` only); `asgi.py` and `wsgi.py` were missed. | Cut to 5 lines or fewer, e.g. a one-line pointer to Django's ASGI docs. |
| 2 | major | 3 DRY and layering | `backend/config/wsgi.py:1-8` | DRY-07 fails, identical shape to finding 1 — Django's generated WSGI docstring is 6 lines. | Cut to 5 lines or fewer. |

### Not raised as a finding, but worth recording

`docs/TODO.md`'s B-007 row still reads `open` and states "CI-SEC-02 ran but scanned 0 of 16 files ... re-verification pending." The re-verification has since happened: CI runs `36232575707` and `36232674772` (both on the current `m0-foundation` HEAD) show `CI-SEC-02 semgrep (reports)` green with `semgrep scanned 46 files`, and CI-SEC-02 through CI-SEC-05 all pass. The blocker's content is accurate as history but its `open` state understates where the branch now stands. `/implement`'s next run should close it; `/verify` does not edit existing rows. Not a code defect, so not counted in the finding table.

## Commands run

```
$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md' --glob '!node_modules' --glob '!.venv'
exit=1
```
SEC-11, clean.

```
$ git ls-files backend/.env frontend/.env .env
(empty)
$ git show HEAD:backend/.env.example | grep -vE '^#' | grep -E '=.+'
DJANGO_DEBUG=False
```
No `.env` tracked; `.env.example` holds only that one non-secret value.

```
$ rg -nwi "printful|printify|afrprint|jaraprint" --glob '!*.md' --glob '!node_modules' --glob '!.venv' --glob '!*.lock'
exit=1   # PRO-01 clean
$ rg -nw "tenant|tenant_id|storefront_builder" [same globs]
exit=1   # PRO-02 clean
$ rg -nw "currency|exchange_rate|USD|EUR|GBP" [same globs]
exit=1   # PRO-03 clean
$ rg -nw "layers|freeDrag|free_drag|backPlacement|back_placement|imageUpload" [same globs]
exit=1   # PRO-04 clean
$ rg -nw "inventory|stock_count|stock_level|reorder_point" [same globs]
exit=1   # PRO-05 clean
$ rg -nwi "abandoned_cart|abandonedCart|cart_reminder" [same globs]
exit=1   # PRO-06 clean
$ rg -nw "referral_code|affiliate|subscription_plan|billing_cycle|recurring_charge" [same globs]
exit=1   # PRO-07 clean
$ rg -nwi "instagram_shop|tiktok_shop|i18n|gettext|ab_test|experiment_variant" [same globs]
exit=1   # PRO-08 clean
```

Note on PRO-08: `backend/config/settings.py:84` sets `USE_I18N = True`, which the grep does not match (it targets the literal token `i18n`). Confirmed by opening the file: no `LocaleMiddleware`, no `LANGUAGES`, no `LOCALE_PATHS`, no `locale/` directory anywhere under `backend/`, and a single `LANGUAGE_CODE = "en-us"`. This is Django's inert default flag, not built multi-language support, so it is not recorded as a PRO-08 violation.

```
$ python  (AST + consecutive-hash-comment scan over every tracked .py/.yml/.yaml/.toml,
           and //-comment scan over every tracked .ts/.tsx)
('backend/config/asgi.py', '<module> docstring', 6)
('backend/config/wsgi.py', '<module> docstring', 6)

total violations: 2
py=11 ts=5 yml=5 toml=2
```
Both confirmed by opening the files (see Findings 1-2). All other tracked Python, YAML, TOML and TypeScript/TSX files scanned clean — including `backend/config/urls.py`, `manage.py`, `celery.py`, and both `.github/scripts/` files, all of which were cut for this exact rule during M0's own T-015..T-020.

```
$ cd backend && uv run pytest -q
.........                                                                [100%]
9 passed in 0.79s
exit=0
```
Non-zero collected (TST-01). Containers confirmed healthy first: `momus-db-1 healthy`, `momus-redis-1 healthy`. Every assertion in `tests/test_settings.py` and `tests/test_celery.py` was opened and read — none merely checks that a call did not raise (TST-06).

```
$ pnpm --dir frontend test
 Test Files  1 passed (1)
      Tests  2 passed (2)
exit=0
```
Non-zero collected (TST-05).

```
$ ls -l assets/*.png
avatar.png  mascot-human.png  mascot-raven.png  wordmark.png
```
SPC-15, all four present.

```
$ pnpm --dir frontend typecheck
$ next typegen && tsc --noEmit
Generating route types...
Types generated successfully
exit=0
```
BLD-02.

```
$ pnpm --dir frontend lint
$ eslint --max-warnings 0
exit=0
```
BLD-03.

`pnpm --dir frontend build` (BLD-01) was not run in this audit: it writes `frontend/.next/`, which the write restrictions forbid regardless of the path being gitignored. Evidence instead comes from the live CI run below, which ran the identical command on a clean checkout minutes before this audit.

```
$ cd backend && uv run ruff check .
All checks passed!
exit=0

$ uv run ruff format --check .
10 files already formatted
exit=0
```
BLD-04, non-zero files, not the false pass.

```
$ uv run python manage.py check
System check identified no issues (0 silenced).
exit=0

$ uv run python manage.py makemigrations --check --dry-run
No changes detected
exit=0
```
BLD-05.

```
$ uv run python -c "import sys; print(sys.prefix)"
C:\Users\nwank\Desktop\sten_lab\momus-collective\backend\.venv
```
BLD-06, project-local, not the borrowed waitlist-BE env.

```
$ gh run list --branch m0-foundation --limit 4
completed success  ci        36232674770   35s
completed success  security  36232674772   1m0s
completed success  security  36232575707   39s
completed success  ci        36232575698   1m11s

$ gh run view 36232674770
frontend build, types, lint, test  in 31s  (success)
backend check, lint, format, test  in 28s  (success)

$ gh run view 36232674772
CI-SEC-01 secret scan (gates)        8s  (success)
CI-SEC-03 ruff S ruleset (reports)   7s  (success)
CI-SEC-02 semgrep (reports)         22s  (success)
CI mirrors verify checklist          6s  (success)
CI-SEC-04 eslint security (reports) 17s  (success)
CI-SEC-05 dependency audit (reports) 17s  (success)
Security report                      9s  (success)
```
BLD-07: both workflows currently green on `m0-foundation`'s HEAD, including `frontend build` (satisfying BLD-01 without a local write) via the CI job.

```
$ grep -E '^\| T-0[0-2][0-9] \|' docs/TODO.md
```
All 20 rows state `[x]`.

```
$ sed -n M0 DoD table in docs/MILESTONES.md
```
All 15 rows state `[x]`.

API-06: verified true for M0. Both trackers were spot-checked, not just grepped: `docs/TODO.md` rows for T-011 and T-014 carry pasted command output and worker-log task-ID matches, not bare claims.

```
$ git status --porcelain
(clean, before this report and docs/TODO.md were written)
```

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1 Security and input trust | not verified (partial pass) | SEC-11 and SEC-12 pass on inspection of `backend/config/settings.py`: no secret committed, no hardcoded fallback, `DEBUG` defaults `False`, `ALLOWED_HOSTS` is not `["*"]`. SEC-01..10, 13, 14, 15 have no code yet (no webhook, no admin routes, no order/design models) — correctly out of M0's scope, not a pass. All 5 CI-SEC scanners now run against real targets and pass, including CI-SEC-02 after its fix. |
| 2 Efficiency | not verified | No list endpoints exist. Wholly out of M0's scope. |
| 3 DRY and layering | fail (major) | DRY-07 fails twice (findings 1-2), both Django-generated boilerplate the M0 comment-cutting pass (T-015..T-020) missed because it targeted only `.github/`. DRY-01..06 have no code yet. |
| 4 Tests | pass (scoped) | TST-01 and TST-05 both collect non-zero and pass; TST-06 confirmed by reading every assertion. TST-02/03/04 have no payment/auth/admin-authz code yet. |
| 5 Spec conformance | pass (scoped) | SPC-15 passes: all four PNGs present at the PRD's paths. All 8 prohibited-scope greps clean; `USE_I18N = True` investigated and found to be Django's inert default, not built i18n. SPC-01..14, 16, 17 have no implementation; SPC-06 belongs to FR-DES-09 (design tool), not M0. |
| 6 Build and types | pass | BLD-02..06 all pass directly. BLD-01 evidenced via the live CI run rather than a local `pnpm build` (forbidden by this skill's write restrictions). BLD-07: both workflows green on the current HEAD. |
| 7 Client contract and acceptance | pass (scoped) | API-06 verified true: all 20 M0 tasks and all 15 DoD rows are `[x]` with pasted proof, spot-checked for substance. API-01..05, 07, 08 have no routes, pages, or notification code yet. |

M0's completion gate needs this header to name `M0 - Foundation` with zero blockers — it does. The two `major` DRY-07 findings do not block: per this skill's severity table, only `blocker` prevents completion, and DRY-07 is explicitly `major`, "fixed before the milestone is called done" but not a hard gate on its own. `/implement` should still fix both before marking M0 `complete`, since the checklist's own language treats an outstanding `major` DRY-07 as unfinished business for the milestone, not a passable gap.
