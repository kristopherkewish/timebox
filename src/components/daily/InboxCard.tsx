import { useDraggable } from '@dnd-kit/core';
import { Icon } from '@/components/icons/Icon';
import { fmtDur } from '@/lib/time';
import type { Timebox } from '@/hooks/useDaily';

interface Props {
  task: Timebox;
  onOpen: (id: string) => void;
}

export function InboxCard({ task, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { kind: 'task-from-inbox', task },
  });

  return (
    <div
      ref={setNodeRef}
      className={`tb-inbox-card ${isDragging ? 'is-source-while-dragging' : ''}`}
      style={{ touchAction: 'none' }}
      onDoubleClick={() => onOpen(task.id)}
      {...attributes}
      {...listeners}
    >
      <div className="grip">
        <Icon name="grip" size={14} />
      </div>
      <div className="tb-inbox-card-title">{task.title}</div>
      <div className="tb-inbox-card-meta">
        <span className="tb-inbox-card-dur">{fmtDur(task.durationMin)}</span>
        {task.notes && (
          <>
            <span className="tb-inbox-card-dot" />
            <span>{task.notes}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function InboxCardDragOverlay({ task }: { task: Timebox }) {
  return (
    <div className="tb-inbox-card">
      <div className="grip">
        <Icon name="grip" size={14} />
      </div>
      <div className="tb-inbox-card-title">{task.title}</div>
      <div className="tb-inbox-card-meta">
        <span className="tb-inbox-card-dur">{fmtDur(task.durationMin)}</span>
        {task.notes && (
          <>
            <span className="tb-inbox-card-dot" />
            <span>{task.notes}</span>
          </>
        )}
      </div>
    </div>
  );
}
