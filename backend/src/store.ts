import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Commander } from "@spacefarer/shared";
import { DATA_DIR } from "./config.js";

/**
 * Tiny JSON-file-backed commander store. It is intentionally simple: one file
 * holds every commander keyed by id. Good enough to persist a demo save across
 * server restarts without pulling in a database.
 */
export class CommanderStore {
  private commanders = new Map<string, Commander>();
  private readonly file = join(DATA_DIR, "commanders.json");
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as Commander[];
      for (const c of parsed) this.commanders.set(c.id, c);
    } catch {
      // No file yet; start empty.
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
    const all = [...this.commanders.values()];
    await writeFile(this.file, JSON.stringify(all, null, 2), "utf8");
  }

  async get(id: string): Promise<Commander | undefined> {
    await this.ensureLoaded();
    return this.commanders.get(id);
  }

  async save(commander: Commander): Promise<Commander> {
    await this.ensureLoaded();
    commander.updatedAt = new Date().toISOString();
    this.commanders.set(commander.id, commander);
    await this.persist();
    return commander;
  }

  async list(): Promise<Commander[]> {
    await this.ensureLoaded();
    return [...this.commanders.values()];
  }
}

export const commanderStore = new CommanderStore();
