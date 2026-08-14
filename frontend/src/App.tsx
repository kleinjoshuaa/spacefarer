import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Commander, SystemDetail } from "@spacefarer/shared";
import { api, type GalaxyResponse, type MarketResponse } from "./api.js";
import { EventBus } from "./game/events.js";
import { FlightStage } from "./game/PhaserGame.js";
import { dangerFor } from "./game/util.js";
import { Hud } from "./screens/Hud.js";
import { MarketScreen } from "./screens/MarketScreen.js";
import { GalaxyMap } from "./screens/GalaxyMap.js";
import { Shipyard } from "./screens/Shipyard.js";
import { SystemInfo } from "./screens/SystemInfo.js";
import { TitleScreen } from "./screens/TitleScreen.js";

type Mode = "title" | "flight" | "docked";
type Modal = "market" | "map" | "system" | "services" | null;

const SAVE_KEY = "spacefarer.commanderId";

export function App() {
  const bus = useMemo(() => new EventBus(), []);

  const [galaxy, setGalaxy] = useState<GalaxyResponse | null>(null);
  const [commander, setCommander] = useState<Commander | null>(null);
  const [system, setSystem] = useState<SystemDetail | null>(null);
  const [market, setMarket] = useState<MarketResponse | null>(null);
  const [mode, setMode] = useState<Mode>("title");
  const [modal, setModal] = useState<Modal>(null);
  const [dockable, setDockable] = useState(false);
  const [sceneHull, setSceneHull] = useState(100);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const hasSave = typeof localStorage !== "undefined" && !!localStorage.getItem(SAVE_KEY);

  // Refs so the once-registered event handlers always see current values.
  const commanderRef = useRef<Commander | null>(null);
  const systemRef = useRef<SystemDetail | null>(null);
  const sceneHullRef = useRef(100);
  const flightStartHull = useRef(100);
  const pendingKills = useRef(0);

  useEffect(() => {
    commanderRef.current = commander;
  }, [commander]);
  useEffect(() => {
    systemRef.current = system;
  }, [system]);
  // While docked, the HUD should reflect the authoritative commander hull
  // (e.g. after repairing), not the last value the flight scene reported.
  useEffect(() => {
    if (mode === "docked" && commander) {
      sceneHullRef.current = commander.hull;
      setSceneHull(commander.hull);
    }
  }, [mode, commander]);

  const pushLog = useCallback((message: string) => {
    setLog((prev) => [message, ...prev].slice(0, 8));
  }, []);

  const enterFlight = useCallback(
    (sys: SystemDetail, cmdr: Commander) => {
      flightStartHull.current = cmdr.hull;
      pendingKills.current = 0;
      sceneHullRef.current = cmdr.hull;
      setSceneHull(cmdr.hull);
      setDockable(false);
      setMode("flight");
      bus.emit("flight:configure", {
        system: sys,
        hull: cmdr.hull,
        maxHull: cmdr.maxHull,
        danger: dangerFor(sys.government),
      });
    },
    [bus],
  );

  // Report accumulated combat to the authoritative backend, then persist.
  const reportAndSettle = useCallback(async () => {
    const cmdr = commanderRef.current;
    if (!cmdr) return;
    const damage = Math.max(0, Math.round(flightStartHull.current - sceneHullRef.current));
    const kills = pendingKills.current;
    pendingKills.current = 0;
    if (kills === 0 && damage === 0) return;
    try {
      const updated = await api.combat(cmdr.id, kills, damage);
      setCommander(updated);
      flightStartHull.current = updated.hull;
      sceneHullRef.current = updated.hull;
      setSceneHull(updated.hull);
    } catch (err) {
      pushLog(`Combat report failed: ${(err as Error).message}`);
    }
  }, [pushLog]);

  const handleDock = useCallback(async () => {
    await reportAndSettle();
    setMode("docked");
    setModal(null);
    pushLog("Docked. Welcome to the station.");
  }, [reportAndSettle, pushLog]);

  const handleDestroyed = useCallback(async () => {
    await reportAndSettle();
    setMode("docked");
    setModal(null);
    pushLog("Escape pod recovered you to the station. Repair your hull to launch again.");
  }, [reportAndSettle, pushLog]);

  // Register scene <-> UI wiring exactly once.
  useEffect(() => {
    const offs = [
      bus.on("flight:dockable", setDockable),
      bus.on("flight:hull", (hull) => {
        sceneHullRef.current = hull;
        setSceneHull(hull);
      }),
      bus.on("flight:kill", (n) => {
        pendingKills.current += n;
      }),
      bus.on("flight:message", pushLog),
      bus.on("flight:dock", () => void handleDock()),
      bus.on("flight:destroyed", () => void handleDestroyed()),
    ];
    return () => offs.forEach((off) => off());
  }, [bus, pushLog, handleDock, handleDestroyed]);

  // Load the galaxy once on boot.
  useEffect(() => {
    api
      .galaxy()
      .then(setGalaxy)
      .catch((err) => setError((err as Error).message));
  }, []);

  const loadSystem = useCallback(async (id: number): Promise<SystemDetail> => {
    const detail = await api.system(id);
    setSystem(detail);
    systemRef.current = detail;
    return detail;
  }, []);

  const newGame = useCallback(
    async (name: string) => {
      setBusy(true);
      setError(null);
      try {
        const cmdr = await api.createCommander(name);
        localStorage.setItem(SAVE_KEY, cmdr.id);
        setCommander(cmdr);
        commanderRef.current = cmdr;
        const sys = await loadSystem(cmdr.currentSystem);
        enterFlight(sys, cmdr);
        pushLog(`Commander ${cmdr.name} launched.`);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [enterFlight, loadSystem, pushLog],
  );

  const continueGame = useCallback(async () => {
    const id = localStorage.getItem(SAVE_KEY);
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const cmdr = await api.commander(id);
      setCommander(cmdr);
      commanderRef.current = cmdr;
      const sys = await loadSystem(cmdr.currentSystem);
      enterFlight(sys, cmdr);
      pushLog(`Welcome back, Commander ${cmdr.name}.`);
    } catch (err) {
      localStorage.removeItem(SAVE_KEY);
      setError("Saved commander could not be loaded. Start a new game.");
    } finally {
      setBusy(false);
    }
  }, [enterFlight, loadSystem, pushLog]);

  const openMarket = useCallback(async () => {
    if (!commander) return;
    setActionError(null);
    try {
      const m = await api.market(commander.currentSystem);
      setMarket(m);
      setModal("market");
    } catch (err) {
      setActionError((err as Error).message);
    }
  }, [commander]);

  const withCommander = useCallback(
    async (fn: (id: string) => Promise<Commander>, onOk?: () => void) => {
      const cmdr = commanderRef.current;
      if (!cmdr) return;
      setActionError(null);
      try {
        const updated = await fn(cmdr.id);
        setCommander(updated);
        commanderRef.current = updated;
        onOk?.();
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [],
  );

  const handleJump = useCallback(
    async (targetId: number) => {
      const cmdr = commanderRef.current;
      if (!cmdr) return;
      setActionError(null);
      try {
        const updated = await api.jump(cmdr.id, targetId);
        setCommander(updated);
        commanderRef.current = updated;
        const sys = await loadSystem(updated.currentSystem);
        setModal(null);
        pushLog(`Hyperspace jump to ${sys.name} complete.`);
        enterFlight(sys, updated);
      } catch (err) {
        setActionError((err as Error).message);
      }
    },
    [enterFlight, loadSystem, pushLog],
  );

  if (mode === "title" || !commander) {
    return (
      <div className="app-shell">
        <TitleScreen
          galaxy={galaxy}
          hasSave={hasSave}
          busy={busy}
          error={error}
          onNewGame={newGame}
          onContinue={continueGame}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="hud-grid">
        <div>
          {mode === "flight" ? (
            <>
              <div className="toolbar">
                <button
                  className="primary"
                  disabled={!dockable}
                  onClick={() => bus.emit("ui:requestDock", undefined)}
                >
                  {dockable ? "Dock (Enter)" : "Approach Station"}
                </button>
                <span className="controls-hint">
                  Arrows/WASD to fly, Space to fire, Enter to dock.
                </span>
              </div>
              <FlightStage bus={bus} />
            </>
          ) : (
            <div className="panel">
              <h2>Docked — {system?.station.name}</h2>
              <p className="controls-hint">
                You are safely docked at {system?.name}. Trade goods, plot a jump, or launch back
                into space.
              </p>
              <div className="toolbar" style={{ marginTop: 12 }}>
                <button onClick={openMarket}>Market</button>
                <button onClick={() => setModal("map")}>Galaxy Map</button>
                <button onClick={() => setModal("services")}>Shipyard</button>
                <button onClick={() => setModal("system")}>System Info</button>
                <button
                  className="primary"
                  disabled={commander.hull <= 0}
                  onClick={() => system && commander && enterFlight(system, commander)}
                >
                  Launch
                </button>
              </div>
              {commander.hull <= 0 && (
                <div className="controls-hint">
                  Hull destroyed. Visit the Shipyard to repair before launching.
                </div>
              )}
            </div>
          )}

          <div className="log" style={{ marginTop: 12 }}>
            {log.map((line, i) => (
              <div key={i}>&gt; {line}</div>
            ))}
          </div>
        </div>

        <Hud commander={commander} system={system} sceneHull={sceneHull} />
      </div>

      {modal === "market" && market && (
        <MarketScreen
          market={market}
          commander={commander}
          error={actionError}
          onBuy={(id, qty) => withCommander((cid) => api.buy(cid, id, qty))}
          onSell={(id, qty) => withCommander((cid) => api.sell(cid, id, qty))}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "map" && galaxy && system && (
        <GalaxyMap
          galaxy={galaxy}
          commander={commander}
          currentSystem={system}
          error={actionError}
          onJump={handleJump}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "services" && (
        <Shipyard
          commander={commander}
          error={actionError}
          onRefuel={(amount) => withCommander((cid) => api.refuel(cid, amount))}
          onRepair={() => withCommander((cid) => api.repair(cid))}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "system" && system && (
        <SystemInfo system={system} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
