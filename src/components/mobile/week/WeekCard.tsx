import { useDroppable } from '@dnd-kit/core';

import type { WeeklyTask } from '@/hooks/useWeekly';

interface Props {
  dayOfWeek: number; // 0 = Sun .. 6 = Sat
  dayNum: number; // calendar day-of-month
  dowLabel: string; // e.g. "Mon"
  isToday: boolean;
  isWeekend: boolean;
  tasks: WeeklyTask[];
}

export function WeekCard({
  dayOfWeek,
  dayNum,
  dowLabel,
  isToday,
  isWeekend,
  tasks,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `week-day-${dayOfWeek}`,
    data: { kind: 'week-day', dayOfWeek },
  });

  return (
    <div
      ref={setNodeRef}
      className={`tbm-week-card${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}${isOver ? ' over' : ''}`}
    >
      <div className="tbm-week-card-head">
        <div className="l">
          <div className="num">{dayNum}</div>
          <div className="dow">{dowLabel}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </div>
      </div>
      <div className="tbm-week-card-body">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`tbm-week-task${t.kind && t.kind !== 'default' ? ` ${t.kind}` : ''}`}
          >
            {t.title}
            {t.notes && <div className="note">{t.notes}</div>}
          </div>
        ))}
        {tasks.length === 0 && <div className="tbm-week-card-empty">Drop a task</div>}
      </div>
    </div>
  );
}
