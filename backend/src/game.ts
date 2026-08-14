import { randomUUID } from "node:crypto";
import type { Commander } from "@spacefarer/shared";
import { galaxy, marketFor } from "./galaxyService.js";

export const STARTING_SYSTEM = 0;

export class GameError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

export function createCommander(name: string): Commander {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: name.trim().slice(0, 24) || "Commander Jameson",
    credits: 1000,
    currentSystem: STARTING_SYSTEM,
    fuel: 7,
    maxFuel: 7,
    cargoCapacity: 20,
    cargo: [],
    hull: 100,
    maxHull: 100,
    kills: 0,
    visitedSystems: [STARTING_SYSTEM],
    createdAt: now,
    updatedAt: now,
  };
}

export function usedCargo(commander: Commander): number {
  return commander.cargo.reduce((sum, item) => sum + item.quantity, 0);
}

/** Validate and apply a buy order using server-authoritative market prices. */
export function buy(commander: Commander, goodId: string, quantity: number): Commander {
  if (quantity <= 0) throw new GameError("Quantity must be positive.");
  const market = marketFor(commander.currentSystem);
  const good = market.goods.find((g) => g.id === goodId);
  if (!good) throw new GameError("Unknown commodity.");
  if (good.quantity < quantity) throw new GameError("Not enough stock available.");

  const cost = good.price * quantity;
  if (cost > commander.credits) throw new GameError("Insufficient credits.");
  if (usedCargo(commander) + quantity > commander.cargoCapacity) {
    throw new GameError("Not enough cargo space.");
  }

  commander.credits -= cost;
  const existing = commander.cargo.find((c) => c.goodId === goodId);
  if (existing) {
    const totalUnits = existing.quantity + quantity;
    existing.avgPrice = Math.round((existing.avgPrice * existing.quantity + cost) / totalUnits);
    existing.quantity = totalUnits;
  } else {
    commander.cargo.push({ goodId, quantity, avgPrice: good.price });
  }
  return commander;
}

/** Validate and apply a sell order. */
export function sell(commander: Commander, goodId: string, quantity: number): Commander {
  if (quantity <= 0) throw new GameError("Quantity must be positive.");
  const held = commander.cargo.find((c) => c.goodId === goodId);
  if (!held || held.quantity < quantity) throw new GameError("You do not hold that much cargo.");

  const market = marketFor(commander.currentSystem);
  const good = market.goods.find((g) => g.id === goodId);
  if (!good) throw new GameError("This station will not trade that commodity.");

  commander.credits += good.price * quantity;
  held.quantity -= quantity;
  if (held.quantity === 0) {
    commander.cargo = commander.cargo.filter((c) => c.goodId !== goodId);
  }
  return commander;
}

/** Jump to a reachable neighbouring system, consuming fuel by distance. */
export function jump(commander: Commander, targetSystem: number): Commander {
  const neighbours = galaxy.neighbours(commander.currentSystem);
  const target = neighbours.find((n) => n.id === targetSystem);
  if (!target) throw new GameError("Target system is out of jump range.");
  if (target.distance > commander.fuel) throw new GameError("Not enough fuel for this jump.");

  commander.fuel = Math.round((commander.fuel - target.distance) * 10) / 10;
  commander.currentSystem = targetSystem;
  if (!commander.visitedSystems.includes(targetSystem)) {
    commander.visitedSystems.push(targetSystem);
  }
  return commander;
}

/** Buy fuel at 2 credits per light year, up to tank capacity. */
export function refuel(commander: Commander, amount: number): Commander {
  if (amount <= 0) throw new GameError("Amount must be positive.");
  const space = commander.maxFuel - commander.fuel;
  const buying = Math.min(amount, space);
  const cost = Math.ceil(buying * 2);
  if (cost > commander.credits) throw new GameError("Insufficient credits for fuel.");
  commander.credits -= cost;
  commander.fuel = Math.round((commander.fuel + buying) * 10) / 10;
  return commander;
}

const EMERGENCY_HULL = 20;

/** Repair hull at 3 credits per point. */
export function repair(commander: Commander): Commander {
  const missing = commander.maxHull - commander.hull;
  if (missing <= 0) return commander;
  const affordablePoints = Math.min(missing, Math.floor(commander.credits / 3));

  // Anti-soft-lock: a stranded, destroyed ship with too few credits gets a free
  // emergency patch up to a minimal hull so it can always launch again.
  if (commander.hull === 0 && affordablePoints < EMERGENCY_HULL) {
    commander.hull = Math.min(commander.maxHull, EMERGENCY_HULL);
    return commander;
  }

  commander.credits -= affordablePoints * 3;
  commander.hull += affordablePoints;
  return commander;
}

/** Record the outcome of a combat encounter resolved on the client. */
export function reportCombat(
  commander: Commander,
  kills: number,
  damageTaken: number,
): Commander {
  commander.kills += Math.max(0, Math.floor(kills));
  commander.hull = Math.max(0, Math.min(commander.maxHull, commander.hull - Math.max(0, Math.floor(damageTaken))));
  // A small bounty for each kill keeps the economy loop turning.
  commander.credits += Math.max(0, Math.floor(kills)) * 25;
  return commander;
}
