import { STATUS_META, type StatusEvaluation } from '../domain/sunStatus';
import { fmtTime } from './format';

type Slot = { time: number; evaluation: StatusEvaluation };
type Props = { slots: Slot[]; selected: number; onSelect: (time: number) => void };

export function Timeline({ slots, selected, onSelect }: Props) {
  return (
    <ol className="timeline">
      {slots.map(({ time, evaluation }) => {
        const meta = STATUS_META[evaluation.status];
        return (
          <li key={time}>
            <button
              className={`slot status-${evaluation.status} ${time === selected ? 'selected' : ''}`}
              onClick={() => onSelect(time)}
              title={meta.label}
            >
              <span className="slot-time">{fmtTime(time)}</span>
              <span className="slot-icon">{meta.icon}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
