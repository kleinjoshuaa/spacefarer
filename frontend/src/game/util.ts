import { GOODS, type Commander, type Government } from "@spacefarer/shared";

/** How dangerous a system's space is, 0 (safe) .. 5 (lawless), for enemy spawns. */
export function dangerFor(government: Government): number {
  switch (government) {
    case "Anarchy": return 5;
    case "Feudal": return 4;
    case "Multi-Government": return 3;
    case "Dictatorship": return 2;
    case "Communist": return 1;
    case "Confederacy": return 1;
    case "Democracy": return 0;
    case "Corporate State": return 0;
    default: return 2;
  }
}

const GOOD_NAMES = new Map(GOODS.map((g) => [g.id, g.name] as const));

export function goodName(id: string): string {
  return GOOD_NAMES.get(id) ?? id;
}

export function usedCargo(commander: Commander): number {
  return commander.cargo.reduce((sum, item) => sum + item.quantity, 0);
}

export function credits(value: number): string {
  return `${value.toLocaleString("en-US")} CR`;
}
