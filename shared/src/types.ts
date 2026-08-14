/** Shared domain types used by both the backend service and the browser client. */

export type Economy =
  | "Rich Industrial"
  | "Average Industrial"
  | "Poor Industrial"
  | "Mainly Industrial"
  | "Mainly Agricultural"
  | "Rich Agricultural"
  | "Average Agricultural"
  | "Poor Agricultural";

export type Government =
  | "Anarchy"
  | "Feudal"
  | "Multi-Government"
  | "Dictatorship"
  | "Communist"
  | "Confederacy"
  | "Democracy"
  | "Corporate State";

export type PlanetKind =
  | "Rocky"
  | "Terran"
  | "Ocean"
  | "Desert"
  | "Ice"
  | "GasGiant"
  | "Volcanic"
  | "Barren";

export type StarKind = "Yellow" | "Red" | "Blue" | "White" | "Orange";

export interface GalaxyMeta {
  seed: number;
  name: string;
  systemCount: number;
  /** Width/height of the square galaxy map in abstract units. */
  size: number;
}

/** Lightweight per-system record used to draw the galaxy map. */
export interface SystemSummary {
  id: number;
  name: string;
  x: number;
  y: number;
  economy: Economy;
  government: Government;
  techLevel: number;
  population: number;
  starKind: StarKind;
}

export interface Planet {
  name: string;
  kind: PlanetKind;
  /** Orbital radius in abstract units, used for map layout. */
  orbit: number;
  radius: number;
  /** Base rotation offset so orbits are visually distinct but deterministic. */
  angle: number;
  hue: number;
}

export interface Station {
  name: string;
  /** Which planet index the station orbits. */
  orbitsPlanet: number;
}

export interface TradeGood {
  id: string;
  name: string;
  /** Credits per unit at this station. */
  price: number;
  /** Units available to buy from the station. */
  quantity: number;
  /** True for goods that are illegal under this government. */
  illegal: boolean;
}

export interface SystemDetail extends SystemSummary {
  description: string;
  star: {
    kind: StarKind;
    radius: number;
  };
  planets: Planet[];
  station: Station;
  /** Distance in light years to reachable neighbours, keyed by system id. */
  neighbours: { id: number; name: string; distance: number }[];
}

export interface MarketState {
  systemId: number;
  goods: TradeGood[];
}

export interface CargoItem {
  goodId: string;
  quantity: number;
  /** Average price paid, used to compute profit hints. */
  avgPrice: number;
}

export interface Commander {
  id: string;
  name: string;
  credits: number;
  currentSystem: number;
  fuel: number;
  maxFuel: number;
  cargoCapacity: number;
  cargo: CargoItem[];
  hull: number;
  maxHull: number;
  kills: number;
  visitedSystems: number[];
  createdAt: string;
  updatedAt: string;
}
