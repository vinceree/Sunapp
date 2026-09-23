import { azimuthToDir, cross, toLocal, type Vec2 } from './geo';
import type { Building, LatLng, SunPosition } from './types';

/** Typical seated eye / table height; shadow must reach above this to count. */
export const OBSERVER_HEIGHT_M = 1.2;
/** Cap for shadow length so near-horizon sun does not produce absurd polygons. */
const MAX_SHADOW_LENGTH_M = 1000;

export type ShadowHit = {
  building: Building;
  /** Horizontal distance from the point to the building edge along the sun ray. */
  distanceM: number;
  /** Elevation angle under which the roof edge is seen from the point. */
  obstructionAngleDeg: number;
};

export type ShadowResult = { shadowed: false } | { shadowed: true; hit: ShadowHit };

/**
 * Distance along the ray origin + t·dir (t ≥ 0) to the nearest edge of the
 * polygon, or null if the ray misses it.
 */
function rayPolygonDistance(origin: Vec2, dir: Vec2, ring: Vec2[]): number | null {
  let best: number | null = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const e = { x: b.x - a.x, y: b.y - a.y };
    const denom = cross(dir, e);
    if (Math.abs(denom) < 1e-12) continue; // parallel
    const ap = { x: a.x - origin.x, y: a.y - origin.y };
    const t = cross(ap, e) / denom;
    const s = cross(ap, dir) / denom;
    if (t >= 0 && s >= 0 && s <= 1 && (best === null || t < best)) best = t;
  }
  return best;
}

/**
 * Casts a ray from the point towards the sun and checks whether any building
 * (modelled as a flat-roofed prism) blocks it. Exact for flat terrain.
 */
export function computeShadow(
  point: LatLng,
  buildings: Building[],
  sun: SunPosition,
  observerHeightM = OBSERVER_HEIGHT_M,
): ShadowResult {
  if (sun.altitudeDeg <= 0) return { shadowed: false };
  const dir = azimuthToDir(sun.azimuthDeg);
  const origin = { x: 0, y: 0 };
  let worst: ShadowHit | null = null;

  for (const building of buildings) {
    const ring = building.footprint.map((p) => toLocal(point, p));
    const d = rayPolygonDistance(origin, dir, ring);
    if (d === null) continue;
    const relHeight = building.heightM - observerHeightM;
    if (relHeight <= 0) continue;
    const angle = Math.atan2(relHeight, d) * (180 / Math.PI);
    if (angle > sun.altitudeDeg && (!worst || angle > worst.obstructionAngleDeg)) {
      worst = { building, distanceM: d, obstructionAngleDeg: angle };
    }
  }
  return worst ? { shadowed: true, hit: worst } : { shadowed: false };
}

/**
 * Ground shadow of a building in local metres around `origin`, as a list of
 * polygons whose union is the shadow (footprint swept along the shadow vector).
 * Intended for rendering only.
 */
export function shadowPolygonsLocal(origin: LatLng, building: Building, sun: SunPosition): Vec2[][] {
  if (sun.altitudeDeg <= 0) return [];
  const ring = building.footprint.map((p) => toLocal(origin, p));
  const length = Math.min(building.heightM / Math.tan((sun.altitudeDeg * Math.PI) / 180), MAX_SHADOW_LENGTH_M);
  const dir = azimuthToDir(sun.azimuthDeg);
  const off = { x: -dir.x * length, y: -dir.y * length };
  const shifted = ring.map((p) => ({ x: p.x + off.x, y: p.y + off.y }));

  const polys: Vec2[][] = [ring, shifted];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    polys.push([ring[i], ring[j], shifted[j], shifted[i]]);
  }
  return polys;
}
