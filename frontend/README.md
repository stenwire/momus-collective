# frontend

Next.js 14+ App Router storefront: TypeScript, Tailwind, Zustand (client state),
TanStack Query (server state), Framer Motion, Canvas/Fabric.js for the design
tool.

Scaffolded by task T-003. Proof commands run from the repo root and name this
directory explicitly — `pnpm --dir frontend <script>` — never by assuming the
shell has already changed into it.

## `next build` requires a reachable backend

The homepage (`/`) and `/shop/[category]` are server-rendered: `next build`
fetches real data from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
during static generation. If the backend isn't reachable at build time, the
build **still exits 0** — TanStack Query silently drops a failed server
prefetch rather than throwing — but the static HTML it produces has an empty
loading shell instead of real content (T-217; see D-065).

Before running `pnpm --dir frontend build` for anything other than a quick
typecheck-adjacent sanity check, make sure `backend/` is migrated and its dev
server (or an equivalent) is running and reachable at that URL. CI starts the
backend and asserts real content landed in the build output for exactly this
reason — see `.github/workflows/ci.yml`'s `frontend` job.
