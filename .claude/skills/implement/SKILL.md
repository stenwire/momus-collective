---
name: implement
description: Drives the build for momus collective storefront. Reads the full docs/TODO.md and docs/MILESTONES.md as the source of truth, selects the next unblocked task, implements it, proves it with real command output, writes back to both trackers, and commits. Use when asked to build, continue, resume, or advance the implementation.
argument-hint: [TASK-ID]
---

# /implement

Drives the build for momus collective storefront, defined by
`momus collective — Storefront PRD.md` (normative) and `docs/MILESTONES.md`.

You are not free-associating from memory. `docs/MILESTONES.md` and `docs/TODO.md`
are the source of truth for what is done, what is next, and what was decided.
Read them before anything else, every single run, including runs where you
believe you already know the state.

## Rule zero: disclose your own deviations

If you depart from this skill's process in any way, say so **in the turn it
happens, before you report any success**, in a section headed
`Process deviations this run`. This includes:

- skipping or reordering any loop step
- ticking a task you could not prove
- editing files outside the task's declared scope
- running a different proof command than the one you announced
- committing with a dirty tree containing unrelated changes
- discovering mid-run that the tracker disagreed with reality
- reading only part of the task queue
- committing to a protected branch, or to a branch not cut from the base
- merging a pull request rather than stopping at it
- committing a task from one milestone to another milestone's branch
- finishing a milestone's last task without pushing and opening its pull request
  in the same run
- committing to a branch whose pull request has already merged
- adding or narrowing a check without testing it against a known failure

If there were none, write `Process deviations this run: none.` Do not omit the
line. A run that reports success without this line is a failed run.

**A deviation disclosed after the commit is disclosed too late.** These exist to
change what you do, not to annotate what you already did.

Never bury a deviation under a completion summary. It goes first.

## Selecting the task

Walk the queue from the top and select the first task where both hold:

1. Every ID in `Dep` is `[x]`.
2. No open Blockers row names it.

If the user names a task ID, work that one, and say so if its dependencies are
not met rather than silently proceeding.

If **no** task is workable, stop and report what each pending task is waiting on.
A run that produces no code because a blocker is open is a correct run, and
saying so is the useful output.

## Every run: the loop

Fixed order. No step is optional and no step may be merged into another.

### 1. Read the tracker first

Read `docs/MILESTONES.md` and `docs/TODO.md` in full before forming any plan. If
your memory of the state disagrees with the files, **the files win**. Say so in
the deviations section and continue from what the files say.

Read the entire queue, not just the row you intend to work. You need the
surrounding rows to evaluate the `Dep` column and to notice that a task you were
about to start is already `[~]`.

Check the Blockers table. If an open blocker sits on the task you were about to
do, do not work around it silently. Either work a different unblocked task, or
stop and ask.

### 2. Announce the task

State the task ID, the milestone, what you are about to build, and the exact
command you will use to prove it. One task per run unless the tasks are trivially
small and share a proof command. Mark it `[~]` in `docs/TODO.md` before you
start.

### 3. Implement it

Follow the spec documents literally. The binding constraints:

**Repository layout.** Monorepo. `frontend/` holds the Next.js app, `backend/`
holds the Django project. Assets stay at `assets/` in the repo root. Proof
commands run from the repo root using `--dir` or an explicit `cd`; never assume
the shell is already in the right subdirectory.

**Stack, as the PRD fixes it.** Frontend: Next.js 14+ App Router, TypeScript,
Tailwind CSS, Zustand for client state, TanStack Query for server state, Framer
Motion, HTML5 Canvas or Fabric.js for the design tool. Backend: Django + Django
REST Framework, Python 3.12+, Celery + Redis. Database: PostgreSQL. Payments:
Paystack. Email: Resend. Do not substitute a library the PRD names without
recording a Decisions row.

**Python environment.** The backend uses a project-local `uv` environment under
`backend/`. A bare `uv run` from the repo root resolved to an unrelated
virtualenv during scaffolding, so every backend proof command names its
directory explicitly. A pass from the wrong interpreter is not a pass.

**API contract.** All DRF routes live under `/api/v1/`. Within `v1`, adding a
field or an endpoint is additive and allowed. Removing or renaming a field,
tightening validation on an existing field, or changing a status code is
breaking and requires `v2`. The frontend is the only client; it still may not
depend on an undocumented field.

**Admin authorization.** Admin access is Django's `is_staff` on the User model.
Every admin endpoint asserts a DRF permission class: authenticated non-admin
gets `403`, anonymous gets `401`. There is no admin route without an explicit
permission class.

