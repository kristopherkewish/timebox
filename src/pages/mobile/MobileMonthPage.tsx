import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

import { PoolStrip } from '@/components/mobile/pool/PoolStrip';
import { MonthWeekCard } from '@/components/mobile/month/MonthWeekCard';
import { useFreshIds } from '@/hooks/useFreshIds';
import { useSettings } from '@/hooks/useSettings';
import { useSheet } from '@/hooks/useSheet';
import {
  useCreateMonthlyTask,
  useMonthly,
  useUpdateMonthlyTask,
} from '@/hooks/useMonthly';
import { buildMonthWeeks, currentMonthWeekIndex } from '@/lib/month';
import {
  localISODate,
  monthStartFor,
  parseISODate,
} from '@/lib/time';

const ISO_MONTH = /^\d{4}-\d{2}-01$/;
const POOL_DRAG_KIND = 'pool-card-month';

export function MobileMonthPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const today = useMemo(() => localISODate(), []);

  const queryMonth = params.get('month');
  const monthStart =
    queryMonth && ISO_MONTH.test(queryMonth) ? queryMonth : monthStartFor(today);

  const dataQ = useMonthly(monthStart);
  const update = useUpdateMonthlyTask(monthStart);
  const create = useCreateMonthlyTask(monthStart);
  const freshIds = useFreshIds((s) => s.ids);
  const markFresh = useFreshIds((s) => s.mark);
  const openSheet = useSheet((s) => s.open);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const setMonth = (m: string) => {
    if (m === monthStartFor(today)) {
      params.delete('month');
    } else {
      params.set('month', m);
    }
    setParams(params, { replace: true });
  };

  const ms = parseISODate(monthStart);
  const title = ms.toLocaleDateString(undefined, { month: 'long' });
  const yearLabel = ms.toLocaleDateString(undefined, { year: 'numeric' });

  const weeks = useMemo(
    () => buildMonthWeeks(monthStart, settings.firstDayOfWeek),
    [monthStart, settings.firstDayOfWeek],
  );
  const currentIdx = useMemo(
    () => currentMonthWeekIndex(weeks, today),
    [weeks, today],
  );

  const totalTasks =
    (dataQ.data?.pool?.length ?? 0) +
    Object.values(dataQ.data?.byWeek ?? {}).reduce(
      (s, arr) => s + (arr?.length ?? 0),
      0,
    );

  const poolTasks = useMemo(
    () =>
      (dataQ.data?.pool ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        note: t.notes ?? null,
        kind: t.kind,
      })),
    [dataQ.data?.pool],
  );

  const handleCreate = (title: string) => {
    create.mutate(
      { title },
      { onSuccess: (newTask) => markFresh(newTask.id) },
    );
  };

  const prevMonth = () => {
    const d = parseISODate(monthStart);
    d.setMonth(d.getMonth() - 1);
    setMonth(monthStartFor(localISODate(d)));
  };
  const nextMonth = () => {
    const d = parseISODate(monthStart);
    d.setMonth(d.getMonth() + 1);
    setMonth(monthStartFor(localISODate(d)));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const drag = e.active.data.current as
      | { kind?: string; task?: { id: string } }
      | undefined;
    if (drag?.kind !== POOL_DRAG_KIND || !drag.task) return;
    const overId = e.over?.id;
    if (typeof overId !== 'string' || !overId.startsWith('month-week-')) return;
    const idx = Number(overId.slice('month-week-'.length));
    if (!Number.isFinite(idx)) return;
    update.mutate(
      { id: drag.task.id, patch: { weekIndex: idx } },
      { onSuccess: () => markFresh(drag.task!.id) },
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">
            {weeks.length} weeks · {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
          </div>
          <div className="tbm-title">
            {title} <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{yearLabel}</span>
          </div>
        </div>
        <button
          type="button"
          className="tbm-iconbtn"
          aria-label="Previous month"
          onClick={prevMonth}
        >
          <ChevLeftIcon />
        </button>
        <button
          type="button"
          className="tbm-iconbtn"
          aria-label="Next month"
          onClick={nextMonth}
        >
          <ChevRightIcon />
        </button>
      </header>

      <div className="tbm-subhead">
        <div className="tbm-segmented" role="tablist">
          <button type="button" onClick={() => navigate('/')}>
            Day
          </button>
          <button type="button" onClick={() => navigate('/week')}>
            Week
          </button>
          <button type="button" className="active" aria-selected="true">
            Month
          </button>
        </div>
      </div>

      <div className="tbm-scroll">
        <div className="tbm-scroll-pad">
          <PoolStrip
            scope="month"
            tasks={poolTasks}
            freshIds={freshIds}
            dragKind={POOL_DRAG_KIND}
            onCreate={(title) => handleCreate(title)}
          />
          {weeks.map((w) => (
            <MonthWeekCard
              key={w.index}
              weekIndex={w.index}
              weekNumber={w.isoWeek}
              rangeLabel={w.range}
              isCurrent={w.index === currentIdx}
              tasks={dataQ.data?.byWeek[w.index] ?? []}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="tbm-fab"
        aria-label="Quick add"
        onClick={() => openSheet('quickAdd', { scope: 'month' })}
      >
        <PlusIcon />
      </button>
    </DndContext>
  );
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
