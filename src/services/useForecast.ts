import { useEffect, useState } from 'react';
import type { LatLng } from '../domain/types';
import { fetchForecast, type Forecast } from './weather';

const REFRESH_MS = 15 * 60_000;
/** Weather models have a ~2 km grid; no need to refetch for smaller pans. */
const GRID_DEG = 0.02;

export type ForecastState = { forecast: Forecast | null; error: string | null; loading: boolean };

const snap = (v: number) => Math.round(v / GRID_DEG) * GRID_DEG;

export function useForecast(at: LatLng, hours = 14): ForecastState {
  const [state, setState] = useState<ForecastState>({ forecast: null, error: null, loading: true });
  const lat = snap(at.lat);
  const lng = snap(at.lng);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () => {
      setState((s) => ({ ...s, loading: true }));
      fetchForecast({ lat, lng }, hours, ctrl.signal)
        .then((forecast) => setState({ forecast, error: null, loading: false }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e), loading: false }));
        });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [lat, lng, hours]);

  return state;
}
