import { getPosition, getTimes } from 'suncalc';
import type { LatLng, SunPosition } from '../domain/types';

// suncalc ≥ 2 returns degrees with a north-based, clockwise azimuth.
export function sunPosition(date: Date, at: LatLng): SunPosition {
  const p = getPosition(date, at.lat, at.lng);
  return { azimuthDeg: p.azimuth, altitudeDeg: p.altitude };
}

export function sunTimes(date: Date, at: LatLng): { sunrise: Date | null; sunset: Date | null } {
  const t = getTimes(date, at.lat, at.lng);
  return { sunrise: t.sunrise ?? null, sunset: t.sunset ?? null };
}
