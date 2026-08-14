import { hashString } from "@spacefarer/shared";

/** Global galaxy seed. Override with GALAXY_SEED to explore a different universe. */
export const GALAXY_SEED = process.env.GALAXY_SEED
  ? hashString(process.env.GALAXY_SEED)
  : hashString("spacefarer-prime");

export const SYSTEM_COUNT = process.env.SYSTEM_COUNT
  ? Math.max(16, Math.min(1024, Number(process.env.SYSTEM_COUNT)))
  : 256;

export const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
export const HOST = process.env.HOST ?? "0.0.0.0";

/** Where commander save files live. */
export const DATA_DIR = process.env.DATA_DIR ?? new URL("../data", import.meta.url).pathname;
