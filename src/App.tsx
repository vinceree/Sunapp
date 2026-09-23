import { useEffect, useMemo, useState } from 'react';
import { ShadowPlan } from './components/ShadowPlan';
import { StatusCard } from './components/StatusCard';
import { Timeline } from './components/Timeline';
import { fmtTime } from './components/format';
import { TEST_BUILDINGS, TEST_CAFE } from './data/cafes';
import { computeShadow } from './domain/shadow';
import { evaluateStatus } from './domain/sunStatus';
import type { WeatherSample } from './domain/types';
import { sunPosition } from './services/sun';
import { useForecast } from './services/useForecast';
import { sampleAt, type Forecast } from './services/weather';

const HOURS_AHEAD = 6;
const HOUR = 3_600_000;

type WeatherMode = 'live' | 'clear' | 'overcast';

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function weatherFor(time: number, isNow: boolean, mode: WeatherMode, forecast: Forecast | null): WeatherSample | null {
  if (mode === 'clear') return { time, cloudCover: 5, directNormalIrradiance: null };
  if (mode === 'overcast') return { time, cloudCover: 95, directNormalIrradiance: null };
  if (!forecast) return null;
  return isNow ? forecast.current : sampleAt(forecast, time);
}

export default function App() {
  const now = useNow();
  const { forecast, error, loading } = useForecast(TEST_CAFE.terrace);
  const [mode, setMode] = useState<WeatherMode>('live');
  const [selected, setSelected] = useState<number | null>(null); // null = now

  // "now" plus the next full hours.
  const times = useMemo(() => {
    const firstFull = Math.ceil(now / HOUR) * HOUR;
    return [now, ...Array.from({ length: HOURS_AHEAD }, (_, i) => firstFull + i * HOUR)];
  }, [now]);

  const slots = useMemo(
    () =>
      times.map((time, i) => {
        const sun = sunPosition(new Date(time), TEST_CAFE.terrace);
        const shadow = computeShadow(TEST_CAFE.terrace, TEST_BUILDINGS, sun);
        return { time, evaluation: evaluateStatus(sun, shadow, weatherFor(time, i === 0, mode, forecast)) };
      }),
    [times, mode, forecast],
  );

  const active = slots.find((s) => s.time === selected) ?? slots[0];
  const weatherSource =
    mode === 'live' ? (forecast ? `Open-Meteo, Stand ${fmtTime(forecast.fetchedAt)}` : 'Open-Meteo') : 'Simulation';

  return (
    <main>
      <header className="app-header">
        <h1>☀️ Sonnenradar Karlsruhe</h1>
        <p className="muted">Gebäudeschatten × Live-Bewölkung</p>
      </header>

      <StatusCard cafeName={TEST_CAFE.name} time={active.time} evaluation={active.evaluation} weatherSource={weatherSource} />

      <Timeline slots={slots} selected={active.time} onSelect={(t) => setSelected(t === slots[0].time ? null : t)} />

      <ShadowPlan origin={TEST_CAFE.terrace} buildings={TEST_BUILDINGS} sun={active.evaluation.sun} status={active.evaluation.status} />

      <section className="card">
        <h3>Wetterquelle</h3>
        <div className="modes" role="radiogroup">
          {(
            [
              ['live', 'Live (Open-Meteo)'],
              ['clear', 'Simuliert: wolkenlos'],
              ['overcast', 'Simuliert: bedeckt'],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="mode" checked={mode === value} onChange={() => setMode(value)} /> {label}
            </label>
          ))}
        </div>
        {mode === 'live' && loading && <p className="muted small">Lade Wetterdaten …</p>}
        {mode === 'live' && error && <p className="error small">Wetterdaten nicht verfügbar ({error}). Status zeigt nur „schattenfrei“.</p>}
      </section>
    </main>
  );
}
