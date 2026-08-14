import { useState } from "react";
import type { Commander } from "@spacefarer/shared";
import { credits } from "../game/util.js";

export function Shipyard({
  commander,
  error,
  onRefuel,
  onRepair,
  onClose,
}: {
  commander: Commander;
  error: string | null;
  onRefuel: (amount: number) => void;
  onRepair: () => void;
  onClose: () => void;
}) {
  const fuelSpace = Math.round((commander.maxFuel - commander.fuel) * 10) / 10;
  const [amount, setAmount] = useState(fuelSpace || 1);
  const hullMissing = commander.maxHull - commander.hull;
  const repairCost = hullMissing * 3;

  return (
    <div className="overlay" role="dialog" aria-label="Shipyard">
      <div className="panel modal" style={{ width: "min(520px, 96vw)" }}>
        <div className="modal-head">
          <h2>Station Services</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="stat-row">
          <span className="label">Credits</span>
          <span>{credits(commander.credits)}</span>
        </div>
        <div className="error">{error}</div>

        <h3 style={{ marginTop: 16 }}>Refuel — 2 CR / ly</h3>
        <div className="row">
          <input
            type="number"
            min={0}
            step={0.5}
            name="fuel-amount"
            aria-label="Fuel amount in light years"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <button
            className="primary"
            disabled={fuelSpace <= 0 || amount <= 0}
            onClick={() => onRefuel(amount)}
          >
            Buy Fuel
          </button>
          <span className="controls-hint">Tank space: {fuelSpace} ly</span>
        </div>

        <h3 style={{ marginTop: 16 }}>Repair Hull — 3 CR / point</h3>
        <div className="row">
          <button className="primary" disabled={hullMissing <= 0} onClick={onRepair}>
            Repair ({credits(repairCost)})
          </button>
          <span className="controls-hint">
            Hull {commander.hull} / {commander.maxHull}
          </span>
        </div>
      </div>
    </div>
  );
}
