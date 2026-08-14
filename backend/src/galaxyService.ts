import { Galaxy, generateMarket, type MarketState } from "@spacefarer/shared";
import { GALAXY_SEED, SYSTEM_COUNT } from "./config.js";

/** Single shared galaxy instance derived from the configured seed. */
export const galaxy = new Galaxy(GALAXY_SEED, SYSTEM_COUNT);

/**
 * Markets drift on a coarse time bucket so prices feel alive but remain
 * consistent for every connected client within the same window.
 */
export function currentEpoch(): number {
  const HOURS = 1000 * 60 * 60;
  return Math.floor(Date.now() / (6 * HOURS));
}

export function marketFor(systemId: number, epoch = currentEpoch()): MarketState {
  const summary = galaxy.summary(systemId);
  return generateMarket(GALAXY_SEED, systemId, summary.economy, summary.government, epoch);
}
