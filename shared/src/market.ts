import { Rng, rngFrom } from "./rng.js";
import type { Economy, Government, MarketState, TradeGood } from "./types.js";

/** Static commodity catalogue. Prices flex with local economy and government. */
export interface GoodDef {
  id: string;
  name: string;
  basePrice: number;
  /** Positive means industrial worlds sell it cheaply; negative means agricultural. */
  economyBias: number;
  /** Higher volatility widens the random price swing per system. */
  volatility: number;
  illegal: boolean;
}

export const GOODS: readonly GoodDef[] = [
  { id: "food", name: "Food", basePrice: 20, economyBias: -3, volatility: 0.2, illegal: false },
  { id: "textiles", name: "Textiles", basePrice: 32, economyBias: -2, volatility: 0.25, illegal: false },
  { id: "radioactives", name: "Radioactives", basePrice: 96, economyBias: 3, volatility: 0.35, illegal: false },
  { id: "minerals", name: "Minerals", basePrice: 40, economyBias: -1, volatility: 0.3, illegal: false },
  { id: "machinery", name: "Machinery", basePrice: 120, economyBias: 4, volatility: 0.25, illegal: false },
  { id: "computers", name: "Computers", basePrice: 180, economyBias: 5, volatility: 0.3, illegal: false },
  { id: "alloys", name: "Alloys", basePrice: 64, economyBias: 3, volatility: 0.28, illegal: false },
  { id: "medicine", name: "Medicine", basePrice: 140, economyBias: 4, volatility: 0.32, illegal: false },
  { id: "furs", name: "Furs", basePrice: 110, economyBias: -4, volatility: 0.4, illegal: false },
  { id: "liquor", name: "Liquor", basePrice: 55, economyBias: -2, volatility: 0.45, illegal: false },
  { id: "narcotics", name: "Narcotics", basePrice: 320, economyBias: 0, volatility: 0.6, illegal: true },
  { id: "firearms", name: "Firearms", basePrice: 260, economyBias: 2, volatility: 0.55, illegal: true },
];

/** How industrial (positive) vs agricultural (negative) an economy is, -4..4. */
function economyIndex(economy: Economy): number {
  switch (economy) {
    case "Rich Industrial": return 4;
    case "Average Industrial": return 3;
    case "Mainly Industrial": return 2;
    case "Poor Industrial": return 1;
    case "Poor Agricultural": return -1;
    case "Mainly Agricultural": return -2;
    case "Average Agricultural": return -3;
    case "Rich Agricultural": return -4;
    default: return 0;
  }
}

/** Governments with weaker rule of law make contraband more available. */
function lawlessness(government: Government): number {
  switch (government) {
    case "Anarchy": return 1;
    case "Feudal": return 0.8;
    case "Multi-Government": return 0.65;
    case "Dictatorship": return 0.4;
    case "Communist": return 0.3;
    case "Confederacy": return 0.25;
    case "Democracy": return 0.15;
    case "Corporate State": return 0.1;
    default: return 0.3;
  }
}

function priceFor(good: GoodDef, economy: Economy, rng: Rng): number {
  const econ = economyIndex(economy);
  // Goods flow from where they are cheap to where they are dear: an industrial
  // world (high econ) discounts industrial goods (positive bias) and marks up
  // agricultural goods, and vice versa.
  const biasFactor = 1 - (econ * good.economyBias) / 60;
  const swing = rng.float(1 - good.volatility, 1 + good.volatility);
  return Math.max(1, Math.round(good.basePrice * biasFactor * swing));
}

/**
 * Deterministically generate the market for a system. The `epoch` argument lets
 * prices drift over time (e.g. per in-game day) while staying reproducible.
 */
export function generateMarket(
  globalSeed: number,
  systemId: number,
  economy: Economy,
  government: Government,
  epoch = 0,
): MarketState {
  const rng = rngFrom(globalSeed, systemId, 0x4d41524b, epoch);
  const lawFactor = lawlessness(government);
  const goods: TradeGood[] = GOODS.map((good) => {
    const available = good.illegal ? rng.chance(lawFactor) : true;
    const price = priceFor(good, economy, rng);
    const quantity = available ? rng.int(good.illegal ? 1 : 5, good.illegal ? 20 : 90) : 0;
    return {
      id: good.id,
      name: good.name,
      price,
      quantity,
      illegal: good.illegal,
    };
  });
  return { systemId, goods };
}
