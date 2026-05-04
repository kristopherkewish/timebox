import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Icon } from '@/components/icons/Icon';
import {
  useCreateMonthlyTask,
  useDeleteMonthlyTask,
  useUpdateMonthlyTask,
} from '@/hooks/useMonthly';
import type { MonthlyTask } from '@/hooks/useMonthly';
import type { MonthWeek } from '@/lib/month';

interface Props {
  monthStart: string;
  pool: MonthlyTask[];
  byWeek: Record<number, MonthlyTask[] | undefined>;
  weeks: MonthWeek[];
  currentWeekIndex: number | null;
}

export function MonthlyView({ monthStart, pool, byWeek, weeks, currentWeekIndex }: Props) {
  const create = useCreateMonthlyTask(monthStart);
  const update = useUpdateMonthlyTask(monthStart);
  const del = useDeleteMonthlyTask(monthStart);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const handleEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    if (overId === 'monthly-pool') {
      update.mutate({ id, patch: { weekIndex: null } });
      return;
    }
    if (typeof overId === 'string' && overId.startsWith('monthly-week-')) {
      const idx = Number(overId.slice('monthly-week-'.length));
      if (Number.isFinite(idx)) {
        update.mutate({ id, patch: { weekIndex: idx } });
      }
    }
  };

  const submit = () => {
    const t = title.trim();
    if (!t) {
      setAdding(false);
      setTitle('');
      return;
    }
    create.mutate({ title: t });
    setTitle('');
    setAdding(false);
  };

  const editingTask = editingId
    ? [...pool, ...Object.values(byWeek).flatMap((a) => a ?? [])].find(
        (t) => t.id === editingId,
      )
    : undefined;

  return (
    <div className="tb-month">
      <DndContext sensors={sensors} onDragEnd={handleEnd}>
        <PoolDroppable tasks={pool} onOpen={(id) => setEditingId(id)}>
          {adding ? (
            <input
              autoFocus
              className="tb-input"
              style={{ margin: '0 14px 14px' }}
              placeholder="Pool task title…"
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
              <span>Add to monthly pool…</span>
            </button>
          )}
        </PoolDroppable>
        <div className="tb-month-list">
          {weeks.map((wk) => (
            <WeekRow
              key={wk.index}
              week={wk}
              tasks={byWeek[wk.index] ?? []}
              isCurrent={currentWeekIndex === wk.index}
              onOpen={(id) => setEditingId(id)}
            />
          ))}
        </div>
      </DndContext>
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            update.mutate({ id: editingTask.id, patch });
            setEditingId(null);
          }}
          onDelete={() => {
            del.mutate(editingTask.id);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function PoolDroppable({
  tasks,
  onOpen,
  children,
}: {
  tasks: MonthlyTask[];
  onOpen: (id: string) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'monthly-pool' });
  return (
    <aside
      ref={setNodeRef}
      className="tb-inbox"
      style={isOver ? { background: 'var(--surface-2)' } : undefined}
    >
      <div className="tb-inbox-header">
        <div className="tb-inbox-title">Monthly pool</div>
        <div className="tb-inbox-count">{tasks.length}</div>
      </div>
      <div className="tb-inbox-list">
        {tasks.map((t) => (
          <PoolCard key={t.id} task={t} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <div className="empty-message" style={{ padding: '8px 4px' }}>
            Drop tasks here to keep them at the month level without a week.
          </div>
        )}
      </div>
      {children}
    </aside>
  );
}

function PoolCard({ task, onOpen }: { task: MonthlyTask; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { kind: 'monthly-task', task },
  });
  return (
    <div
      ref={setNodeRef}
      className={`tb-inbox-card ${isDragging ? 'is-source-while-dragging' : ''}`}
      style={{ touchAction: 'none' }}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onOpen(task.id)}
    >
      <div className="grip">
        <Icon name="grip" size={14} />
      </div>
      <div className="tb-inbox-card-title">{task.title}</div>
      {task.notes && <div className="tb-inbox-card-meta">{task.notes}</div>}
    </div>
  );
}

function WeekRow({
  week,
  tasks,
  isCurrent,
  onOpen,
}: {
  week: MonthWeek;
  tasks: MonthlyTask[];
  isCurrent: boolean;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `monthly-week-${week.index}`,
    data: { kind: 'monthly-week', weekIndex: week.index },
  });
  return (
    <div className={`tb-month-week ${isCurrent ? 'current' : ''}`}>
      <div className="tb-month-week-meta">
        <div className="tb-month-week-eyebrow">{isCurrent ? 'This week' : 'Week'}</div>
        <div className="tb-month-week-num">{week.label}</div>
        <div className="tb-month-week-range">{week.range}</div>
        <div className="tb-month-week-count">
          {tasks.length === 0
            ? 'Nothing planned'
            : tasks.length === 1
              ? '1 task'
              : `${tasks.length} tasks`}
        </div>
      </div>
      <div
        className="tb-month-week-body"
        ref={setNodeRef}
        style={isOver ? { background: 'var(--accent-soft)', borderRadius: 8 } : undefined}
      >
        {tasks.map((t) => (
          <WeekCard key={t.id} task={t} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <div className="tb-month-week-empty">
            <Icon name="plus" size={12} />
            <span>Drag a task from the pool, or add one here</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WeekCard({ task, onOpen }: { task: MonthlyTask; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { kind: 'monthly-task', task },
  });
  return (
    <div
      ref={setNodeRef}
      className={`tb-month-week-card ${task.kind !== 'default' ? task.kind : ''} ${isDragging ? 'is-source-while-dragging' : ''}`}
      style={{ touchAction: 'none' }}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onOpen(task.id)}
    >
      <div>{task.title}</div>
      {task.notes && <div className="tb-month-week-card-note">{task.notes}</div>}
    </div>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: MonthlyTask;
  onClose: () => void;
  onSave: (patch: Partial<MonthlyTask>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [kind, setKind] = useState<MonthlyTask['kind']>(task.kind);
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ title: title.trim() || task.title, notes: notes.trim() || null, kind });
        }}
      >
        <h2 className="modal-title">Edit monthly task</h2>
        <label className="auth-field">
          <span>Title</span>
          <input
            className="tb-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </label>
        <label className="auth-field">
          <span>Note</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            style={{ minHeight: 80 }}
          />
        </label>
        <label className="auth-field">
          <span>Style</span>
          <select
            className="settings-select"
            value={kind}
            onChange={(e) => setKind(e.target.value as MonthlyTask['kind'])}
          >
            <option value="default">Default (accent)</option>
            <option value="muted">Muted</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
          </select>
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
