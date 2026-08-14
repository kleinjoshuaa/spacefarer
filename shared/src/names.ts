import { Rng } from "./rng.js";

/**
 * Procedural name generation in the spirit of the original Elite's
 * pronounceable star-system names, built from alternating consonant and vowel
 * fragments.
 */

const STARTS = [
  "Ze", "Qu", "Ar", "Ti", "So", "La", "Ve", "Xa", "Or", "Be",
  "Ce", "Di", "En", "Ra", "Us", "In", "Te", "On", "Ma", "Ge",
];

const MIDS = [
  "ra", "le", "ti", "no", "za", "bi", "ce", "du", "ve", "so",
  "la", "ri", "ma", "on", "ex", "an", "us", "or", "en", "il",
];

const ENDS = [
  "n", "s", "th", "x", "r", "ne", "ri", "on", "us", "ar",
  "is", "or", "an", "es", "um", "ix", "el", "on", "ia", "eth",
];

/** Generate a plausible star-system name. */
export function systemName(rng: Rng): string {
  const parts = [rng.pick(STARTS)];
  const midCount = rng.int(0, 2);
  for (let i = 0; i < midCount; i++) parts.push(rng.pick(MIDS));
  parts.push(rng.pick(ENDS));
  return parts.join("");
}

const STATION_PREFIX = [
  "High", "Deep", "Far", "New", "Port", "Fort", "Star", "Void", "Iron", "Gold",
];
const STATION_SUFFIX = [
  "Anchor", "Reach", "Haven", "Gate", "Hold", "Landing", "Terminal", "Spire", "Dock", "Watch",
];

/** Generate an orbital-station name. */
export function stationName(rng: Rng): string {
  return `${rng.pick(STATION_PREFIX)} ${rng.pick(STATION_SUFFIX)}`;
}

const PLANET_SUFFIX = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** Generate a planet name derived from its parent system. */
export function planetName(rng: Rng, system: string, index: number): string {
  if (rng.chance(0.35)) return systemName(rng);
  return `${system} ${PLANET_SUFFIX[index] ?? index + 1}`;
}
