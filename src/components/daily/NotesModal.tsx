import { useEffect, useState } from 'react';
import { fmtDur, fmtTime } from '@/lib/time';
import type { Timebox } from '@/hooks/useDaily';

interface Props {
  block: Timebox | undefined;
  onClose: () => void;
  onSave: (patch: Partial<Timebox>) => void;
  onDelete: () => void;
}

const DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60, 75, 90, 120, 150, 180, 240];

export function NotesModal({ block, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(block?.title ?? '');
  const [duration, setDuration] = useState(block?.durationMin ?? 30);
  const [notes, setNotes] = useState(block?.notes ?? '');

  useEffect(() => {
    setTitle(block?.title ?? '');
    setDuration(block?.durationMin ?? 30);
    setNotes(block?.notes ?? '');
  }, [block]);

  if (!block) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim() || block.title,
      durationMin: duration,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="modal-card notes-flyout"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="notes-flyout-title">
          <input
            className="tb-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%' }}
          />
        </h2>
        <div className="notes-meta">
          {block.startMin != null
            ? `${fmtTime(block.startMin)} – ${fmtTime(block.startMin + duration)} · ${fmtDur(duration)}`
            : `Unscheduled · ${fmtDur(duration)}`}
        </div>
        <label className="auth-field">
          <span>Duration</span>
          <select
            className="settings-select"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {fmtDur(d)}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-field">
          <span>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything to remember about this block…"
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="tb-btn danger" onClick={onDelete}>
            Delete
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="tb-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="tb-btn primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
