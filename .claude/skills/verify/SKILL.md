---
name: verify
description: Audits momus collective storefront across security, efficiency, DRY and layering, tests, spec conformance, build and types, and client contract. Writes a severity-ranked findings table to docs/VERIFICATION.md. Reports only; touches code only when invoked with --fix. Use before marking a milestone complete, or when asked to audit, review, or check the project.
argument-hint: [milestone] [--fix]
---

# /verify

Audits what actually exists against `momus collective — Storefront PRD.md`
(normative) and `docs/MILESTONES.md`. Produces `docs/VERIFICATION.md`.

This skill **reports**. It is the independent check that gates milestone
completion in `/implement`, and a check that quietly repairs what it is meant to
be measuring is not a check.

## Rule zero: disclose your own deviations

If you depart from this skill's process in any way, say so **in the turn it
happens, before you report any findings or any success**, under
`Process deviations this run`. This includes:

- writing, creating, or deleting any file other than `docs/VERIFICATION.md` and
  `docs/TODO.md`
- running any part of the checklist against a subset without saying so
- reporting a finding you did not confirm by opening the file
- being unable to run a command the audit depends on
- fixing anything at all without `--fix`

If there were none, write `Process deviations this run: none.` Never omit the
line, and never place it after a summary.

## Write restrictions

Without `--fix`, you may write exactly two files:

- `docs/VERIFICATION.md`
- `docs/TODO.md` (findings queued as tasks, blockers, decisions; append only)

**No other file may be created, modified, or deleted. This includes scratch
files, temp notes, analysis scratchpads, generated reports, and files you intend
to delete in the same turn.** A file created and removed before the turn ends is
still a violation. Hold intermediate analysis in your reasoning, not on disk.

Read-only commands are fine and expected. Anything that writes to the working
tree is not: no `ruff format` without `--check`, no `ruff check --fix`, no
`pnpm lint --fix`, no `prettier --write`, no `pnpm --dir frontend build` (it
writes `.next/`), no `manage.py makemigrations` without `--check --dry-run`, no
`manage.py migrate`, no `git add`, no `git commit`, no `git stash`.

Tool byproducts (cache directories, coverage files) are not authored files. They
are acceptable if version-control-ignored. If they show up in
`git status --porcelain`, say so and note that the repo needs an ignore entry;
that is itself a finding.

### Prove it

End every run with:

```bash
git status --porcelain
```

Paste the output verbatim. Without `--fix`, the only paths that may appear are
`docs/VERIFICATION.md` and `docs/TODO.md`. Anything else is a process deviation
and you disclose it under rule zero, at the top of the reply, before the
findings.

## Running the audit

The full checklist lives in `references/checklist.md`. **Read it before
auditing.** Its dimensions:

1. Security and input trust
2. Efficiency
3. DRY and layering
4. Tests
5. Spec conformance
6. Build and types
7. Client contract and acceptance

Work them in that order. Security first because its findings are the ones that
block.

### Scope

Default scope is the whole project. If invoked with a milestone, audit that
milestone's code, plus every cross-cutting item in the checklist that its code
touches. State the scope in the header. An audit that silently narrows its scope
produces a header that lies to the gate in `/implement`.

Milestone names are spelled exactly as `docs/MILESTONES.md` spells them.

### Evidence standard

Every finding must name `file:line` and must be confirmed by opening the file.
Grep output alone is a lead, not a finding. If you cannot confirm it, either drop
it or file it as `minor` with the uncertainty stated in the note.

Run the commands the checklist calls for and paste their real output. If a
command cannot run, say which and why, and mark the dimensions it covered as
`not verified` rather than `pass`. Never infer a pass from unrun tooling.

**Two project-specific false passes to refuse:**

- `uv run ruff check .` printing `All checks passed!` after
  `warning: No Python files found under the given path(s)` is `not verified`,
  not `pass`. Confirm it inspected files.
- `pytest` reporting `collected 0 items` is `not verified`, not `pass`.

