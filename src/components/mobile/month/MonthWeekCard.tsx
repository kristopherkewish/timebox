import { useDroppable } from '@dnd-kit/core';

import type { MonthlyTask } from '@/hooks/useMonthly';

interface Props {
  weekIndex: number;
  weekNumber: number;
  rangeLabel: string; // "May 4 – 10"
  isCurrent: boolean;
  tasks: MonthlyTask[];
}

export function MonthWeekCard({
  weekIndex,
  weekNumber,
  rangeLabel,
  isCurrent,
  tasks,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `month-week-${weekIndex}`,
    data: { kind: 'month-week', weekIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={`tbm-month-week${isCurrent ? ' current' : ''}${isOver ? ' over' : ''}`}
    >
      <div className="tbm-month-week-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="tbm-month-week-num">W{weekNumber}</span>
          <span className="tbm-month-week-range">{rangeLabel}</span>
        </div>
        <span className="tbm-month-week-count">
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>
      {tasks.length === 0 ? (
        <div className="tbm-week-card-empty">Drop a task</div>
      ) : (
        tasks.map((t) => (
          <div
            key={t.id}
            className={`tbm-month-task${t.kind && t.kind !== 'default' ? ` ${t.kind}` : ''}`}
          >
            {t.title}
            {t.notes && <div className="note">{t.notes}</div>}
          </div>
        ))
      )}
    </div>
  );
}
