# momus collective storefront

Single-tenant e-commerce storefront. `momus collective — Storefront PRD.md` is
normative and read-only. `docs/MILESTONES.md` and `docs/TODO.md` are the source
of truth for build state — `/implement` and `/verify` read them in full.

## Code comments

Code comments MUST be as minimal as possible, with a **maximum of 5 lines** per
comment block.

Prefer no comment when the code is self-explanatory. When a comment earns its
place, write the shortest form that conveys the non-obvious reason — why, not
what. Applies to TypeScript and Python alike, and to docstrings.

## Layout

Monorepo: `frontend/` (Next.js 14+, TypeScript, Tailwind), `backend/` (Django,
DRF, Python 3.12+), `assets/` at the root. Backend proof commands always name
their directory — a bare `uv run` from the root resolves to an unrelated
virtualenv.

## Branching

Base `main`, never committed to directly. One branch per milestone, PR opened
when the milestone's last task is proved, never self-merged.
