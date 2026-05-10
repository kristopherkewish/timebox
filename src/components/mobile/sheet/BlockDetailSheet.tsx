import { useEffect, useState } from 'react';

import { BottomSheet } from './BottomSheet';
import {
  useDaily,
  useDeleteTimebox,
  useUpdateTimebox,
  type Timebox,
} from '@/hooks/useDaily';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { useSheet } from '@/hooks/useSheet';
import { deriveState } from '@/lib/completion';
import { fmtDur, fmtTime } from '@/lib/time';

interface Props {
  taskId: string;
}

export function BlockDetailSheet({ taskId }: Props) {
  const date = useCurrentDate();
  const dailyQ = useDaily(date);
  const update = useUpdateTimebox(date);
  const del = useDeleteTimebox(date);
  const close = useSheet((s) => s.close);

  const all = [...(dailyQ.data?.inbox ?? []), ...(dailyQ.data?.timeline ?? [])];
  const task = all.find((b) => b.id === taskId);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [notes, setNotes] = useState(task?.notes ?? '');
  useEffect(() => {
    setNotes(task?.notes ?? '');
  }, [task?.id, task?.notes]);

  if (!task) return null;

  const state = deriveState(now, {
    date,
    startMin: task.startMin,
    durationMin: task.durationMin,
    completionState: task.completionState,
    completionOverridden: task.completionOverridden,
  });
  const isLive = state === 'in-progress';
  const isComplete = state === 'completed';

  const subtitle = renderSubtitle(task, state, date);

  const handleDone = () => {
    update.mutate(
      {
        id: task.id,
        patch: {
          completionState: isComplete ? 'incomplete' : 'completed',
          completionOverridden: 1,
        },
      },
      { onSuccess: close },
    );
  };

  const handleAdd5 = () => {
    update.mutate({
      id: task.id,
      patch: { durationMin: task.durationMin + 5 },
    });
  };

  const handleSendToInbox = () => {
    if (task.startMin == null) return;
    update.mutate(
      { id: task.id, patch: { startMin: null } },
      { onSuccess: close },
    );
  };

  const handleDelete = () => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete "${task.title}"?`)) {
      return;
    }
    del.mutate(task.id, { onSuccess: close });
  };

  const handleNotesBlur = () => {
    if ((notes ?? '') === (task.notes ?? '')) return;
    update.mutate({ id: task.id, patch: { notes: notes || null } });
  };

  const body = (
    <>
      {isLive && task.startMin != null && (
        <LiveTimer
          startMin={task.startMin}
          durationMin={task.durationMin}
          now={now}
          date={date}
          onAdd5={handleAdd5}
          onDone={handleDone}
        />
      )}

      <div>
        {task.startMin != null && (
          <div className="tbm-field">
            <span className="tbm-field-icon">
              <ClockIcon />
            </span>
            <span className="tbm-field-label">Time</span>
            <span className="tbm-field-value">
              {fmtTime(task.startMin)} – {fmtTime(task.startMin + task.durationMin)} ·{' '}
              {fmtDur(task.durationMin)}
            </span>
          </div>
        )}

        <div className="tbm-field" style={{ alignItems: 'flex-start' }}>
          <span className="tbm-field-icon" style={{ marginTop: 2 }}>
            <NoteIcon />
          </span>
          <textarea
            className="tbm-detail-notes"
            value={notes ?? ''}
            placeholder="Add notes…"
            rows={3}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
        }}
      >
        <button
          type="button"
          className="tbm-text-link danger"
          onClick={handleDelete}
        >
          Delete block
        </button>
        {task.startMin != null && (
          <button
            type="button"
            className="tbm-text-link"
            onClick={handleSendToInbox}
          >
            Send to pool
          </button>
        )}
      </div>
    </>
  );

  const cta = (
    <button
      type="button"
      className="tbm-sheet-cta"
      disabled={update.isPending}
      onClick={handleDone}
      style={
        isComplete
          ? { background: 'var(--ink)', color: 'var(--bg)' }
          : undefined
      }
    >
      {isComplete ? 'Mark incomplete' : 'Mark complete'}
    </button>
  );

  return <BottomSheet title={task.title} subtitle={subtitle} body={body} cta={cta} />;
}

function renderSubtitle(task: Timebox, state: string, _date: string) {
  if (task.startMin == null) {
    return <>In pool · {fmtDur(task.durationMin)}</>;
  }
  if (state === 'in-progress') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: 'var(--accent)',
            boxShadow: '0 0 0 3px color-mix(in oklab, var(--accent) 30%, transparent)',
          }}
        />
        In progress · {fmtTime(task.startMin)} – {fmtTime(task.startMin + task.durationMin)}
      </span>
    );
  }
  return (
    <>
      {fmtTime(task.startMin)} – {fmtTime(task.startMin + task.durationMin)} ·{' '}
      {fmtDur(task.durationMin)}
    </>
  );
}

function LiveTimer({
  startMin,
  durationMin,
  now,
  date,
  onAdd5,
  onDone,
}: {
  startMin: number;
  durationMin: number;
  now: number;
  date: string;
  onAdd5: () => void;
  onDone: () => void;
}) {
  const [y, m, d] = date.split('-').map(Number);
  const startMs = new Date(y, m - 1, d, Math.floor(startMin / 60), startMin % 60).getTime();
  const elapsedMs = Math.max(0, now - startMs);
  const totalMs = durationMin * 60_000;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingSec = Math.floor(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const pct = Math.min(100, (elapsedMs / totalMs) * 100);

  return (
    <div className="tbm-now-card" style={{ margin: 0 }}>
      <div className="tbm-now-card-time">
        <span className="big">
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </span>
        <span className="small">remaining of {fmtDur(durationMin)}</span>
      </div>
      <div className="tbm-progress">
        <div className="tbm-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="tbm-now-card-actions">
        <button type="button" className="tbm-now-card-btn" onClick={onAdd5}>
          <PlusIcon /> 5 min
        </button>
        <button type="button" className="tbm-now-card-btn primary" onClick={onDone}>
          <DoneIcon /> Done
        </button>
        <span />
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h11l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16 4v4h4M8 13h8M8 17h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function DoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l5 5 9-10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
