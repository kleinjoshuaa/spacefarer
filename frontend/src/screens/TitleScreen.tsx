import { useState } from "react";
import type { GalaxyResponse } from "../api.js";

export function TitleScreen({
  galaxy,
  hasSave,
  busy,
  error,
  onNewGame,
  onContinue,
}: {
  galaxy: GalaxyResponse | null;
  hasSave: boolean;
  busy: boolean;
  error: string | null;
  onNewGame: (name: string) => void;
  onContinue: () => void;
}) {
  const [name, setName] = useState("Jameson");

  return (
    <div className="title-screen">
      <h1>SPACEFARER</h1>
      <p className="tagline">
        A procedurally generated galaxy of {galaxy?.systemCount ?? "many"} star systems awaits.
        Trade, fight, and jump between worlds in the {galaxy?.name ?? "unknown"}.
      </p>

      <div className="panel" style={{ width: "min(420px, 96vw)" }}>
        <div className="error">{error}</div>
        <div className="row" style={{ marginBottom: 12 }}>
          <label htmlFor="cmdr" style={{ minWidth: 96 }}>
            Commander
          </label>
          <input
            id="cmdr"
            type="text"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="primary" disabled={busy || !galaxy} onClick={() => onNewGame(name)}>
            New Game
          </button>
          {hasSave && (
            <button disabled={busy} onClick={onContinue}>
              Continue
            </button>
          )}
        </div>
      </div>

      <div className="controls-hint" style={{ maxWidth: 420 }}>
        Flight: Arrow keys / WASD to steer and thrust, Space to fire, Enter to dock when close and
        slow.
      </div>
    </div>
  );
}
