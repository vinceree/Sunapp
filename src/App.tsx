import { useCallback, useEffect, useMemo, useState } from 'react';
import { PointPanel } from './components/PointPanel';
import { fmtTime } from './components/format';
import { computeShadow } from './domain/shadow';
import { assessSky, evaluateStatus } from './domain/sunStatus';
import type { Building, LatLng, WeatherSample } from './domain/types';
import { COLORS, type SkyTint } from './map/shadowCanvas';
import { MIN_SHADOW_ZOOM, SunMap } from './map/SunMap';
import { sunPosition, sunTimes } from './services/sun';
import { useForecast } from './services/useForecast';
import { sampleAt, type Forecast } from './services/weather';

const KARLSRUHE: LatLng = { lat: 49.00937, lng: 8.40391 };
const MAX_OFFSET_MIN = 12 * 60;
const MIN = 60_000;
const HOUR = 60 * MIN;

function useNow(intervalMs = MIN) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function weatherAt(forecast: Forecast | null, time: number, isNow: boolean): WeatherSample | null {
  if (!forecast) return null;
  return isNow ? forecast.current : sampleAt(forecast, time);
}

export default function App() {
  const now = useNow();
  const [offsetMin, setOffsetMin] = useState(0);
  const [view, setView] = useState({ center: KARLSRUHE, zoom: 16.5 });
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [picked, setPicked] = useState<LatLng | null>(null);
  const { forecast, error, loading } = useForecast(view.center);

  const time = now + offsetMin * MIN;
  const isNow = offsetMin === 0;
  const sun = useMemo(() => sunPosition(new Date(time), view.center), [time, view.center]);
  const weather = weatherAt(forecast, time, isNow);
  const sky = weather ? assessSky(weather) : null;
  const tint: SkyTint = sun.altitudeDeg <= 0 ? 'none' : !sky ? 'unknown' : sky.clear ? 'sun' : 'cloud';

  const setTime = useCallback((t: number) => setOffsetMin(Math.max(0, Math.round((t - now) / MIN))), [now]);

  // Status of the picked point: selected time plus the next full hours.
  const point = useMemo(() => {
    if (!picked) return null;
    const firstFull = Math.ceil(now / HOUR) * HOUR;
    const times = [now, ...Array.from({ length: 6 }, (_, i) => firstFull + i * HOUR)];
    if (!times.includes(time)) {
      times.push(time);
      times.sort((a, b) => a - b);
    }
    const evalAt = (t: number) => {
      const s = sunPosition(new Date(t), picked);
      return evaluateStatus(s, computeShadow(picked, buildings, s), weatherAt(forecast, t, t === now));
    };
    const slots = times.slice(0, 7).map((t) => ({ time: t, evaluation: evalAt(t) }));
    return { current: evalAt(time), slots };
  }, [picked, buildings, forecast, now, time]);

  // Hourly sun/cloud strip under the slider.
  const strip = useMemo(
    () =>
      Array.from({ length: MAX_OFFSET_MIN / 60 }, (_, h) => {
        const t = now + (h + 0.5) * HOUR;
        if (sunPosition(new Date(t), view.center).altitudeDeg <= 0) return { t, icon: '🌙' };
        const w = forecast ? sampleAt(forecast, t) : null;
        return { t, icon: w ? (assessSky(w).clear ? '☀️' : '☁️') : '·' };
      }),
    [now, forecast, view.center],
  );

  const { sunrise, sunset } = sunTimes(new Date(time), view.center);
  const skyText =
    sun.altitudeDeg <= 0
      ? `🌙 Sonne unter dem Horizont${sunrise && sunrise.getTime() > time ? ` · Aufgang ${fmtTime(sunrise)}` : ''}`
      : !weather
        ? loading
          ? 'Lade Wetterdaten …'
          : `Wetterdaten nicht verfügbar${error ? ` (${error})` : ''}. Angezeigt werden nur die Gebäudeschatten.`
        : sky?.clear
          ? `☀️ Sonne scheint · ${weather.cloudCover} % Wolken${weather.directNormalIrradiance !== null ? `, ${Math.round(weather.directNormalIrradiance)} W/m²` : ''}`
          : `☁️ Bewölkt (${weather.cloudCover} %): gerade nirgends direkte Sonne`;

  return (
    <div className="app">
      <SunMap
        initialCenter={KARLSRUHE}
        sun={sun}
        tint={tint}
        picked={picked}
        onPick={setPicked}
        onBuildings={setBuildings}
        onView={setView}
      />

      <header className="panel top-panel">
        <h1>Sonnenradar</h1>
        <p className="sky">{skyText}</p>
        {sun.altitudeDeg > 0 && (
          <div className="legend small">
            <span>
              <i style={{ background: tint === 'cloud' ? COLORS.cloud : COLORS.sun }} />
              {tint === 'cloud' ? 'schattenfrei, aber bewölkt' : 'Sonne'}
            </span>
            <span>
              <i style={{ background: COLORS.shadow }} />
              Gebäudeschatten
            </span>
            {sunset && <span className="muted">Untergang {fmtTime(sunset)}</span>}
          </div>
        )}
        {view.zoom < MIN_SHADOW_ZOOM && <p className="hint small">Weiter reinzoomen, um Schatten zu sehen.</p>}
      </header>

      <div className="bottom">
        {point && picked && (
          <PointPanel
            evaluation={point.current}
            slots={point.slots}
            selected={time}
            onSelect={setTime}
            onClose={() => setPicked(null)}
          />
        )}
        <section className="panel time-panel">
          <div className="time-row">
            <strong className="time-label">{isNow ? `Jetzt, ${fmtTime(time)}` : `${fmtTime(time)} Uhr`}</strong>
            {!isNow && (
              <button className="now-btn" onClick={() => setOffsetMin(0)}>
                Jetzt
              </button>
            )}
            {!picked && <span className="muted small">Tipp: auf die Karte tippen für Details zu einem Ort</span>}
          </div>
          <input
            type="range"
            min={0}
            max={MAX_OFFSET_MIN}
            step={15}
            value={offsetMin}
            onChange={(e) => setOffsetMin(Number(e.target.value))}
            aria-label="Zeitpunkt"
          />
          <div className="strip" aria-hidden>
            {strip.map((s) => (
              <span key={s.t} title={fmtTime(s.t)}>
                {s.icon}
              </span>
            ))}
          </div>
          <div className="strip-labels muted small" aria-hidden>
            {[0, 3, 6, 9, 12].map((h) => (
              <span key={h}>{fmtTime(now + h * HOUR)}</span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
