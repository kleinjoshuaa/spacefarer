import type { SystemDetail } from "@spacefarer/shared";

/** Config handed to the flight scene whenever the player enters a system. */
export interface FlightConfig {
  system: SystemDetail;
  hull: number;
  maxHull: number;
  /** Whether the player can be attacked here (anarchies are dangerous). */
  danger: number;
}

/** Events flowing between React (UI) and Phaser (the flight simulation). */
export interface GameEvents {
  /** React -> scene: (re)build the flight scene for a system. */
  "flight:configure": FlightConfig;
  /** scene -> React: player is within docking range of the station. */
  "flight:dockable": boolean;
  /** scene -> React: player confirmed docking. */
  "flight:dock": void;
  /** scene -> React: current hull value changed. */
  "flight:hull": number;
  /** scene -> React: an enemy was destroyed. */
  "flight:kill": number;
  /** scene -> React: the player ship was destroyed. */
  "flight:destroyed": void;
  /** scene -> React: a short status line for the flight log. */
  "flight:message": string;
  /** React -> scene: request docking (from a UI button). */
  "ui:requestDock": void;
}

type Handler<T> = (payload: T) => void;

/**
 * Events whose most recent payload is retained and replayed to any handler that
 * subscribes later. This lets React configure a flight before the Phaser scene
 * has finished booting (or after it is recreated on docking) without the
 * configuration being lost to a race.
 */
const RETAINED: ReadonlySet<keyof GameEvents> = new Set(["flight:configure"]);

/** Minimal typed pub/sub used to decouple React from the Phaser scene. */
export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<unknown>>>();
  private retained = new Map<keyof GameEvents, unknown>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    if (RETAINED.has(event) && this.retained.has(event)) {
      const value = this.retained.get(event) as GameEvents[K];
      queueMicrotask(() => handler(value));
    }
    return () => set!.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    if (RETAINED.has(event)) this.retained.set(event, payload);
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) (handler as Handler<GameEvents[K]>)(payload);
  }
}
