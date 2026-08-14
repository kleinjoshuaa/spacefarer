# AGENTS.md

## Cursor Cloud specific instructions

Spacefarer is an npm-workspace monorepo (`shared`, `backend`, `frontend`). See
`README.md` for the product overview, standard commands, env vars, and the API
reference. The notes below cover only non-obvious things for developing here.

### Services & how to run them

The repo ships a committed `.cursor/environment.json` (repo-managed
environment). Its `install` runs `npm install && npm run build --workspace
@spacefarer/shared`, and it launches two long-running `terminals`:

| Service  | Command (from repo root)   | Port | Notes |
| -------- | -------------------------- | ---- | ----- |
| backend  | `npm run dev:backend`      | 8787 | Fastify + `tsx watch` (hot reload). Authoritative galaxy/commander state. |
| frontend | `npm run dev:frontend`     | 5173 | Vite + React + Phaser. Dev server proxies `/api` → backend, so only 5173 needs to be opened in the browser. |

`npm run dev` (root) runs both together via `concurrently`. Open
http://localhost:5173 to play.

### Static checks / tests

- There is **no ESLint**; `npm run typecheck` (tsc `--noEmit` across all three
  workspaces) is the static-analysis gate.
- `npm test` runs the deterministic-generation vitest suite in `shared` only.

### Non-obvious gotchas

- `@spacefarer/shared` is consumed via export conditions: dev tooling (`tsc`,
  and the backend's `tsx watch --conditions=development`) resolves it from
  `shared/src`, while the built `dist` is only needed for the production path
  (`node backend/dist/server.js`). `install` builds `shared` so the production
  path and type resolution both work; a normal `npm run dev` picks up edits to
  `shared` without a manual rebuild.
- Commander saves are persisted as JSON files under `backend/data/`
  (gitignored). Delete that directory to reset all commander state.
- Known pre-existing gameplay bug (unrelated to environment setup): on
  `NEW GAME` the starter ship is destroyed by a hostile within ~1–2s at the
  spawn system and auto-docks via escape pod, and `POST /api/commander/:id/repair`
  returns HTTP 500 — so browser flight/combat currently soft-locks. To validate
  the client+server core loop, use the **trading** flow (dock → Market → buy/sell)
  or the REST API directly; both work correctly.