**Paystack webhook.** The webhook handler verifies an HMAC-SHA512 of the raw
request body against the `x-paystack-signature` header using the Paystack secret
key, compared in constant time. A missing or mismatched signature is rejected
with `401` **before any order state is touched**. Never parse the body into an
order first and verify afterwards.

**Money.** All prices are NGN. Store money as integer minor units or
`Decimal`; never as a float. `Order.total` is computed server-side from
server-held prices. A price arriving from the client is input to validate, never
a value to trust.

**Query budget.** List endpoints issue a constant number of queries regardless
of page size. The product grid in particular must `select_related`/
`prefetch_related` its category and tags. New list endpoints ship with an
`assertNumQueries` test.

**Tests.** No global coverage percentage. The gate is: tests actually collect
(non-zero), and every payment, authentication, and admin-authorization path has
a test. Zero tests collected is never a pass.

**Mobile-first (NFR-01).** Every feature, the design tool included, works at
360px. Touch targets are at least 44x44px.

**Accessibility (NFR-05).** Semantic HTML, alt text on every product image,
keyboard navigation, and contrast ratios checked against the dark theme.

### Traps: things that look like bugs and are not

- **`FR-NOT-05` appears in the Notifications section but is out of scope.** Its
  own heading marks it "(Phase 2)" and the Out of Scope list repeats it. The gap
  in the `FR-NOT` sequence is intentional. Do not build abandoned-cart email, and
  do not "fix" the numbering.
- **The PRD says `.png` for brand assets; the files on disk are `.jpg`.** This is
  a known mismatch resolved by an M0 conversion task, not a typo to work around.
  Until that task is `[x]`, code referencing `assets/*.png` will not resolve.
- **`Product.is_custom` is false for catalog products.** A custom design is not a
  `Product` row; it is a `SavedDesign` referenced by `CartItem.saved_design_id`.
  `CartItem` and `OrderItem` each carry two nullable FKs and exactly one is set.
- **`Order.shipping_address` is a JSON snapshot, not an FK.** It deliberately
  does not follow the customer's saved `Address` if they later edit it. An order
  must record where it actually shipped.
- **Guest carts are keyed by `session_id`, not `user_id`.** On login the
  localStorage cart merges into the server cart (FR-CART-01). Merge, do not
  overwrite; a logged-in user with an existing server cart must not lose it.

Nothing may be built for anything out of scope: multi-tenant or storefront-builder
features; POD API integration (Printful, Printify, AfrPrint, JaraPrint);
international shipping or multi-currency pricing; full canvas editing (image
upload, layers, free-drag positioning, back-of-shirt placement); inventory
management; shipping-rate calculators or courier APIs; abandoned-cart email
(FR-NOT-05); referral or affiliate programs; Instagram/TikTok shop integrations;
multi-language support; A/B testing; subscription or monthly-drop models; native
mobile apps.

If the spec does not say, **ask rather than assume**. If asking would stall the
whole run, pick the smallest reversible option, implement it, and record it in
the Decisions table the same run. Do not let an unrecorded assumption survive the
turn.

### 4. Prove it

A task is never ticked on inspection. Run a real command and paste its real
output into your reply. Reading the code you just wrote is not proof. Believing
it works is not proof.

Pick the proof that actually exercises the claim:

| What you built | Proof command |
|---|---|
| Backend model, serializer, view, or task | `cd backend && uv run pytest -q` |
| A specific backend behaviour | `cd backend && uv run pytest path/to/test.py::test_name -v` |
| Django settings, migrations, or app wiring | `cd backend && uv run python manage.py check` then `uv run python manage.py makemigrations --check --dry-run` |
| Backend lint or format | `cd backend && uv run ruff check .` and `uv run ruff format --check .` |
| Query-count regression on a list endpoint | `cd backend && uv run pytest -q -k num_queries` |
| Paystack webhook signature handling | `cd backend && uv run pytest -q -k webhook` (must cover unsigned and wrong-signature rejection) |
| Admin authorization boundary | `cd backend && uv run pytest -q -k authz` (must cover 401 anonymous and 403 non-admin) |
| Frontend component or hook | `pnpm --dir frontend test` |
| Frontend types | `pnpm --dir frontend typecheck` |
| Frontend lint | `pnpm --dir frontend lint` |
| Frontend builds and routes render | `pnpm --dir frontend build` |
| Asset files exist at the paths the code uses | `ls -l assets/` |
| Anything touching CI | the workflow run, or `act` locally; not the YAML read back |

Rules for proof:

- Paste the output verbatim. Do not summarize it, do not retype it, do not
  paraphrase a pass.
- If the command fails, the task is not done. Fix it, or mark `[~]` with the
  failure recorded, or open a blocker. Never tick through a failure.
