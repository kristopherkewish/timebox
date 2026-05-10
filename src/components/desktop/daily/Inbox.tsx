import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Icon } from '@/components/desktop/icons/Icon';
import { fmtDur } from '@/lib/time';
import { InboxCard } from './InboxCard';
import type { Timebox } from '@/hooks/useDaily';

interface Props {
  tasks: Timebox[];
  onCreate: (title: string, durationMin: number) => void;
  onOpen: (id: string) => void;
}

const DEFAULT_DURATION = 30;

export function Inbox({ tasks, onCreate, onOpen }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const total = tasks.reduce((s, t) => s + t.durationMin, 0);

  const { setNodeRef, isOver } = useDroppable({
    id: 'inbox-drop',
    data: { kind: 'inbox-drop' },
  });

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      setTitle('');
      return;
    }
    onCreate(trimmed, DEFAULT_DURATION);
    setTitle('');
    setAdding(false);
  };

  return (
    <aside
      ref={setNodeRef}
      className="tb-inbox"
      style={isOver ? { background: 'var(--surface-2)' } : undefined}
    >
      <div className="tb-inbox-header">
        <div className="tb-inbox-title">Unscheduled</div>
        <div className="tb-inbox-count">
          {tasks.length} · {fmtDur(total)}
        </div>
      </div>
      <div className="tb-inbox-list">
        {tasks.map((t) => (
          <InboxCard key={t.id} task={t} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && !adding && (
          <div className="empty-message" style={{ padding: '8px 4px' }}>
            Nothing waiting. Add a task below or drop one back from the timeline.
          </div>
        )}
      </div>
      {adding ? (
        <input
          autoFocus
          className="tb-input"
          style={{ margin: '0 14px 14px' }}
          placeholder="Task title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') {
              setTitle('');
              setAdding(false);
            }
          }}
        />
      ) : (
        <button type="button" className="tb-inbox-add" onClick={() => setAdding(true)}>
          <Icon name="plus" size={12} />
          <span>Add a task…</span>
        </button>
      )}
    </aside>
  );
}
