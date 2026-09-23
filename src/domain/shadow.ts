import { azimuthToDir, cross, toLocal, type Vec2 } from './geo';
import type { Building, LatLng, SunPosition } from './types';

/** Roughly head height of a seated/standing person; shadow must cover this. */
export const OBSERVER_HEIGHT_M = 1.2;
/** Cap for shadow length so near-horizon sun does not produce absurd polygons. */
export const MAX_SHADOW_LENGTH_M = 600;

export type ShadowHit = {
  building: Building;
  /** Horizontal distance from the point to the building along the sun ray. */
  distanceM: number;
  /** Elevation angle under which the (upper) roof edge is seen from the point. */
  obstructionAngleDeg: number;
};

export type ShadowResult =
  | { shadowed: false; insideBuilding?: false }
  | { shadowed: true; insideBuilding: boolean; hit: ShadowHit };

/** All distances t ≥ 0 at which the ray origin + t·dir crosses the ring's edges. */
function rayCrossings(origin: Vec2, dir: Vec2, ring: Vec2[]): number[] {
  const ts: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const e = { x: b.x - a.x, y: b.y - a.y };
    const denom = cross(dir, e);
    if (Math.abs(denom) < 1e-12) continue; // parallel
    const ap = { x: a.x - origin.x, y: a.y - origin.y };
    const t = cross(ap, e) / denom;
    const s = cross(ap, dir) / denom;
    if (t >= 0 && s >= 0 && s < 1) ts.push(t);
  }
  return ts;
}

/**
 * Casts a ray from the point towards the sun and checks whether any building
 * (a prism from minHeightM to heightM) blocks it. Exact for flat terrain and
 * convex footprints; conservative for concave ones.
 */
export function computeShadow(
  point: LatLng,
  buildings: Building[],
  sun: SunPosition,
  observerHeightM = OBSERVER_HEIGHT_M,
): ShadowResult {
  if (sun.altitudeDeg <= 0) return { shadowed: false };
  const dir = azimuthToDir(sun.azimuthDeg);
  const tan = Math.tan((sun.altitudeDeg * Math.PI) / 180);
  const origin = { x: 0, y: 0 };
  let worst: ShadowHit | null = null;
  let inside = false;

  for (const building of buildings) {
    const ring = building.footprint.map((p) => toLocal(point, p));
    const ts = rayCrossings(origin, dir, ring);
    if (ts.length === 0) continue;
    const isInside = ts.length % 2 === 1; // odd crossings → point lies within the footprint
    const tIn = isInside ? 0 : Math.min(...ts);
    const tOut = Math.max(...ts);
    // Height of the sun ray while it passes over the footprint.
    const zIn = observerHeightM + tIn * tan;
    const zOut = observerHeightM + tOut * tan;
    const minH = building.minHeightM ?? 0;
    if (zIn >= building.heightM || zOut <= minH) continue; // ray passes above or below
    if (isInside && minH < observerHeightM) inside = true;
    const angle = Math.atan2(building.heightM - observerHeightM, tIn) * (180 / Math.PI);
    if (!worst || angle > worst.obstructionAngleDeg) {
      worst = { building, distanceM: tIn, obstructionAngleDeg: angle };
    }
  }
  return worst ? { shadowed: true, insideBuilding: inside, hit: worst } : { shadowed: false };
}

/** Ground offset of a point at height h, in metres (east, north). */
export function shadowOffset(sun: SunPosition, heightM: number): Vec2 {
  const length = Math.min(heightM / Math.tan((sun.altitudeDeg * Math.PI) / 180), MAX_SHADOW_LENGTH_M);
  const dir = azimuthToDir(sun.azimuthDeg);
  return { x: -dir.x * length, y: -dir.y * length };
}

/**
 * Ground shadow of a prism given its footprint in any planar metric frame
 * (x east, y north): the footprint swept from the offset of its underside to
 * the offset of its top. Returned as polygons whose union is the shadow,
 * each oriented counter-clockwise so they can be filled with nonzero winding.
 */
export function shadowPolygons(ring: Vec2[], lowOffset: Vec2, highOffset: Vec2): Vec2[][] {
  const lo = ring.map((p) => ({ x: p.x + lowOffset.x, y: p.y + lowOffset.y }));
  const hi = ring.map((p) => ({ x: p.x + highOffset.x, y: p.y + highOffset.y }));
  const polys: Vec2[][] = [lo, hi];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    polys.push([lo[i], lo[j], hi[j], hi[i]]);
  }
  return polys.map(ccw);
}

function signedArea(ring: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) a += cross(ring[i], ring[(i + 1) % ring.length]);
  return a / 2;
}

const ccw = (ring: Vec2[]) => (signedArea(ring) < 0 ? [...ring].reverse() : ring);

/** Convenience for a single building around `origin` (local metres). */
export function shadowPolygonsLocal(origin: LatLng, building: Building, sun: SunPosition): Vec2[][] {
  if (sun.altitudeDeg <= 0) return [];
  const ring = building.footprint.map((p) => toLocal(origin, p));
  return shadowPolygons(ring, shadowOffset(sun, building.minHeightM ?? 0), shadowOffset(sun, building.heightM));
}
