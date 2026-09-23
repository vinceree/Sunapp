import { getPosition } from 'suncalc';
import type { LatLng, SunPosition } from '../domain/types';

// suncalc ≥ 2 returns degrees with a north-based, clockwise azimuth.
export function sunPosition(date: Date, at: LatLng): SunPosition {
  const p = getPosition(date, at.lat, at.lng);
  return { azimuthDeg: p.azimuth, altitudeDeg: p.altitude };
}
