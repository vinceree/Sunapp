import type { LatLng } from './types';

/** Local east/north offset in metres from an origin. */
export type Vec2 = { x: number; y: number };

const EARTH_RADIUS_M = 6_371_008.8;
const DEG = Math.PI / 180;

// Equirectangular projection around the origin. At city scale (< a few km)
// the error is well below the precision of OSM footprints.
export function toLocal(origin: LatLng, p: LatLng): Vec2 {
  return {
    x: (p.lng - origin.lng) * DEG * EARTH_RADIUS_M * Math.cos(origin.lat * DEG),
    y: (p.lat - origin.lat) * DEG * EARTH_RADIUS_M,
  };
}

export function fromLocal(origin: LatLng, v: Vec2): LatLng {
  return {
    lat: origin.lat + v.y / (DEG * EARTH_RADIUS_M),
    lng: origin.lng + v.x / (DEG * EARTH_RADIUS_M * Math.cos(origin.lat * DEG)),
  };
}

/** Horizontal unit vector pointing towards the given azimuth. */
export function azimuthToDir(azimuthDeg: number): Vec2 {
  return { x: Math.sin(azimuthDeg * DEG), y: Math.cos(azimuthDeg * DEG) };
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}
