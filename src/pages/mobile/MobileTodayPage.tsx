import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from '@dnd-kit/core';

import { PoolStrip } from '@/components/mobile/pool/PoolStrip';
import { MobileTimeline } from '@/components/mobile/today/MobileTimeline';
import {
  useCreateTimebox,
  useDaily,
  useUpdateTimebox,
  type Timebox,
} from '@/hooks/useDaily';
import { useFreshIds } from '@/hooks/useFreshIds';
import { useSettings } from '@/hooks/useSettings';
import { useSheet } from '@/hooks/useSheet';
import { deriveState } from '@/lib/completion';
import {
  addDays,
  fmtDur,
  isPastDate,
  isToday,
  localISODate,
  nowMinutes,
  parseISODate,
} from '@/lib/time';
import { detectConflict, snapToIncrement } from '@/lib/timeline';
import { useCurrentDate } from '@/hooks/useCurrentDate';

const HOUR_PX = 80;
const POOL_DRAG_KIND = 'pool-card-day';

interface Ghost {
  startMin: number;
  durationMin: number;
  conflict: boolean;
}

export function MobileTodayPage() {
  const date = useCurrentDate();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const today = useMemo(() => localISODate(), []);
  const { settings } = useSettings();
  const dailyQ = useDaily(date);
  const create = useCreateTimebox(date);
  const update = useUpdateTimebox(date);
  const freshIds = useFreshIds((s) => s.ids);
  const markFresh = useFreshIds((s) => s.mark);
  const openSheet = useSheet((s) => s.open);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const [active, setActive] = useState<Timebox | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);

  const setDate = (d: string) => {
    if (d === today) {
      params.delete('date');
    } else {
      params.set('date', d);
    }
    setParams(params, { replace: true });
  };

  const dateObj = parseISODate(date);
  const eyebrow = dateObj
    .toLocaleDateString(undefined, { weekday: 'short' })
    .toUpperCase();
  const title = isToday(date)
    ? 'Today'
    : dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  const inbox: Timebox[] = dailyQ.data?.inbox ?? [];
  const timeline: Timebox[] = dailyQ.data?.timeline ?? [];

  const planned = timeline.reduce((s, b) => s + b.durationMin, 0);
  const completed = timeline
    .filter(
      (b) =>
        deriveState(now, {
          date,
          startMin: b.startMin,
          durationMin: b.durationMin,
          completionState: b.completionState,
          completionOverridden: b.completionOverridden,
        }) === 'completed',
    )
    .reduce((s, b) => s + b.durationMin, 0);
  const focus = Math.max(0, planned - completed);

  const inProgress = timeline.find(
    (b) =>
      deriveState(now, {
        date,
        startMin: b.startMin,
        durationMin: b.durationMin,
        completionState: b.completionState,
        completionOverridden: b.completionOverridden,
      }) === 'in-progress',
  );
  const livePillLabel = inProgress ? livePillFor(inProgress, now, date) : null;

  const handleCreate = (title: string, durationMin: number) => {
    create.mutate(
      { title, durationMin },
      { onSuccess: (newTask) => markFresh(newTask.id) },
    );
  };

  const poolTasks = useMemo(
    () =>
      inbox.map((t) => ({
        id: t.id,
        title: t.title,
        durationMin: t.durationMin,
        note: t.notes ?? null,
      })),
    [inbox],
  );

  // ---- Drag-and-drop: pool card → timeline ----

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { kind?: string; task?: Timebox } | undefined;
    if (data?.kind !== POOL_DRAG_KIND || !data.task) return;
    setActive(data.task);
  };

  const handleDragMove = (e: DragMoveEvent) => {
    if (!active) return;
    const cardTop = e.active.rect.current.translated?.top ?? 0;
    const grid = document.querySelector('.tbm-timeline');
    if (!grid) return;
    const gridTop = grid.getBoundingClientRect().top;
    const yInGrid = cardTop - gridTop;

    const target = snapToIncrement(
      settings.dayStartMin + (yInGrid / HOUR_PX) * 60,
      settings.defaultIncrementMin,
    );
    const start = Math.max(
      settings.dayStartMin,
      Math.min(settings.dayEndMin - active.durationMin, target),
    );
    const conflict =
      !settings.allowOverlap &&
      detectConflict(timeline, start, active.durationMin, active.id);
    setGhost({ startMin: start, durationMin: active.durationMin, conflict });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const cur = active;
    const g = ghost;
    setActive(null);
    setGhost(null);
    if (!cur || !g) return;
    if (e.over?.id !== 'timeline-drop') return;
    if (g.conflict) return;
    if (isPastDate(date)) return; // mobile defers past-day confirm to Phase 12 polish
    update.mutate(
      { id: cur.id, patch: { startMin: g.startMin } },
      { onSuccess: () => markFresh(cur.id) },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActive(null);
        setGhost(null);
      }}
    >
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">{eyebrow}</div>
          <div className="tbm-title">{title}</div>
        </div>
        <button
          type="button"
          className="tbm-iconbtn"
          aria-label="Previous day"
          onClick={() => setDate(addDays(date, -1))}
        >
          <ChevLeftIcon />
        </button>
        <button
          type="button"
          className="tbm-iconbtn"
          aria-label="Next day"
          onClick={() => setDate(addDays(date, 1))}
        >
          <ChevRightIcon />
        </button>
      </header>

      <div className="tbm-subhead">
        <div className="tbm-segmented" role="tablist">
          <button type="button" className="active" aria-selected="true">
            Day
          </button>
          <button
            type="button"
            aria-selected="false"
            onClick={() => navigate('/week')}
          >
            Week
          </button>
          <button
            type="button"
            aria-selected="false"
            onClick={() => navigate('/month')}
          >
            Month
          </button>
        </div>
        {livePillLabel && (
          <span className="tbm-pill" style={{ marginLeft: 'auto' }}>
            <span className="dot" />
            {livePillLabel}
          </span>
        )}
      </div>

      <div className="tbm-stats">
        <Stat label="Scheduled" mins={planned} />
        <Stat label="Done" mins={completed} />
        <Stat label="Focus" mins={focus} />
      </div>

      <div className="tbm-scroll">
        <div className="tbm-scroll-pad">
          <PoolStrip
            scope="day"
            tasks={poolTasks}
            freshIds={freshIds}
            dragKind={POOL_DRAG_KIND}
            onCreate={handleCreate}
            onTap={(id) => openSheet('schedule', { taskId: id })}
          />
          <MobileTimeline
            date={date}
            blocks={timeline}
            hourPx={HOUR_PX}
            dayStartMin={settings.dayStartMin}
            dayEndMin={settings.dayEndMin}
            freshIds={freshIds}
            ghost={ghost}
            onTapBlock={(id) => openSheet('block', { taskId: id })}
          />
        </div>
      </div>

      <button
        type="button"
        className="tbm-fab"
        aria-label="Quick add"
        onClick={() => openSheet('quickAdd')}
      >
        <PlusIcon />
      </button>
    </DndContext>
  );
}

