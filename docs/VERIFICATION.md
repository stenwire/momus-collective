# Verification Report

**Milestone:** full project
**Scope:** Whole repository at commit `92fd9f3` on `main`. The only files that exist are trackers, the PRD, `.github/workflows/security.yml`, two `.github/scripts/` Python files, `.gitleaks.toml`, `.gitignore` and four `assets/*.jpg`. There is no `frontend/` and no `backend/`. All seven checklist dimensions were attempted; those requiring built code could not run.
**Date:** 2026-09-26
**Blockers:** 0
**Major:** 7
**Minor:** 2
**Verdict:** PASS
**Dimensions not verified:** 1 Security (partial — SEC-01..SEC-10, SEC-12..SEC-15 have no code to audit; SEC-11 verified clean; CI-SEC-02..05 unverified per B-007), 2 Efficiency (wholly — no endpoints, no frontend), 3 DRY and layering (partial — DRY-01..DRY-06 have no code; DRY-07 verified and failing), 4 Tests (wholly — `pytest` collected 0, no frontend suite), 5 Spec conformance (partial — SPC-01..SPC-14, SPC-16, SPC-17 have no implementation; SPC-15 verified and failing; PRO-01..PRO-08 verified clean), 6 Build and types (wholly — BLD-01..BLD-05 cannot run, BLD-06 confirms the wrong interpreter), 7 Client contract (partial — API-01..API-05, API-07, API-08 have no code; API-06 verified and failing).

**Read the verdict with its counts.** `PASS` here means zero blockers were found, not that the project is sound. Nothing is built: fourteen of fifteen input-trust checks, every efficiency check, every test check and every build check had no code to run against. A `PASS` over an empty tree is the arithmetic of the gate, not evidence of quality. No milestone may be marked complete on this report — M0's own Definition of Done is 0/15.

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|
| 1 | major | 5 Spec conformance | `assets/wordmark.jpg`, `assets/avatar.jpg`, `assets/mascot-human.jpg`, `assets/mascot-raven.jpg` | SPC-15 fails. The PRD's Brand Assets section (lines 25, 27, 29, 31) names `assets/wordmark.png`, `assets/avatar.png`, `assets/mascot-human.png`, `assets/mascot-raven.png`. Only `.jpg` exists; `ls -l assets/*.png` returns `No such file or directory`. Confirmed by opening the PRD and listing the directory. | Convert all four to `.png` at the PRD paths per D-006 (task T-012). Transparency matters — these are line art, so this is not a rename. |
| 2 | major | 3 DRY and layering | `.github/scripts/check-ci-mirrors-checklist.py:2-12` | DRY-07 fails. Module docstring is 10 lines against the 5-line cap. | Cut to 5 lines or fewer, keeping the non-obvious reason (ID linkage only, no command comparison). |
| 3 | major | 3 DRY and layering | `.github/scripts/check-ci-mirrors-checklist.py:28-35` | DRY-07 fails. `ids_in_job_names` docstring is 7 lines against the 5-line cap. | Cut to 5 lines or fewer, keeping why it parses rather than greps. |
| 4 | major | 3 DRY and layering | `.github/scripts/render-security-report.py:2-11` | DRY-07 fails. Module docstring is 9 lines against the 5-line cap. | Cut to 5 lines or fewer. |
| 5 | major | 3 DRY and layering | `.github/workflows/security.yml:1-26` | DRY-07 fails. Header comment block is 26 lines against the 5-line cap — the single largest violation in the repo. | Cut to 5 lines or fewer. The gating-posture rationale is already recorded as decision D-016 in `docs/TODO.md`; the file needs a pointer, not a duplicate. |
| 6 | major | 3 DRY and layering | `.github/workflows/security.yml:98-106`, `:222-230` | DRY-07 fails. Two 9-line comment blocks (the `--redact`/gate rationale, and the deliberate-overlap note). | Cut each to 5 lines or fewer. |
| 7 | major | 3 DRY and layering | `.gitleaks.toml:1-8`, `:23-30` | DRY-07 fails. Two 8-line comment blocks (the baseline header and the allowlist-discipline note). | Cut each to 5 lines or fewer. |
| 8 | minor | 3 DRY and layering | `.github/workflows/security.yml:364-369` | DRY-07 fails at the margin — a 6-line comment block on the write-scoped `report` job checkout. Filed `minor` rather than `major` because it is one line over and the content is a genuine security warning to reviewers; the letter of DRY-07 still makes it a violation. | Cut one line. |
| 9 | minor | 7 Client contract | `docs/MILESTONES.md` M0 Definition of Done | API-06 fails by design at this stage: 0 of 15 M0 criteria are `[x]` and no proof is pasted in `docs/TODO.md`. Recorded so the gate has a written trace, not as a defect — no `/implement` run has occurred. | No action. Clears as M0 tasks land with pasted proof. |

