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
import { WeekCard } from '@/components/mobile/week/WeekCard';
import { WeekStrip, type WeekStripCell } from '@/components/mobile/week/WeekStrip';
import { useFreshIds } from '@/hooks/useFreshIds';
import { useSettings } from '@/hooks/useSettings';
import { useSheet } from '@/hooks/useSheet';
import {
  useCreateWeeklyTask,
  useUpdateWeeklyTask,
  useWeekly,
  type WeeklyTask,
} from '@/hooks/useWeekly';
import {
  addDays,
  localISODate,
  parseISODate,
  weekStartFor,
} from '@/lib/time';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const POOL_DRAG_KIND = 'pool-card-week';
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MobileWeekPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const today = useMemo(() => localISODate(), []);
  const fdw = settings.firstDayOfWeek;

  const queryWeek = params.get('week');
  const weekStart =
    queryWeek && ISO.test(queryWeek) ? queryWeek : weekStartFor(today, fdw);

  const dataQ = useWeekly(weekStart);
  const update = useUpdateWeeklyTask(weekStart);
  const create = useCreateWeeklyTask(weekStart);
  const freshIds = useFreshIds((s) => s.ids);
  const markFresh = useFreshIds((s) => s.mark);
  const openSheet = useSheet((s) => s.open);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const setWeek = (w: string) => {
    if (w === weekStartFor(today, fdw)) {
      params.delete('week');
    } else {
      params.set('week', w);
    }
    setParams(params, { replace: true });
  };

  const orderedDays = useMemo(
    () => orderDays(weekStart, fdw, dataQ.data?.days ?? []),
    [weekStart, fdw, dataQ.data?.days],
  );

  const stripCells: WeekStripCell[] = orderedDays.map((d) => ({
    dayOfWeek: d.dayOfWeek,
    dayNum: Number(d.dayDate.slice(-2)),
    count: d.tasks.length,
    isToday: d.dayDate === today,
    isWeekend: d.dayOfWeek === 0 || d.dayOfWeek === 6,
  }));

  const start = parseISODate(weekStart);
  const end = parseISODate(addDays(weekStart, 6));
  const eyebrow = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const totalTasks =
    (dataQ.data?.pool?.length ?? 0) +
    (dataQ.data?.days?.reduce((s, d) => s + d.tasks.length, 0) ?? 0);

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

  const handleDragEnd = (e: DragEndEvent) => {
    const drag = e.active.data.current as
      | { kind?: string; task?: { id: string } }
      | undefined;
    if (drag?.kind !== POOL_DRAG_KIND || !drag.task) return;
    const overId = e.over?.id;
    if (typeof overId !== 'string' || !overId.startsWith('week-day-')) return;
    const dow = Number(overId.slice('week-day-'.length));
    if (!Number.isFinite(dow)) return;
    update.mutate(
      { id: drag.task.id, patch: { dayOfWeek: dow } },
      { onSuccess: () => markFresh(drag.task!.id) },
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <header className="tbm-header">
        <div className="tbm-header-l">
          <div className="tbm-eyebrow">{eyebrow}</div>
          <div className="tbm-title">This week</div>
        </div>
        <button
          type="button"
          className="tbm-iconbtn"
          aria-label="Previous week"
          onClick={() => setWeek(addDays(weekStart, -7))}
        >
          <ChevLeftIcon />
        </button>
        <button
          type="button"
          className="tbm-iconbtn"
          aria-label="Next week"
          onClick={() => setWeek(addDays(weekStart, 7))}
        >
          <ChevRightIcon />
        </button>
      </header>

      <div className="tbm-subhead">
        <div className="tbm-segmented" role="tablist">
          <button type="button" onClick={() => navigate('/')}>
            Day
          </button>
          <button type="button" className="active" aria-selected="true">
            Week
          </button>
          <button type="button" onClick={() => navigate('/month')}>
            Month
          </button>
        </div>
        <span className="tbm-pill" style={{ marginLeft: 'auto' }}>
          {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      <WeekStrip days={stripCells} />

      <div className="tbm-scroll">
        <div className="tbm-scroll-pad">
          <PoolStrip
            scope="week"
            tasks={poolTasks}
            freshIds={freshIds}
            dragKind={POOL_DRAG_KIND}
            onCreate={(title) => handleCreate(title)}
          />
          {orderedDays.map((d) => (
            <WeekCard
              key={d.dayOfWeek}
              dayOfWeek={d.dayOfWeek}
              dayNum={Number(d.dayDate.slice(-2))}
              dowLabel={DOW_LABELS[d.dayOfWeek]}
              isToday={d.dayDate === today}
              isWeekend={d.dayOfWeek === 0 || d.dayOfWeek === 6}
              tasks={d.tasks}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="tbm-fab"
        aria-label="Quick add"
        onClick={() => openSheet('quickAdd', { scope: 'week' })}
      >
        <PlusIcon />
      </button>
    </DndContext>
  );
}

interface OrderedDay {
  dayOfWeek: number;
  tasks: WeeklyTask[];
  dayDate: string;
}

function orderDays(
  weekStart: string,
  firstDayOfWeek: number,
  days: { dayOfWeek: number; tasks: WeeklyTask[] }[],
): OrderedDay[] {
  const byDow = new Map(days.map((d) => [d.dayOfWeek, d.tasks]));
  const result: OrderedDay[] = [];
  const start = parseISODate(weekStart);
  for (let i = 0; i < 7; i++) {
    const dow = (firstDayOfWeek + i) % 7;
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    result.push({
      dayOfWeek: dow,
      tasks: byDow.get(dow) ?? [],
      dayDate: localISODate(d),
    });
  }
  return result;
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