- If you cannot run the command, the task stays `[~]` with a note naming the
  exact command that could not run and why. That is a normal outcome. Claiming
  success instead is not.
- Zero tests collected is not a pass. Say so.
- **A lint that passes over zero files is not a pass.** `ruff check .` reporting
  `All checks passed!` after `warning: No Python files found` proves nothing.
  Confirm the command actually inspected files.
- **A pass that depends on your machine is not a pass.** If the task touched
  settings, environment variables, or anything read at import, prove it the way
  CI and every container run it, not the way your shell happens to be configured.
  For this project specifically: confirm the backend command used
  `backend/`'s environment and not a virtualenv borrowed from elsewhere.
- **A new required variable is a breaking deployment change, and the run that
  adds it says so.** State it in the reply, under a heading a reader cannot miss,
  naming the variable and every deployment target that needs it before the next
  promotion. Passing CI is not evidence that a deployment will start. This
  applies to every secret this project needs: `PAYSTACK_SECRET_KEY`,
  `PAYSTACK_PUBLIC_KEY`, `RESEND_API_KEY`, `DATABASE_URL`, `REDIS_URL`.
- **A new or narrowed check must be tested against a known failure.** Run it once
  on a tree that violates the rule and confirm it fails, then on the clean tree
  and confirm it passes. A check verified in one direction only can be silently
  disarmed rather than narrowed.

### 5. Write back to both files

Both, every run, before the commit.

`docs/TODO.md`:
- Task state to `[x]` only with pasted passing output. Otherwise `[~]` plus a
  note naming what is unproven.
- Append one Change log row. Append only, newest at the bottom.
- Append any Decisions row for anything you chose that the spec did not dictate.
- Append or update Blockers.
- Add the next tasks discovered while working, using the `T-` prefix
  and the next free number in that milestone's band. Never reuse a retired ID.

`docs/MILESTONES.md`:
- Milestone `not started` to `in progress` on its first task.
- Milestone to `awaiting verify` when every task in it is `[x]` and every
  Definition-of-Done row is `[x]`.
- `Status` to `complete` only under the gate below.

### 6. Commit

Base branch is `main`, and `main` is never committed to directly.

One branch per milestone, cut from `main`, named for the milestone:
`m0-foundation`, `m1-data-models-and-auth`, `m2-catalog-and-storefront`,
`m3-custom-design-tool`, `m4-cart-checkout-and-payment`,
`m5-admin-pipeline-notifications-and-reviews`.

When a milestone's last task is proved and both trackers are written, push the
branch and open its pull request **in the same run**. Stop there. Do not merge
it yourself.

One commit per run, scoped to that run's work. Then run `git status --porcelain`
and paste the output. If files you did not intend are in the commit, say so in
the deviations section.

**A task from a different milestone than the current branch is not workable.**
Cut the new milestone's branch from the current base first, in its own run, and
say so. Never commit it to the branch you happen to be standing on.

**If the selected task depends on work sitting in an unmerged pull request, stop
before writing any code.** Do not branch from the unmerged branch, do not
cherry-pick from it, and do not rebuild the same work. Report which pull request
blocks which task and ask.

## The completion gate

A milestone moves to `complete` only when **all** of these hold:

1. Every task for that milestone in `docs/TODO.md` is `[x]` with pasted proof.
2. Every Definition-of-Done row for that milestone is `[x]`.
3. `/verify` has been run for that milestone.
4. `docs/VERIFICATION.md` exists, and **its header names that milestone** and
   records **zero blockers**.

**Re-read the `docs/VERIFICATION.md` header immediately before you write
`complete`.** Not earlier in the run, not from memory of a previous run, not from
what you believe `/verify` concluded. Open the file, read the header, then write.

If the header names a different milestone, or shows any blocker count above zero,
or the file does not exist: the milestone stays `awaiting verify`. Say why.

Marking a milestone complete without this check is the most serious failure this
skill has. Disclose it immediately if it happens.

## Handling a mid-run discovery

If you find that the tracker claims something is done and it is not:

1. Stop the current task.
2. Correct the tracker state to reflect reality.
3. Append a Change log row recording the correction.
4. Disclose it in the deviations section.
5. Then decide whether to fix the gap now or queue it.

Never quietly re-implement something the tracker calls done. The correction is
part of the record.

## Reply shape

```
Process deviations this run: <none, or the list>

Selected: <task ID>, milestone <N>
Branch: <branch, and whether it was created this run or already existed>
Skipped: <task IDs and why, or none>

Task: <ID>, <what>
Proof command: <exact command>

<pasted verbatim output>

Tracker: <what changed in docs/TODO.md and docs/MILESTONES.md>
Commit: <sha and subject>
<pasted git status --porcelain>

Next: <task ID and what it is>
```
