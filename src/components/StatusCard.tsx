import { STATUS_META, SUNSHINE_DNI_THRESHOLD, SUNNY_MAX_CLOUD_COVER, type StatusEvaluation } from '../domain/sunStatus';
import { compass, fmtDeg, fmtTime } from './format';

type Props = { cafeName: string; time: number; evaluation: StatusEvaluation; weatherSource: string };

export function StatusCard({ cafeName, time, evaluation, weatherSource }: Props) {
  const { status, sun, shadow, sky, weather } = evaluation;
  const meta = STATUS_META[status];

  return (
    <section className={`card status status-${status}`}>
      <header>
        <span className="status-icon" aria-hidden>
          {meta.icon}
        </span>
        <div>
          <h2>{meta.label}</h2>
          <p className="muted">
            {cafeName} · {fmtTime(time)} Uhr
          </p>
        </div>
      </header>

      <dl className="factors">
        <dt>☀ Sonnenstand</dt>
        <dd>
          Höhe {fmtDeg(sun.altitudeDeg)}, Richtung {fmtDeg(sun.azimuthDeg)} ({compass(sun.azimuthDeg)})
        </dd>

        <dt>🏢 Gebäudeschatten</dt>
        <dd>
          {sun.altitudeDeg <= 0
            ? '–'
            : shadow.shadowed
              ? `Ja: ${shadow.hit.building.name ?? shadow.hit.building.id} in ${shadow.hit.distanceM.toFixed(0)} m verdeckt die Sonne bis ${fmtDeg(shadow.hit.obstructionAngleDeg)} Höhe`
              : 'Nein, freie Sichtlinie zur Sonne'}
        </dd>

        <dt>☁ Bewölkung</dt>
        <dd>
          {weather ? (
            <>
              {weather.cloudCover} % gesamt
              {weather.cloudCoverLow !== undefined &&
                ` (tief ${weather.cloudCoverLow} / mittel ${weather.cloudCoverMid} / hoch ${weather.cloudCoverHigh} %)`}
              {weather.directNormalIrradiance !== null && `, Direktstrahlung ${Math.round(weather.directNormalIrradiance)} W/m²`}
              <br />
              <span className="muted">
                {sky?.basis === 'dni'
                  ? `Sonnig ab ${SUNSHINE_DNI_THRESHOLD} W/m² Direktstrahlung (WMO-Definition)`
                  : `Sonnig bis ${SUNNY_MAX_CLOUD_COVER} % Bewölkung`}{' '}
                · Quelle: {weatherSource}
              </span>
            </>
          ) : (
            'keine Wetterdaten'
          )}
        </dd>
      </dl>
    </section>
  );
}
