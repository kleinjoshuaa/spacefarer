import { planetName, stationName, systemName } from "./names.js";
import { Rng, rngFrom } from "./rng.js";
import type {
  Economy,
  GalaxyMeta,
  Government,
  Planet,
  PlanetKind,
  StarKind,
  SystemDetail,
  SystemSummary,
} from "./types.js";

export const GALAXY_SIZE = 1000;
export const DEFAULT_SYSTEM_COUNT = 256;
/** Maximum jump range in map units; used to compute neighbours. */
export const MAX_JUMP_RANGE = 140;

const ECONOMIES: readonly Economy[] = [
  "Rich Industrial",
  "Average Industrial",
  "Poor Industrial",
  "Mainly Industrial",
  "Mainly Agricultural",
  "Rich Agricultural",
  "Average Agricultural",
  "Poor Agricultural",
];

const GOVERNMENTS: readonly Government[] = [
  "Anarchy",
  "Feudal",
  "Multi-Government",
  "Dictatorship",
  "Communist",
  "Confederacy",
  "Democracy",
  "Corporate State",
];

const STAR_KINDS: readonly StarKind[] = ["Yellow", "Red", "Blue", "White", "Orange"];
const STAR_WEIGHTS = [30, 34, 8, 10, 18];

/**
 * A galaxy is fully described by its seed and system count. Given the same
 * seed, every derived value (positions, economies, markets, planets) is stable,
 * so the client and server never disagree about the universe.
 */
export class Galaxy {
  readonly seed: number;
  readonly systemCount: number;
  readonly size = GALAXY_SIZE;
  private summaryCache = new Map<number, SystemSummary>();

  constructor(seed: number, systemCount: number = DEFAULT_SYSTEM_COUNT) {
    this.seed = seed >>> 0;
    this.systemCount = systemCount;
  }

  meta(): GalaxyMeta {
    const rng = rngFrom(this.seed, 0xffff);
    return {
      seed: this.seed,
      name: `${systemName(rng)} Sector`,
      systemCount: this.systemCount,
      size: this.size,
    };
  }

  /** Compact record for a single system, used to draw the star map. */
  summary(id: number): SystemSummary {
    const cached = this.summaryCache.get(id);
    if (cached) return cached;

    const rng = rngFrom(this.seed, id, 0x5359);
    const techLevel = rng.int(1, 15);
    // Higher tech skews towards richer, more ordered societies.
    const economy = ECONOMIES[Math.min(ECONOMIES.length - 1, rng.int(0, 7))];
    const government = GOVERNMENTS[Math.min(GOVERNMENTS.length - 1, Math.floor((techLevel / 16) * 8 + rng.float(-1.5, 1.5)))] ?? "Multi-Government";
    const summary: SystemSummary = {
      id,
      name: systemName(rng),
      x: Math.round(rng.float(20, this.size - 20)),
      y: Math.round(rng.float(20, this.size - 20)),
      economy,
      government,
      techLevel,
      population: rng.int(1, 120) * (economy.includes("Industrial") ? 8 : 5),
      starKind: rng.weighted(STAR_KINDS, STAR_WEIGHTS),
    };
    this.summaryCache.set(id, summary);
    return summary;
  }

  /** All system summaries (for map rendering / listing). */
  allSummaries(): SystemSummary[] {
    const out: SystemSummary[] = [];
    for (let id = 0; id < this.systemCount; id++) out.push(this.summary(id));
    return out;
  }

  /** Straight-line map distance between two systems. */
  distance(a: number, b: number): number {
    const sa = this.summary(a);
    const sb = this.summary(b);
    return Math.hypot(sa.x - sb.x, sa.y - sb.y);
  }

  /** Systems within jump range of the given system, nearest first. */
  neighbours(id: number, range = MAX_JUMP_RANGE): { id: number; name: string; distance: number }[] {
    const result: { id: number; name: string; distance: number }[] = [];
    for (let other = 0; other < this.systemCount; other++) {
      if (other === id) continue;
      const d = this.distance(id, other);
      if (d <= range) {
        result.push({ id: other, name: this.summary(other).name, distance: Math.round(d) / 10 });
      }
    }
    result.sort((p, q) => p.distance - q.distance);
    return result.slice(0, 8);
  }

  /** Rich, deterministic detail for a single system. */
  detail(id: number): SystemDetail {
    const summary = this.summary(id);
    const rng = rngFrom(this.seed, id, 0x44544c);

    const star = {
      kind: summary.starKind,
      radius: rng.int(24, 48),
    };

    const planetCount = rng.int(1, 6);
    const planets: Planet[] = [];
    for (let i = 0; i < planetCount; i++) {
      const kind = pickPlanetKind(rng, i, planetCount);
      planets.push({
        name: planetName(rng, summary.name, i),
        kind,
        orbit: 70 + i * rng.int(34, 58),
        radius: kind === "GasGiant" ? rng.int(18, 30) : rng.int(6, 16),
        angle: rng.float(0, Math.PI * 2),
        hue: hueForPlanet(kind, rng),
      });
    }

    const station = {
      name: stationName(rng),
      orbitsPlanet: rng.int(0, planets.length - 1),
    };

    return {
      ...summary,
      description: describeSystem(summary, planets.length, rng),
      star,
      planets,
      station,
      neighbours: this.neighbours(id),
    };
  }
}

function pickPlanetKind(rng: Rng, index: number, total: number): PlanetKind {
  // Inner orbits trend hot/rocky, outer orbits trend icy/gas.
  const t = total <= 1 ? 0.5 : index / (total - 1);
  if (t < 0.25) return rng.pick(["Volcanic", "Rocky", "Desert", "Barren"]);
  if (t < 0.6) return rng.pick(["Terran", "Ocean", "Desert", "Rocky"]);
  return rng.pick(["Ice", "GasGiant", "Barren", "Rocky"]);
}

function hueForPlanet(kind: PlanetKind, rng: Rng): number {
  switch (kind) {
    case "Terran": return rng.int(90, 140);
    case "Ocean": return rng.int(190, 220);
    case "Desert": return rng.int(30, 45);
    case "Ice": return rng.int(180, 210);
    case "GasGiant": return rng.int(20, 50);
    case "Volcanic": return rng.int(0, 20);
    case "Rocky": return rng.int(20, 40);
    case "Barren": return rng.int(0, 60);
    default: return rng.int(0, 360);
  }
}

function describeSystem(summary: SystemSummary, planetCount: number, rng: Rng): string {
  const traits = [
    "notable for its ancient trade routes",
    "plagued by pirate activity",
    "famed for its exotic cuisine",
    "home to a reclusive research colony",
    "under a long-running trade embargo",
    "renowned for its shipyards",
    "shrouded in perpetual dust storms",
    "a quiet backwater on the frontier",
  ];
  return `${summary.name} is a ${summary.government.toLowerCase()} system with a ${summary.economy.toLowerCase()} economy, ${rng.pick(traits)}. It holds ${planetCount} charted worlds around a ${summary.starKind.toLowerCase()} star.`;
}
