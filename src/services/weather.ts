import type { LatLng, WeatherSample } from '../domain/types';

export type Forecast = {
  current: WeatherSample;
  hourly: WeatherSample[];
  fetchedAt: number;
};

const HOURLY_VARS = [
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  // "_instant" = value at the timestamp, not the preceding-hour mean.
  'direct_normal_irradiance_instant',
];
const CURRENT_VARS = ['cloud_cover', 'direct_normal_irradiance'];

type OpenMeteoResponse = {
  current: { time: number; cloud_cover: number; direct_normal_irradiance?: number | null };
  hourly: {
    time: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    direct_normal_irradiance_instant: (number | null)[];
  };
};

/**
 * Open-Meteo forecast. With the default "best_match" model, locations in
 * Germany are served from DWD ICON-D2 (2 km) for the first ~2 days, so we get
 * the DWD model without dealing with GRIB files.
 */
export async function fetchForecast(at: LatLng, hours = 8, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: at.lat.toFixed(4),
    longitude: at.lng.toFixed(4),
    current: CURRENT_VARS.join(','),
    hourly: HOURLY_VARS.join(','),
    forecast_hours: String(hours),
    timeformat: 'unixtime',
    timezone: 'UTC',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo: HTTP ${res.status}`);
  return parseForecast((await res.json()) as OpenMeteoResponse);
}

export function parseForecast(data: OpenMeteoResponse): Forecast {
  const h = data.hourly;
  return {
    current: {
      time: data.current.time * 1000,
      cloudCover: data.current.cloud_cover,
      directNormalIrradiance: data.current.direct_normal_irradiance ?? null,
    },
    hourly: h.time.map((t, i) => ({
      time: t * 1000,
      cloudCover: h.cloud_cover[i],
      cloudCoverLow: h.cloud_cover_low[i],
      cloudCoverMid: h.cloud_cover_mid[i],
      cloudCoverHigh: h.cloud_cover_high[i],
      directNormalIrradiance: h.direct_normal_irradiance_instant[i] ?? null,
    })),
    fetchedAt: Date.now(),
  };
}

/** Hourly sample closest to `time` (within 90 min), else null. */
export function sampleAt(forecast: Forecast, time: number): WeatherSample | null {
  let best: WeatherSample | null = null;
  for (const s of forecast.hourly) {
    if (!best || Math.abs(s.time - time) < Math.abs(best.time - time)) best = s;
  }
  return best && Math.abs(best.time - time) <= 90 * 60_000 ? best : null;
}
