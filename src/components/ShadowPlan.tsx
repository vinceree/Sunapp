import { azimuthToDir, toLocal, type Vec2 } from '../domain/geo';
import { shadowPolygonsLocal } from '../domain/shadow';
import type { Building, LatLng, SunPosition, SunStatus } from '../domain/types';

type Props = { origin: LatLng; buildings: Building[]; sun: SunPosition; status: SunStatus };

const R = 70; // half-width of the plan in metres
// SVG y grows downwards; flip so north is up.
const pts = (ring: Vec2[]) => ring.map((p) => `${p.x.toFixed(2)},${(-p.y).toFixed(2)}`).join(' ');

/** Top-down plan (north up) of the terrace, buildings and their ground shadows. */
export function ShadowPlan({ origin, buildings, sun, status }: Props) {
  const up = sun.altitudeDeg > 0;
  const dir = azimuthToDir(sun.azimuthDeg);

  return (
    <section className="card">
      <h3>Draufsicht</h3>
      <svg className="plan" viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} role="img" aria-label="Schattenplan">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" className="plan-grid" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect x={-R} y={-R} width={2 * R} height={2 * R} fill="url(#grid)" />

        {/* Group opacity so overlapping shadow pieces do not darken each other. */}
        <g className="plan-shadow" opacity={0.35}>
          {up && buildings.flatMap((b) => shadowPolygonsLocal(origin, b, sun).map((poly, i) => <polygon key={`${b.id}-${i}`} points={pts(poly)} />))}
        </g>
        {buildings.map((b) => (
          <polygon key={b.id} className="plan-building" points={pts(b.footprint.map((p) => toLocal(origin, p)))} />
        ))}

        {up && <line className="plan-ray" x1={0} y1={0} x2={dir.x * R} y2={-dir.y * R} strokeWidth={0.6} strokeDasharray="2 1.5" />}
        <circle className={`plan-cafe status-${status}`} cx={0} cy={0} r={2.5} />

        <text className="plan-label" x={-R + 3} y={-R + 7} fontSize={5}>
          N ↑
        </text>
        <line className="plan-scale" x1={R - 23} x2={R - 3} y1={R - 4} y2={R - 4} strokeWidth={0.8} />
        <text className="plan-label" x={R - 13} y={R - 6} fontSize={4} textAnchor="middle">
          20 m
        </text>
      </svg>
      <p className="muted small">Gestrichelt: Blickrichtung zur Sonne. Grau: Gebäude, dunkel: Schattenwurf am Boden.</p>
    </section>
  );
}
