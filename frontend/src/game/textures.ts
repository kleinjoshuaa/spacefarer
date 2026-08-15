import Phaser from "phaser";

/**
 * Procedurally paint every sprite as chunky pixel art onto canvas textures.
 * Keeping the art in code (rather than image files) means the whole game ships
 * as source and still looks like an 8-bit cartridge.
 */

type PixelGrid = string[];

interface ColorMap {
  [key: string]: string;
}

function paint(
  scene: Phaser.Scene,
  key: string,
  grid: PixelGrid,
  colors: ColorMap,
  scale = 3,
): void {
  if (scene.textures.exists(key)) return;
  const rows = grid.length;
  const cols = grid[0].length;
  const canvas = scene.textures.createCanvas(key, cols * scale, rows * scale);
  if (!canvas) return;
  const ctx = canvas.context;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = grid[y][x];
      const color = colors[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  canvas.refresh();
}

// Player ship: a green arrowhead interceptor pointing RIGHT (east), with the
// engines on the left. Phaser treats an angle of 0 as facing +X, and the ship's
// thrust and gunfire are both derived directly from its angle, so the art must
// face east for the hull to line up with the direction of travel.
const PLAYER = [
  ".GG.......",
  "..GGG.....",
  "FFGCGGG...",
  "...GCGGGG.",
  "....WWWWWG",
  "...GCGGGG.",
  "FFGCGGG...",
  "..GGG.....",
  ".GG.......",
];

// Enemy ship: a red hostile wedge pointing DOWN. Unlike the player, this art is
// not east-facing, so FlightScene compensates by subtracting 90 degrees when it
// aims an enemy at its target. Keep that offset in sync if this art is redrawn.
const ENEMY = [
  "..R...R..",
  "..R...R..",
  ".RRK.KRR.",
  "RRRKKKRRR",
  ".RRRKRRR.",
  "..RRKRR..",
  "...RKR...",
  "....R....",
];

// Rotating station: a boxy octagon hub.
const STATION = [
  "..MMMM..",
  ".MCCCCM.",
  "MCWWWWCM",
  "MCWKKWCM",
  "MCWKKWCM",
  "MCWWWWCM",
  ".MCCCCM.",
  "..MMMM..",
];

export function createGameTextures(scene: Phaser.Scene): void {
  paint(scene, "player-ship", PLAYER, {
    G: "#38d66a",
    W: "#e8e6ff",
    C: "#3ad1e0",
    F: "#f7c948",
  });
  paint(scene, "enemy-ship", ENEMY, {
    R: "#e5484d",
    K: "#2a0708",
  });
  paint(scene, "station", STATION, {
    M: "#d453c9",
    C: "#3ad1e0",
    W: "#e8e6ff",
    K: "#101038",
  });

  // Simple square bullets in two colours.
  paint(scene, "bullet", ["WW", "WW"], { W: "#f7c948" }, 3);
  paint(scene, "enemy-bullet", ["WW", "WW"], { W: "#e5484d" }, 3);
  // Pre-coloured particles for thruster trails and explosions. Using distinct
  // textures avoids runtime tinting, which is costly on the Canvas renderer.
  paint(scene, "spark", ["W"], { W: "#ffffff" }, 3);
  paint(scene, "spark-cyan", ["W"], { W: "#3ad1e0" }, 3);
  paint(scene, "spark-amber", ["W"], { W: "#f7c948" }, 3);
  paint(scene, "spark-red", ["W"], { W: "#e5484d" }, 3);
}
