import type { SystemDetail } from "@spacefarer/shared";
import { planetColor } from "../palette.js";

export function SystemInfo({
  system,
  onClose,
}: {
  system: SystemDetail;
  onClose: () => void;
}) {
  return (
    <div className="overlay" role="dialog" aria-label="System information">
      <div className="panel modal" style={{ width: "min(620px, 96vw)" }}>
        <div className="modal-head">
          <h2>{system.name}</h2>
          <button onClick={onClose}>Close</button>
        </div>
        <p className="controls-hint">{system.description}</p>
        <div className="badge-list">
          <span className="pill">{system.economy}</span>
          <span className="pill">{system.government}</span>
          <span className="pill">Tech Level {system.techLevel}</span>
          <span className="pill">Pop {system.population} bn</span>
          <span className="pill">{system.star.kind} star</span>
        </div>

        <h3 style={{ marginTop: 16 }}>Charted Worlds</h3>
        <table>
          <thead>
            <tr>
              <th>Planet</th>
              <th>Type</th>
              <th className="num">Radius</th>
            </tr>
          </thead>
          <tbody>
            {system.planets.map((planet, i) => (
              <tr key={i}>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 12,
                      marginRight: 8,
                      background: planetColor(planet.kind, planet.hue),
                      border: "1px solid #4a3c9a",
                      verticalAlign: "middle",
                    }}
                  />
                  {planet.name}
                  {system.station.orbitsPlanet === i && (
                    <span className="pill" style={{ marginLeft: 8 }}>
                      {system.station.name}
                    </span>
                  )}
                </td>
                <td>{planet.kind}</td>
                <td className="num">{planet.radius}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
