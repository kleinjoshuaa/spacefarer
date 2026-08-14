import type { Commander, SystemDetail } from "@spacefarer/shared";
import { PALETTE } from "../palette.js";
import { credits, usedCargo } from "../game/util.js";

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar">
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Hud({
  commander,
  system,
  sceneHull,
}: {
  commander: Commander;
  system: SystemDetail | null;
  sceneHull: number;
}) {
  return (
    <div className="panel">
      <h2>{commander.name}</h2>
      <div className="stat-row">
        <span className="label">Credits</span>
        <span>{credits(commander.credits)}</span>
      </div>
      <div className="stat-row">
        <span className="label">Kills</span>
        <span>{commander.kills}</span>
      </div>
      <div className="stat-row">
        <span className="label">Cargo</span>
        <span>
          {usedCargo(commander)} / {commander.cargoCapacity} t
        </span>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="stat-row">
          <span className="label">Hull</span>
          <span>
            {Math.round(sceneHull)} / {commander.maxHull}
          </span>
        </div>
        <Bar value={sceneHull} max={commander.maxHull} color={PALETTE.hullBar} />
      </div>

      <div style={{ marginTop: 8 }}>
        <div className="stat-row">
          <span className="label">Fuel</span>
          <span>
            {commander.fuel.toFixed(1)} / {commander.maxFuel} ly
          </span>
        </div>
        <Bar value={commander.fuel} max={commander.maxFuel} color={PALETTE.fuelBar} />
      </div>

      {system && (
        <div style={{ marginTop: 14 }}>
          <h3>{system.name}</h3>
          <div className="badge-list">
            <span className="pill">{system.economy}</span>
            <span className="pill">{system.government}</span>
            <span className="pill">TL {system.techLevel}</span>
          </div>
          <div className="controls-hint">{system.description}</div>
        </div>
      )}
    </div>
  );
}
