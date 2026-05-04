import { useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { fmtTime, isToday, nowMinutes } from '@/lib/time';
import { minutesToPx } from '@/lib/timeline';
import { deriveState } from '@/lib/completion';
import type { BlockState } from '@/lib/completion';
import type { Timebox } from '@/hooks/useDaily';
import { Block } from './Block';
import { DropLabel } from './DropLabel';
import { HourGrid } from './HourGrid';

interface Props {
  date: string;
  timeline: Timebox[];
  hourPx: number;
  dayStartMin: number;
  dayEndMin: number;
  showStats: boolean;
  increment: number;
  ghost: { startMin: number; durationMin: number; conflict: boolean } | null;
  onOpen: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onKeyboardNudge?: (id: string, deltaMin: number) => void;
  onKeyboardResize?: (id: string, deltaMin: number) => void;
}

export function Timeline({
  date,
  timeline,
  hourPx,
  dayStartMin,
  dayEndMin,
  showStats,
  increment,
  ghost,
  onOpen,
  onToggleComplete,
  onKeyboardNudge,
  onKeyboardResize,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { setNodeRef: setDropRef } = useDroppable({
    id: 'timeline-drop',
    data: { kind: 'timeline-drop' },
  });

  const setRefs = (el: HTMLDivElement | null) => {
    wrapRef.current = el;
    setDropRef(el);
  };

  const states: Record<string, BlockState> = useMemo(() => {
    const out: Record<string, BlockState> = {};
    for (const b of timeline) {
      out[b.id] = deriveState(now, {
        date,
        startMin: b.startMin,
        durationMin: b.durationMin,
        completionState: b.completionState,
        completionOverridden: b.completionOverridden,
      });
    }
    return out;
  }, [timeline, date, now]);

  const planned = timeline.reduce((s, b) => s + b.durationMin, 0);
  const completed = timeline
    .filter((b) => states[b.id] === 'completed')
    .reduce((s, b) => s + b.durationMin, 0);
  const remaining = planned - completed;

  const showNow = isToday(date, new Date(now));
  const nowMin = nowMinutes(new Date(now));
  const nowTop =
    showNow && nowMin >= dayStartMin && nowMin <= dayEndMin
      ? minutesToPx(nowMin, dayStartMin, hourPx)
      : null;
  const pastWashH = nowTop ?? (showNow ? 0 : 0);

  const inProgress = timeline.find((b) => states[b.id] === 'in-progress');

  return (
    <div className="tb-timeline-wrap" ref={setRefs}>
      {showStats && (
        <div className="tb-stats">
          <Stat label="Planned" mins={planned} />
          <Stat label="Completed" mins={completed} />
          <Stat label="Remaining" mins={remaining} />
          <div className="tb-stat">
            <div className="tb-stat-label">Increment</div>
            <div className="tb-stat-value">
              {increment}
              <span className="unit">min</span>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {inProgress && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 2 }}>
              <span className="tb-filter-chip">
                <span className="dot" />
                In progress · {inProgress.title}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="tb-timeline" style={{ ['--hour' as string]: `${hourPx}px` }}>
        <div className="tb-timeline-grid" style={{ position: 'relative' }}>
          {showNow && nowTop != null && (
            <div className="tb-past-wash" style={{ height: pastWashH }} />
          )}
          <HourGrid dayStart={dayStartMin / 60} dayEnd={dayEndMin / 60} hourPx={hourPx} />
          {showNow && nowTop != null && (
            <div className="tb-now" style={{ top: nowTop }}>
              <div className="tb-now-label">{fmtTime(nowMin).replace(' ', '')}</div>
            </div>
          )}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            {timeline.map((b) => (
              <Block
                key={b.id}
                block={b}
                state={states[b.id]}
                hourPx={hourPx}
                dayStart={dayStartMin}
                onOpen={onOpen}
                onToggleComplete={onToggleComplete}
                onKeyboardNudge={onKeyboardNudge}
                onKeyboardResize={onKeyboardResize}
              />
            ))}
            {ghost && (
              <>
                <div
                  className={`tb-block ghost ${ghost.conflict ? 'conflict' : ''}`}
                  style={{
                    top: minutesToPx(ghost.startMin, dayStartMin, hourPx),
                    height: (ghost.durationMin / 60) * hourPx,
                  }}
                >
                  <div className="tb-block-title">
                    <span className="tb-check" />
                    <span>
                      {ghost.conflict ? 'Conflict' : `Drop at ${fmtTime(ghost.startMin)}`}
                    </span>
                  </div>
                  <div className="tb-block-meta">
                    <span>
                      {fmtTime(ghost.startMin)} –{' '}
                      {fmtTime(ghost.startMin + ghost.durationMin)}
                    </span>
                  </div>
                </div>
                <DropLabel
                  time={ghost.startMin}
                  top={minutesToPx(ghost.startMin, dayStartMin, hourPx) - 10}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, mins }: { label: string; mins: number }) {
  return (
    <div className="tb-stat">
      <div className="tb-stat-label">{label}</div>
      <div className="tb-stat-value">
        {Math.floor(mins / 60)}
        <span className="unit">h </span>
        {mins % 60}
        <span className="unit">m</span>
      </div>
    </div>
  );
}
