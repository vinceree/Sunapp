import { STATUS_META, type StatusEvaluation } from '../domain/sunStatus';
import { compass, fmtDeg } from './format';
import { Timeline } from './Timeline';

type Slot = { time: number; evaluation: StatusEvaluation };
type Props = { evaluation: StatusEvaluation; slots: Slot[]; selected: number; onSelect: (t: number) => void; onClose: () => void };

export function PointPanel({ evaluation, slots, selected, onSelect, onClose }: Props) {
  const { status, sun, shadow, weather } = evaluation;
  const meta = STATUS_META[status];
  const detail =
    status === 'night'
      ? 'Die Sonne steht unter dem Horizont.'
      : shadow.shadowed
        ? shadow.insideBuilding
          ? 'Der Punkt liegt in einem Gebäude.'
          : `Ein ${shadow.hit.building.heightM.toFixed(0)} m hohes Gebäude in ${shadow.hit.distanceM.toFixed(0)} m Entfernung verdeckt die Sonne.`
        : weather
          ? evaluation.sky?.clear
            ? `Freie Sicht zur Sonne, Himmel klar (${weather.cloudCover} % Wolken).`
            : `Kein Gebäude im Weg, aber bewölkt (${weather.cloudCover} % Wolken).`
          : 'Kein Gebäude im Weg. Wetterdaten fehlen.';

  return (
    <section className="panel point-panel" aria-live="polite">
      <button className="close" onClick={onClose} aria-label="Schließen">
        ×
      </button>
      <div className="point-head">
        <span className="point-icon" aria-hidden>
          {meta.icon}
        </span>
        <div>
          <h2>{meta.label}</h2>
          <p className="muted small">{detail}</p>
          {sun.altitudeDeg > 0 && (
            <p className="muted small">
              Sonne {fmtDeg(sun.altitudeDeg)} hoch, aus {compass(sun.azimuthDeg)} ({fmtDeg(sun.azimuthDeg)})
            </p>
          )}
        </div>
      </div>
      <Timeline slots={slots} selected={selected} onSelect={onSelect} />
    </section>
  );
}