### Not raised as findings

`.pytest_cache/` and `.ruff_cache/` appear in `git status --porcelain --ignored` as `!!`, meaning `.gitignore` already covers them. Tool byproducts, correctly ignored, not a finding.

## Commands run

```
$ ls -d frontend backend
ls: cannot access 'frontend': No such file or directory
ls: cannot access 'backend': No such file or directory

$ ls -l assets/
total 7184
-rw-r--r-- 1 nwank 197610 1682253 Sep 26 06:50 avatar.jpg
-rw-r--r-- 1 nwank 197610 2235114 Sep 26 07:02 mascot-human.jpg
-rw-r--r-- 1 nwank 197610 2404047 Sep 26 06:59 mascot-raven.jpg
-rw-r--r-- 1 nwank 197610 1029217 Sep 26 06:49 wordmark.jpg

$ ls -l assets/*.png                                    # SPC-15
ls: cannot access 'assets/*.png': No such file or directory
```

### Prohibited scope — all eight clean, zero matches

```
$ rg -nwi "printful|printify|afrprint|jaraprint" --glob '!*.md'          # PRO-01
exit=1
$ rg -nw "tenant|tenant_id|storefront_builder" --glob '!*.md'            # PRO-02
exit=1
$ rg -nw "currency|exchange_rate|USD|EUR|GBP" --glob '!*.md'             # PRO-03
exit=1
$ rg -nw "layers|freeDrag|free_drag|backPlacement|back_placement|imageUpload" --glob '!*.md'   # PRO-04
exit=1
$ rg -nw "inventory|stock_count|stock_level|reorder_point" --glob '!*.md'    # PRO-05
exit=1
$ rg -nwi "abandoned_cart|abandonedCart|cart_reminder" --glob '!*.md'        # PRO-06
exit=1
$ rg -nw "referral_code|affiliate|subscription_plan|billing_cycle|recurring_charge" --glob '!*.md'   # PRO-07
exit=1
$ rg -nwi "instagram_shop|tiktok_shop|i18n|gettext|ab_test|experiment_variant" --glob '!*.md'        # PRO-08
exit=1
```

`exit=1` is ripgrep's no-match code. These are genuine passes: the greps ran
over a real (if small) tree. Note the standing caveat from the checklist — an
identifier grep is blind to a capability described only in English prose.

### Secret scan (SEC-11)

```
$ rg -n "sk_live|sk_test|PAYSTACK_SECRET_KEY\s*=\s*[\"']" --glob '!*.md'
exit=1
```

Clean. Corroborated by the scaffolding run of gitleaks 8.30.1 over full history
(3 commits, no leaks). No environment-variable read sites exist yet, so the
"no hardcoded fallback default" half of SEC-11 is not yet testable.

### Frontend — BLD-01, BLD-02, BLD-03, TST-05 all `cannot run`

```
$ pnpm --dir frontend build
[ERROR] ENOENT: no such file or directory, lstat 'C:\Users\nwank\Desktop\sten_lab\momus-collective\frontend'
$ pnpm --dir frontend typecheck
[ERROR] ENOENT: no such file or directory, lstat 'C:\Users\nwank\Desktop\sten_lab\momus-collective\frontend'
$ pnpm --dir frontend lint
[ERROR] ENOENT: no such file or directory, lstat 'C:\Users\nwank\Desktop\sten_lab\momus-collective\frontend'
$ pnpm --dir frontend test
[ERROR] ENOENT: no such file or directory, lstat 'C:\Users\nwank\Desktop\sten_lab\momus-collective\frontend'
```

Confirms blocker B-001 is still open.

### Backend — both named false passes reproduced

`cd backend` fails, so the checklist's backend commands cannot be run as
written. They were run from the repository root to capture what the false pass
looks like:

```
$ cd backend
/usr/bin/bash: line 1: cd: backend: No such file or directory

$ uv run pytest -q                                      # TST-01

no tests ran in 0.01s

$ uv run ruff check .                                   # BLD-04
All checks passed!
--- exit=0 ---

$ uv run python -c "import sys; print(sys.prefix)"      # BLD-06
C:\Users\nwank\.virtualenvs\waitlist-BE-fPoBPHaW
```

Three things, all recorded as `not verified`, never as `pass`:

