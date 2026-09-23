import type { ShadowResult } from './shadow';
import type { SunPosition, SunStatus, WeatherSample } from './types';

/** WMO definition of "sunshine": direct normal irradiance ≥ 120 W/m². */
export const SUNSHINE_DNI_THRESHOLD = 120;
/** Fallback when no irradiance is available. */
export const SUNNY_MAX_CLOUD_COVER = 40;

export type SkyAssessment = { clear: boolean; basis: 'dni' | 'cloudCover' };

export function assessSky(w: WeatherSample): SkyAssessment {
  // Irradiance is the better signal: thin cirrus can mean 80 % "cloud cover"
  // while the sun still casts sharp shadows.
  if (w.directNormalIrradiance !== null) {
    return { clear: w.directNormalIrradiance >= SUNSHINE_DNI_THRESHOLD, basis: 'dni' };
  }
  return { clear: w.cloudCover <= SUNNY_MAX_CLOUD_COVER, basis: 'cloudCover' };
}

export type StatusEvaluation = {
  status: SunStatus;
  sun: SunPosition;
  shadow: ShadowResult;
  sky: SkyAssessment | null;
  weather: WeatherSample | null;
};

/**
 * Combines geometry and weather. Priority: night > building shadow > clouds.
 * Without weather data we cannot claim "sunny", so the result is "cloudy"
 * (= free of building shadow, sky unknown) and `sky` is null.
 */
export function evaluateStatus(sun: SunPosition, shadow: ShadowResult, weather: WeatherSample | null): StatusEvaluation {
  const sky = weather ? assessSky(weather) : null;
  let status: SunStatus;
  if (sun.altitudeDeg <= 0) status = 'night';
  else if (shadow.shadowed) status = 'shaded';
  else if (sky?.clear) status = 'sunny';
  else status = 'cloudy';
  return { status, sun, shadow, sky, weather };
}

export const STATUS_META: Record<SunStatus, { icon: string; label: string }> = {
  sunny: { icon: '☀️', label: 'Sonnig' },
  cloudy: { icon: '⛅', label: 'Schattenfrei, aber bewölkt' },
  shaded: { icon: '🌑', label: 'Verschattet' },
  night: { icon: '🌙', label: 'Sonne unter dem Horizont' },
};
