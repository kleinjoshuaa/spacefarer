# Spacefarer

An [Elite](https://en.wikipedia.org/wiki/Elite_(video_game))-inspired procedural
space trading and combat game that runs in the browser, backed by a small galaxy
service. Everything — star systems, planets, economies, and markets — is
generated deterministically from a single seed, so the browser client and the
backend always agree about the universe without shipping it wholesale.

The visual style is deliberately 8-bit: a tiny internal render resolution, a
small chunky palette, and pixel-art sprites painted procedurally in code (no
binary art assets), evoking the NES / Sega Master System era.

## Why a backend?

The game is intentionally split so that changes can span both tiers, which makes
it a good sandbox for demoing workflows that touch a client and a service at
once:

- The **backend** owns the galaxy seed, generates systems/markets, and is the
  authority for the commander's state (credits, cargo, fuel, hull, kills). Trades,
  jumps, refuelling, repairs, and combat outcomes are all validated and persisted
  server-side.
- The **frontend** renders the galaxy and simulates moment-to-moment flight and
  combat, then reports outcomes to the backend.
- The **shared** package holds the deterministic RNG and world-generation code
  imported by both, so a change to generation logic naturally affects both tiers.

## Project layout

```
spacefarer/
├── shared/     # Deterministic RNG + galaxy/market generation (used by both tiers)
├── backend/    # Fastify galaxy service + commander persistence (REST API)
└── frontend/   # Vite + React + Phaser browser client (8-bit style)
```

## Getting started

Requires Node 20+ (developed on Node 22).

```bash
npm install        # install all workspaces
npm run dev        # run backend (:8787) and frontend (:5173) together
```

Then open http://localhost:5173. The Vite dev server proxies `/api` to the
backend automatically.

### Production / single-service mode

```bash
npm run build                 # build shared, backend, and frontend
node backend/dist/server.js   # serves the API and the built frontend on :8787
```

When `frontend/dist` exists, the backend also serves the static client, so the
whole game runs from one service on port 8787.

## Controls

- **Arrow keys / WASD** — steer and thrust
- **Space** — fire
- **Enter** — dock (when close to a station and moving slowly)

Fly to the station, dock, then trade commodities, plot hyperspace jumps on the
star chart, refuel, and repair.

## Configuration

Backend environment variables:

| Variable       | Default            | Description                                |
| -------------- | ------------------ | ------------------------------------------ |
| `GALAXY_SEED`  | `spacefarer-prime` | Seed string for the galaxy (hashed).       |
| `SYSTEM_COUNT` | `256`              | Number of systems (clamped 16–1024).       |
| `PORT`         | `8787`             | HTTP port.                                 |
| `HOST`         | `0.0.0.0`          | Bind host.                                 |
| `DATA_DIR`     | `backend/data`     | Where commander saves are written.         |

## API overview

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/health`                 | Health check + market epoch.         |
| GET    | `/api/galaxy`                 | Galaxy metadata + all system summaries. |
| GET    | `/api/system/:id`             | Full system detail.                  |
| GET    | `/api/system/:id/market`      | Current market for a system.         |
| POST   | `/api/commander`              | Create a commander.                  |
| GET    | `/api/commander/:id`          | Load a commander.                    |
| POST   | `/api/commander/:id/buy`      | Buy cargo (server-validated).        |
| POST   | `/api/commander/:id/sell`     | Sell cargo.                          |
| POST   | `/api/commander/:id/jump`     | Jump to a neighbouring system.       |
| POST   | `/api/commander/:id/refuel`   | Buy fuel.                            |
| POST   | `/api/commander/:id/repair`   | Repair hull.                         |
| POST   | `/api/commander/:id/combat`   | Report combat outcome (kills/damage).|

## Testing

```bash
npm test          # runs the deterministic-generation test suite (shared)
npm run typecheck # type-checks all workspaces
```