- **TST-01** — zero tests collected. The checklist names this explicitly as a
  false pass. Confirms B-002.
- **BLD-04** — `All checks passed!` at exit 0 over zero Python files under this
  path. The checklist names this too. Confirms B-003.
- **BLD-06** — the interpreter is `waitlist-BE-fPoBPHaW`, an unrelated
  project's virtualenv. Confirms B-005 is live, exactly as D-012 predicted.
  Any backend result obtained this way measures the wrong environment.

`manage.py check` (BLD-05) was not attempted: `backend/` does not exist, so
there is no directory to run it from. Confirms B-004.

### CI drift gate

```
$ python .github/scripts/check-ci-mirrors-checklist.py
ok: 5 CI-SEC rules linked in both files
exit=0
```

A genuine pass. It ran, parsed both files, and compared five real IDs.

### Git state

```
$ git log --oneline
92fd9f3 Add security CI workflow: gating secret scan plus reporting scanners
04953df Raise DRY-07 comment-length severity from minor to major
9ce859c Add 5-line code comment cap to project conventions
2fba579 Scaffold tracker workflow: /implement, /verify, MILESTONES, TODO

$ git branch --show-current
main

$ git status --porcelain --ignored
!! .pytest_cache/
!! .ruff_cache/
```

### DRY-07 measurement

Python docstrings measured with `ast.get_docstring`; comment blocks in YAML and
TOML measured by counting consecutive `#` lines. Every location below was then
opened and read to confirm.

```
--- .github/scripts/check-ci-mirrors-checklist.py ---
  <module> @ line 1: docstring 10 lines  <-- OVER 5
  ids_in_job_names @ line 27: docstring 7 lines  <-- OVER 5
--- .github/scripts/render-security-report.py ---
  <module> @ line 1: docstring 9 lines  <-- OVER 5
--- .github/workflows/security.yml ---
  line 1: comment block of 26 lines
  line 98: comment block of 9 lines
  line 222: comment block of 9 lines
  line 364: comment block of 6 lines
--- .gitleaks.toml ---
  line 1: 8-line block
  line 23: 8-line block
```

Eight blocks over the cap across four files. No inline `#` block inside either
Python script exceeds 5 lines.

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
| 1 Security and input trust | not verified | SEC-11 passes (no secret in tree, corroborated by a full-history gitleaks run). SEC-01..SEC-10 and SEC-12..SEC-15 have no code: no webhook, no admin route, no serializer, no logging config, no storage layer. CI-SEC-01 is the one verified scanner; CI-SEC-02..05 remain unverified per open blocker B-007 — each would exit 0 having scanned nothing. The empty-scan guards in the workflow are the right shape, but a guard that has only ever fired on an empty tree is itself untested. |
| 2 Efficiency | not verified | Nothing to measure. No endpoint exists for EFF-01..EFF-03, no frontend for EFF-04..EFF-06, no Celery app for EFF-07, no build to run Lighthouse against for EFF-08. |
| 3 DRY and layering | fail | DRY-07 fails in eight places across four files — findings 2-8. DRY-01..DRY-06 are not verified: no pricing module, no delivery-fee rule, no status enum, no DRF views, no color lists exist yet. |
| 4 Tests | not verified | `pytest` collected 0 items and no frontend suite exists. Per the checklist this is a failure to verify, never a pass. TST-02..TST-04 and TST-06 have no tests to inspect. |
| 5 Spec conformance | fail | SPC-15 fails (finding 1) — assets are `.jpg`, the PRD names `.png`. All eight prohibited-scope greps pass clean, which is meaningful: no out-of-scope Phase 2 capability has crept in. SPC-01..SPC-14, SPC-16 and SPC-17 have no implementation to check. |
| 6 Build and types | not verified | BLD-01..BLD-03 cannot run (no `frontend/`). BLD-04 produced the documented false pass over zero files. BLD-05 cannot run (no `manage.py`). BLD-06 actively fails — the interpreter resolves to a borrowed virtualenv. BLD-07 is partially satisfied: a security workflow exists and its drift gate passes, but the M0 build/test workflow from task T-014 does not. |
| 7 Client contract and acceptance | not verified | API-06 fails as expected pre-build (finding 9). API-01..API-05, API-07 and API-08 have no routes, pages or notification code to audit. |

### What would make the next run meaningful

This audit's value is almost entirely in what it could not check. Landing M0
converts eleven of these rows from `not verified` into real results, and closes
B-001 through B-006. Until then, treat every `not verified` row as an open
question rather than a benign one.