function Stat({ label, mins }: { label: string; mins: number }) {
  const formatted = fmtDur(Math.max(0, mins));
  return (
    <div className="tbm-stat">
      <div className="tbm-stat-value">
        <StatValue formatted={formatted} />
      </div>
      <div className="tbm-stat-label">{label}</div>
    </div>
  );
}

function StatValue({ formatted }: { formatted: string }) {
  // fmtDur returns "Nh", "Nm", or "Nh Nm" — render units smaller.
  const parts = formatted.split(' ');
  return (
    <>
      {parts.map((p, i) => {
        const num = p.match(/^\d+/)?.[0] ?? '';
        const unit = p.slice(num.length);
        return (
          <span key={i}>
            {num}
            <span className="unit">{unit}</span>
            {i < parts.length - 1 && ' '}
          </span>
        );
      })}
    </>
  );
}

function livePillFor(block: Timebox, now: number, date: string): string | null {
  if (block.startMin == null) return null;
  if (!isToday(date, new Date(now))) return null;
  const elapsedMin = nowMinutes(new Date(now)) - block.startMin;
  if (elapsedMin < 0) return null;
  const m = elapsedMin % 60;
  const h = Math.floor(elapsedMin / 60);
  return h > 0
    ? `Live · ${h}:${String(m).padStart(2, '0')}`
    : `Live · 0:${String(m).padStart(2, '0')}`;
}

function ChevLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChevRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
