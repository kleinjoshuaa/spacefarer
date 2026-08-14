import type { PlanetKind, StarKind } from "@spacefarer/shared";

/**
 * A deliberately small, chunky palette reminiscent of the NES / Sega Master
 * System era. Colours are reused across UI and the Phaser canvas to keep the
 * whole game feeling like one 8-bit machine.
 */
export const PALETTE = {
  black: "#0b0221",
  space: "#101038",
  panel: "#1a1040",
  panelLight: "#241a5c",
  ink: "#e8e6ff",
  dim: "#9a92d8",
  green: "#38d66a",
  greenDark: "#1f7a3d",
  amber: "#f7c948",
  red: "#e5484d",
  redDark: "#8c1c1f",
  cyan: "#3ad1e0",
  magenta: "#d453c9",
  blue: "#4f7cff",
  white: "#ffffff",
  hullBar: "#38d66a",
  fuelBar: "#3ad1e0",
} as const;

export function starColor(kind: StarKind): string {
  switch (kind) {
    case "Yellow": return "#f7c948";
    case "Red": return "#e5484d";
    case "Blue": return "#4f7cff";
    case "White": return "#ffffff";
    case "Orange": return "#f08a3c";
  }
}

export function planetColor(kind: PlanetKind, hue: number): string {
  // Convert the deterministic hue into a punchy, low-fidelity colour.
  const sat = kind === "GasGiant" ? 55 : 65;
  const light = kind === "Ice" ? 78 : kind === "Barren" ? 45 : 55;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}
