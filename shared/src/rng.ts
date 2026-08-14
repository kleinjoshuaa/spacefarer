/**
 * Deterministic pseudo-random number generation.
 *
 * Everything in the galaxy is derived from a single 32-bit seed plus a set of
 * integer coordinates/indices. The same inputs always produce the same output
 * on both the backend and the frontend, which is what lets the client and
 * server agree on a universe without transferring it wholesale.
 */

/** FNV-1a based string hash producing an unsigned 32-bit integer. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mix an arbitrary list of integers into a single unsigned 32-bit seed. */
export function mixSeed(...values: number[]): number {
  let h = 0x9e3779b9;
  for (const value of values) {
    h ^= value >>> 0;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/**
 * A tiny, fast, deterministic PRNG (mulberry32). Not cryptographically secure,
 * but perfectly reproducible and good enough for world generation.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Next float in the half-open interval [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in the inclusive range [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in the half-open interval [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Return true with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /** Pick a uniformly random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** Pick an element using positive weights parallel to items. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  }
}

/** Create an Rng seeded by mixing the global seed with the supplied salts. */
export function rngFrom(globalSeed: number, ...salts: number[]): Rng {
  return new Rng(mixSeed(globalSeed, ...salts));
}
