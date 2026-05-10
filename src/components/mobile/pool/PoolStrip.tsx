import { useState } from 'react';

import { PoolCard, type PoolTask } from './PoolCard';
import { PoolCompose } from './PoolCompose';

const SCOPE_LABELS = {
  day: 'Today · unscheduled',
  week: 'This week · unscheduled',
  month: 'This month · unscheduled',
} as const;

export type PoolScope = keyof typeof SCOPE_LABELS;

interface Props {
  scope: PoolScope;
  tasks: PoolTask[];
  onCreate: (title: string, durationMin: number) => void;
  onTap?: (id: string) => void;
  freshIds?: ReadonlySet<string>;
  /** When set, each pool card becomes a dnd-kit draggable with this `kind`. */
  dragKind?: string;
}

export function PoolStrip({ scope, tasks, onCreate, onTap, freshIds, dragKind }: Props) {
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(25);

  const reset = () => {
    setComposing(false);
    setTitle('');
    setDuration(25);
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      reset();
      return;
    }
    onCreate(trimmed, duration);
    reset();
  };

  return (
    <div className="tbm-pool">
      <div className="tbm-pool-head">
        <span className="tbm-pool-title">{SCOPE_LABELS[scope]}</span>
        <span className="tbm-pool-count">{tasks.length}</span>
      </div>
      <div className="tbm-pool-scroll">
        {composing ? (
          <PoolCompose
            title={title}
            duration={duration}
            onTitle={setTitle}
            onDuration={setDuration}
            onSubmit={submit}
            onCancel={reset}
          />
        ) : (
          <button
            type="button"
            className="tbm-pool-add"
            onClick={() => setComposing(true)}
          >
            <PlusIcon /> Add
          </button>
        )}
        {tasks.map((t) => (
          <PoolCard
            key={t.id}
            task={t}
            fresh={freshIds?.has(t.id) ?? false}
            onTap={onTap}
            dragKind={dragKind}
          />
        ))}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
