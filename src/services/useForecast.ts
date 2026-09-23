import { useEffect, useState } from 'react';
import type { LatLng } from '../domain/types';
import { fetchForecast, type Forecast } from './weather';

const REFRESH_MS = 15 * 60_000;

export type ForecastState = { forecast: Forecast | null; error: string | null; loading: boolean };

export function useForecast(at: LatLng): ForecastState {
  const [state, setState] = useState<ForecastState>({ forecast: null, error: null, loading: true });

  useEffect(() => {
    const ctrl = new AbortController();
    const load = () =>
      fetchForecast(at, 8, ctrl.signal)
        .then((forecast) => setState({ forecast, error: null, loading: false }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e), loading: false }));
        });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [at]);

  return state;
}
