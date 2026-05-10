import { useEffect, useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';

import type { Timebox } from '@/hooks/useDaily';
import { deriveState, type BlockState } from '@/lib/completion';
import { fmtTime, isPastDate, isToday, nowMinutes } from '@/lib/time';
import { minutesToPx } from '@/lib/timeline';

import { MobileBlock } from './MobileBlock';

interface Ghost {
  startMin: number;
  durationMin: number;
  conflict: boolean;
}

interface Props {
  date: string;
  blocks: Timebox[];
  hourPx: number;
  dayStartMin: number;
  dayEndMin: number;
  freshIds: ReadonlySet<string>;
  ghost?: Ghost | null;
  onTapBlock: (id: string) => void;
}

export function MobileTimeline({
  date,
  blocks,
  hourPx,
  dayStartMin,
  dayEndMin,
  freshIds,
  ghost,
  onTapBlock,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { setNodeRef } = useDroppable({
    id: 'timeline-drop',
    data: { kind: 'timeline-drop' },
  });

  const states: Record<string, BlockState> = useMemo(() => {
    const out: Record<string, BlockState> = {};
    for (const b of blocks) {
      out[b.id] = deriveState(now, {
        date,
        startMin: b.startMin,
        durationMin: b.durationMin,
        completionState: b.completionState,
        completionOverridden: b.completionOverridden,
      });
    }
    return out;
  }, [blocks, date, now]);

  const showNow = isToday(date, new Date(now));
  const isPast = isPastDate(date);
  const nowMin = nowMinutes(new Date(now));
  const dayHeightPx = ((dayEndMin - dayStartMin) / 60) * hourPx;

  let pastWashH = 0;
  if (isPast) {
    pastWashH = dayHeightPx;
  } else if (showNow && nowMin >= dayStartMin && nowMin <= dayEndMin) {
    pastWashH = minutesToPx(nowMin, dayStartMin, hourPx);
  }

  const hours = Math.floor((dayEndMin - dayStartMin) / 60);
  const startHour = dayStartMin / 60;
  const showNowLine = showNow && nowMin >= dayStartMin && nowMin <= dayEndMin;

  return (
    <div className="tbm-timeline" ref={setNodeRef}>
      {Array.from({ length: hours }, (_, i) => {
        const h = startHour + i;
        return (
          <div className="tbm-hour" key={h}>
            <div className="tbm-hour-label">{fmtTime(h * 60)}</div>
            <div className="tbm-q q1" />
            <div className="tbm-q q2" />
            <div className="tbm-q q3" />
          </div>
        );
      })}

      {pastWashH > 0 && <div className="tbm-past" style={{ height: pastWashH }} />}

      {blocks.map((b) => (
        <MobileBlock
          key={b.id}
          block={b}
          state={states[b.id] ?? 'upcoming'}
          hourPx={hourPx}
          dayStartMin={dayStartMin}
          fresh={freshIds.has(b.id)}
          onTap={onTapBlock}
        />
      ))}

      {showNowLine && (
        <div
          className="tbm-now"
          style={{ top: minutesToPx(nowMin, dayStartMin, hourPx) }}
        >
          <div className="tbm-now-label">{fmtTime(nowMin).replace(' ', '')}</div>
        </div>
      )}

      {ghost && (
        <div
          className={`tbm-block fresh${ghost.conflict ? ' conflict' : ''}`}
          style={{
            top: minutesToPx(ghost.startMin, dayStartMin, hourPx),
            height: (ghost.durationMin / 60) * hourPx - 4,
          }}
        >
          <div className="tbm-block-title">
            <span className="tbm-check" />
            <span>
              {ghost.conflict ? 'Conflict' : `Drop at ${fmtTime(ghost.startMin)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
