import type { KeyboardEvent } from 'react';
import { useDraggable } from '@dnd-kit/core';

import { fmtDur } from '@/lib/time';

export interface PoolTask {
  id: string;
  title: string;
  durationMin?: number;
  note?: string | null;
  kind?: 'default' | 'muted' | 'success' | 'info';
}

interface Props {
  task: PoolTask;
  fresh?: boolean;
  onTap?: (id: string) => void;
  /**
   * Wires the card to dnd-kit when set. The string is the `kind` attached to
   * the drag data (e.g. `pool-card-day`); the receiving DndContext on the page
   * branches on it.
   */
  dragKind?: string;
}

export function PoolCard({ task, fresh, onTap, dragKind }: Props) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `pool-${task.id}`,
    data: { kind: dragKind ?? 'pool-card', task },
    disabled: !dragKind,
  });

  const kindClass = task.kind && task.kind !== 'default' ? ` ${task.kind}` : '';
  const stateClass = `${fresh ? ' fresh' : ''}${isDragging ? ' dragging' : ''}`;

  const handleTap = onTap ? () => onTap(task.id) : undefined;
  const handleKey = onTap
    ? (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(task.id);
        }
      }
    : undefined;

  // When the card is dnd-enabled, dnd-kit owns role/tabIndex (it sets them
  // to support keyboard drag activation). When it isn't, we add our own so
  // the card is still keyboard-focusable for tap-to-open.
  const a11y = dragKind
    ? attributes
    : {
        role: onTap ? ('button' as const) : undefined,
        tabIndex: onTap ? 0 : undefined,
      };

  return (
    <div
      ref={setNodeRef}
      className={`tbm-pool-card${kindClass}${stateClass}`}
      {...a11y}
      {...listeners}
      onClick={handleTap}
      onKeyDown={handleKey}
    >
      <div className="tbm-pool-card-title">{task.title}</div>
      <div className="tbm-pool-card-meta">
        {fresh && <span className="badge">New</span>}
        {task.durationMin != null && <span className="dur">{fmtDur(task.durationMin)}</span>}
        {task.durationMin != null && task.note && <span className="dot" />}
        {task.note && (
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.note}
          </span>
        )}
      </div>
    </div>
  );
}
