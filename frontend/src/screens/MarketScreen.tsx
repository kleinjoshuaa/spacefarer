import { useState } from "react";
import type { Commander, TradeGood } from "@spacefarer/shared";
import type { MarketResponse } from "../api.js";
import { credits, usedCargo } from "../game/util.js";

function MarketRow({
  good,
  held,
  canAfford,
  freeSpace,
  onBuy,
  onSell,
}: {
  good: TradeGood;
  held: number;
  canAfford: number;
  freeSpace: number;
  onBuy: (id: string, qty: number) => void;
  onSell: (id: string, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const clampedQty = Math.max(1, Math.floor(qty) || 1);
  const maxBuy = Math.min(good.quantity, canAfford, freeSpace);
  return (
    <tr>
      <td>
        {good.name} {good.illegal && <span className="pill illegal">Illegal</span>}
      </td>
      <td className="num">{credits(good.price)}</td>
      <td className="num">{good.quantity}</td>
      <td className="num">{held}</td>
      <td className="num">
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            style={{ width: 56 }}
          />
          <button
            disabled={maxBuy < clampedQty}
            onClick={() => onBuy(good.id, clampedQty)}
          >
            Buy
          </button>
          <button disabled={held < clampedQty} onClick={() => onSell(good.id, clampedQty)}>
            Sell
          </button>
        </div>
      </td>
    </tr>
  );
}

export function MarketScreen({
  market,
  commander,
  error,
  onBuy,
  onSell,
  onClose,
}: {
  market: MarketResponse;
  commander: Commander;
  error: string | null;
  onBuy: (id: string, qty: number) => void;
  onSell: (id: string, qty: number) => void;
  onClose: () => void;
}) {
  const freeSpace = commander.cargoCapacity - usedCargo(commander);
  return (
    <div className="overlay" role="dialog" aria-label="Market">
      <div className="panel modal">
        <div className="modal-head">
          <h2>Commodity Market</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <span>Credits: {credits(commander.credits)}</span>
          <span>
            Hold: {usedCargo(commander)} / {commander.cargoCapacity} t
          </span>
        </div>
        <div className="error">{error}</div>
        <table>
          <thead>
            <tr>
              <th>Commodity</th>
              <th className="num">Price</th>
              <th className="num">Avail</th>
              <th className="num">Hold</th>
              <th className="num">Trade</th>
            </tr>
          </thead>
          <tbody>
            {market.goods.map((good) => {
              const held = commander.cargo.find((c) => c.goodId === good.id)?.quantity ?? 0;
              return (
                <MarketRow
                  key={good.id}
                  good={good}
                  held={held}
                  canAfford={Math.floor(commander.credits / good.price)}
                  freeSpace={freeSpace}
                  onBuy={onBuy}
                  onSell={onSell}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
