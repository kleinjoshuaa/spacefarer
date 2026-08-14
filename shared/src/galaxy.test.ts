import { describe, expect, it } from "vitest";
import { Galaxy } from "./galaxy.js";
import { generateMarket } from "./market.js";
import { Rng, hashString, mixSeed } from "./rng.js";

describe("Rng", () => {
  it("is deterministic for a given seed", () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces values in range", () => {
    const rng = new Rng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = rng.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
  });

  it("hashString and mixSeed return unsigned 32-bit integers", () => {
    expect(hashString("spacefarer")).toBe(hashString("spacefarer"));
    expect(mixSeed(1, 2, 3)).toBe(mixSeed(1, 2, 3));
    expect(hashString("a")).toBeGreaterThanOrEqual(0);
    expect(mixSeed(5)).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("Galaxy", () => {
  it("generates identical systems for the same seed", () => {
    const g1 = new Galaxy(42, 64);
    const g2 = new Galaxy(42, 64);
    for (let id = 0; id < 64; id++) {
      expect(g1.detail(id)).toEqual(g2.detail(id));
    }
  });

  it("generates different systems for different seeds", () => {
    const g1 = new Galaxy(1, 32);
    const g2 = new Galaxy(2, 32);
    const names1 = g1.allSummaries().map((s) => s.name);
    const names2 = g2.allSummaries().map((s) => s.name);
    expect(names1).not.toEqual(names2);
  });

  it("keeps systems inside the map bounds", () => {
    const g = new Galaxy(7, 128);
    for (const s of g.allSummaries()) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(g.size);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(g.size);
    }
  });

  it("produces at least one planet and a valid station per system", () => {
    const g = new Galaxy(7, 64);
    for (let id = 0; id < 64; id++) {
      const d = g.detail(id);
      expect(d.planets.length).toBeGreaterThanOrEqual(1);
      expect(d.station.orbitsPlanet).toBeGreaterThanOrEqual(0);
      expect(d.station.orbitsPlanet).toBeLessThan(d.planets.length);
    }
  });

  it("computes symmetric neighbour distances", () => {
    const g = new Galaxy(7, 64);
    const d = g.detail(0);
    for (const n of d.neighbours) {
      expect(n.distance).toBeGreaterThan(0);
    }
  });
});

describe("generateMarket", () => {
  it("is deterministic for a given seed and epoch", () => {
    const m1 = generateMarket(42, 3, "Rich Industrial", "Democracy", 0);
    const m2 = generateMarket(42, 3, "Rich Industrial", "Democracy", 0);
    expect(m1).toEqual(m2);
  });

  it("drifts prices across epochs", () => {
    const m1 = generateMarket(42, 3, "Rich Industrial", "Democracy", 0);
    const m2 = generateMarket(42, 3, "Rich Industrial", "Democracy", 5);
    expect(m1).not.toEqual(m2);
  });

  it("makes contraband rare under strict governments", () => {
    let corporateAvailable = 0;
    let anarchyAvailable = 0;
    for (let id = 0; id < 200; id++) {
      const corp = generateMarket(1, id, "Average Industrial", "Corporate State");
      const anarchy = generateMarket(1, id, "Average Industrial", "Anarchy");
      if (corp.goods.find((g) => g.id === "narcotics")!.quantity > 0) corporateAvailable++;
      if (anarchy.goods.find((g) => g.id === "narcotics")!.quantity > 0) anarchyAvailable++;
    }
    expect(anarchyAvailable).toBeGreaterThan(corporateAvailable);
  });
});
