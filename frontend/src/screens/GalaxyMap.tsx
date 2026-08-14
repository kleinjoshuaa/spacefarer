import { useMemo, useState } from "react";
import type { Commander, SystemDetail } from "@spacefarer/shared";
import type { GalaxyResponse } from "../api.js";
import { starColor } from "../palette.js";

export function GalaxyMap({
  galaxy,
  commander,
  currentSystem,
  error,
  onJump,
  onClose,
}: {
  galaxy: GalaxyResponse;
  commander: Commander;
  currentSystem: SystemDetail;
  error: string | null;
  onJump: (id: number) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const neighbourMap = useMemo(
    () => new Map(currentSystem.neighbours.map((n) => [n.id, n])),
    [currentSystem.neighbours],
  );
  const here = galaxy.systems[commander.currentSystem];

  const selectedNeighbour = selected != null ? neighbourMap.get(selected) : undefined;
  const canJump =
    selectedNeighbour !== undefined && selectedNeighbour.distance <= commander.fuel;

  return (
    <div className="overlay" role="dialog" aria-label="Galaxy map">
      <div className="panel modal">
        <div className="modal-head">
          <h2>{galaxy.name} — Star Chart</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <span>Fuel: {commander.fuel.toFixed(1)} ly</span>
          <span>Visited: {commander.visitedSystems.length}</span>
        </div>
        <div className="error">{error}</div>
        <svg className="map" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet">
          {currentSystem.neighbours.map((n) => {
            const s = galaxy.systems[n.id];
            const reachable = n.distance <= commander.fuel;
            return (
              <line
                key={`line-${n.id}`}
                x1={here.x}
                y1={here.y}
                x2={s.x}
                y2={s.y}
                stroke={reachable ? "#3ad1e0" : "#4a3c9a"}
                strokeWidth={reachable ? 3 : 1.5}
                strokeDasharray={reachable ? undefined : "6 6"}
              />
            );
          })}

          {galaxy.systems.map((s) => {
            const isHere = s.id === commander.currentSystem;
            const isNeighbour = neighbourMap.has(s.id);
            const isVisited = commander.visitedSystems.includes(s.id);
            const r = isHere ? 12 : isNeighbour ? 8 : 4;
            return (
              <g key={s.id}>
                <circle
                  cx={s.x}
                  cy={s.y}
                  r={r}
                  fill={starColor(s.starKind)}
                  stroke={isHere ? "#38d66a" : selected === s.id ? "#f7c948" : "none"}
                  strokeWidth={4}
                  opacity={isNeighbour || isHere || isVisited ? 1 : 0.45}
                  style={{ cursor: isNeighbour ? "pointer" : "default" }}
                  onClick={() => isNeighbour && setSelected(s.id)}
                />
              </g>
            );
          })}
        </svg>

        <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
          <div>
            {selectedNeighbour ? (
              <span>
                Target: <strong>{selectedNeighbour.name}</strong> — {selectedNeighbour.distance.toFixed(1)} ly
                {!canJump && <span className="error"> (insufficient fuel)</span>}
              </span>
            ) : (
              <span className="controls-hint">Select a highlighted system to plot a jump.</span>
            )}
          </div>
          <button
            className="primary"
            disabled={!canJump}
            onClick={() => selected != null && onJump(selected)}
          >
            Jump
          </button>
        </div>
      </div>
    </div>
  );
}