### Checks the checklist does not cover

The checklist's `Gaps` section lists dimensions where no check could be derived.
**Report those as `not verified`, never as `pass`.** A dimension with no checks
has not been audited, and recording it as passing is the failure mode this whole
pattern exists to prevent.

At scaffold time the `Gaps` section is empty: all five open questions were
resolved by the user and became `[user]`-tagged checks. If a later run adds a
gap, that section governs again.

### Severity

| Severity | Meaning |
|---|---|
| `blocker` | Exploitable, data-losing, or a hard spec violation. The milestone cannot complete. |
| `major` | Real defect or clear spec deviation. Should be fixed before the milestone is called done, but does not by itself make the system unsafe. |
| `minor` | Style, clarity, small duplication, missing docstring, weak test naming. |

Do not inflate to look thorough. Do not deflate to clear a gate. A run finding
zero blockers should be a run that actually looked.

**These always start at `blocker`, never lower:**

- A Paystack webhook path that touches order state before verifying the
  HMAC-SHA512 signature, or that does not verify it at all.
- An admin endpoint reachable by an authenticated non-admin, or one with no
  explicit DRF permission class.
- An order total, price, or discount taken from client input rather than
  recomputed server-side.
- A secret committed to the repository, or a secret read with a hardcoded
  fallback default.
- Money stored or computed as a float.
- Any out-of-scope Phase 2 capability found built (see the checklist's
  prohibited-scope greps).
- Customer PII (phone, email, address) written to logs or returned on an
  endpoint that does not require the owning user.

**These always start at `major`, never lower:**

- A list endpoint whose query count grows with page size.
- A public page rendered client-side that NFR-03 requires server-rendered.
- A design file generated below the 300 DPI floor FR-DES-09 sets.
- A comment block longer than 5 lines (DRY-07).

## VERIFICATION.md

Overwrite the file each run. The header is what `/implement` reads to decide
whether a milestone may be marked complete, so it must be exact and it must be
first.

```markdown
# Verification Report

**Milestone:** <exact milestone name from docs/MILESTONES.md, or `full project`>
**Scope:** <what was audited>
**Date:** <YYYY-MM-DD>
**Blockers:** <integer>
**Major:** <integer>
**Minor:** <integer>
**Verdict:** <PASS if blockers is 0, otherwise FAIL>
**Dimensions not verified:** <none, or which and why>

## Findings

| # | Severity | Dimension | Location | Finding | Remediation |
|---|---|---|---|---|---|

Ranked: blockers first, then major, then minor.

## Commands run

<verbatim output of every command the audit depended on>

## Dimension summary

| Dimension | Result | Notes |
|---|---|---|
```

The `Milestone` field must name the milestone exactly as `docs/MILESTONES.md`
spells it. `/implement` matches on it. A mismatched or vague name means the gate
cannot clear, which is the correct failure direction.

After writing, append the findings to `docs/TODO.md` as tasks in the queue, each
with an ID in the milestone's band, and file any blocker in the Blockers table.
Append only; never rewrite existing rows.

## --fix

Only with `--fix` may you change code, and then only:

- findings already written to `docs/VERIFICATION.md` in this same run
- `blocker` and `major` severities; leave `minor` findings queued in
  `docs/TODO.md`
- one commit, scoped to the fixes

Re-run the proof commands after fixing and paste the output. Then update
`docs/VERIFICATION.md` with the post-fix counts and append a Change log row to
`docs/TODO.md`. Finish with `git status --porcelain` as usual; with `--fix` the
touched source files are expected to appear there.

If a fix would require a design decision the spec does not settle, do not guess.
Leave the finding open, record it in the Blockers table, and say so.

## Reply shape

```
Process deviations this run: <none, or the list>

Scope: <what was audited>
Verdict: <PASS or FAIL> - <n> blockers, <n> major, <n> minor

<the findings table, or the top findings if long>

Commands run:
<pasted verbatim output>

<pasted git status --porcelain>
```
