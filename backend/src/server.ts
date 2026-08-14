import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { HOST, PORT } from "./config.js";
import {
  GameError,
  buy,
  createCommander,
  jump,
  refuel,
  repair,
  reportCombat,
  sell,
} from "./game.js";
import { currentEpoch, galaxy, marketFor } from "./galaxyService.js";
import { commanderStore } from "./store.js";

const app = Fastify({ logger: true });

// Do not `await` register calls here: awaiting one prematurely boots the
// instance, after which later hooks (like setErrorHandler) are not applied.
// Everything is queued and resolved when `listen()` runs.
app.register(cors, { origin: true });

// Tolerate empty JSON bodies (e.g. a POST with no payload): treat them as `{}`
// instead of failing to parse.
app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (_req, body, done) => {
    if (!body || (typeof body === "string" && body.trim() === "")) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  },
);

/** Load a commander by id or fail with a 404. */
async function requireCommander(id: string) {
  const commander = await commanderStore.get(id);
  if (!commander) throw new GameError("Commander not found.", 404);
  return commander;
}

app.get("/api/health", async () => ({ ok: true, epoch: currentEpoch() }));

app.get("/api/galaxy", async () => ({
  ...galaxy.meta(),
  systems: galaxy.allSummaries(),
}));

app.get<{ Params: { id: string } }>("/api/system/:id", async (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0 || id >= galaxy.systemCount) {
    throw new GameError("No such system.", 404);
  }
  return galaxy.detail(id);
});

app.get<{ Params: { id: string } }>("/api/system/:id/market", async (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0 || id >= galaxy.systemCount) {
    throw new GameError("No such system.", 404);
  }
  return { ...marketFor(id), epoch: currentEpoch() };
});

app.post<{ Body: { name?: string } }>("/api/commander", async (req, reply) => {
  const commander = createCommander(req.body?.name ?? "");
  await commanderStore.save(commander);
  reply.code(201);
  return commander;
});

app.get<{ Params: { id: string } }>("/api/commander/:id", async (req) => {
  return requireCommander(req.params.id);
});

app.post<{ Params: { id: string }; Body: { goodId: string; quantity: number } }>(
  "/api/commander/:id/buy",
  async (req) => {
    const commander = await requireCommander(req.params.id);
    buy(commander, req.body.goodId, Number(req.body.quantity));
    return commanderStore.save(commander);
  },
);

app.post<{ Params: { id: string }; Body: { goodId: string; quantity: number } }>(
  "/api/commander/:id/sell",
  async (req) => {
    const commander = await requireCommander(req.params.id);
    sell(commander, req.body.goodId, Number(req.body.quantity));
    return commanderStore.save(commander);
  },
);

app.post<{ Params: { id: string }; Body: { targetSystem: number } }>(
  "/api/commander/:id/jump",
  async (req) => {
    const commander = await requireCommander(req.params.id);
    jump(commander, Number(req.body.targetSystem));
    return commanderStore.save(commander);
  },
);

app.post<{ Params: { id: string }; Body: { amount: number } }>(
  "/api/commander/:id/refuel",
  async (req) => {
    const commander = await requireCommander(req.params.id);
    refuel(commander, Number(req.body.amount));
    return commanderStore.save(commander);
  },
);

app.post<{ Params: { id: string } }>("/api/commander/:id/repair", async (req) => {
  const commander = await requireCommander(req.params.id);
  repair(commander);
  return commanderStore.save(commander);
});

app.post<{ Params: { id: string }; Body: { kills: number; damageTaken: number } }>(
  "/api/commander/:id/combat",
  async (req) => {
    const commander = await requireCommander(req.params.id);
    reportCombat(commander, Number(req.body.kills), Number(req.body.damageTaken));
    return commanderStore.save(commander);
  },
);

// Serve the built frontend when it exists (production single-service mode).
const frontendDist = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
if (existsSync(frontendDist)) {
  app.register(fastifyStatic, { root: frontendDist });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith("/api")) {
      reply.code(404).send({ error: "Not found." });
      return;
    }
    reply.sendFile("index.html");
  });
}

app.setErrorHandler((error, _req, reply) => {
  const statusCode = error instanceof GameError ? error.statusCode : 500;
  if (statusCode >= 500) app.log.error(error);
  reply.code(statusCode).send({
    error: error instanceof GameError ? error.message : "Internal server error.",
  });
});

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info("Spacefarer galaxy service ready.");
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
