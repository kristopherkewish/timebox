import { useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Icon } from '@/components/icons/Icon';
import {
  useCreateWeeklyTask,
  useUpdateWeeklyTask,
  useDeleteWeeklyTask,
} from '@/hooks/useWeekly';
import type { WeeklyTask } from '@/hooks/useWeekly';
import { parseISODate } from '@/lib/time';
import { usePoolCollapsed } from '@/hooks/usePoolCollapsed';

interface Props {
  weekStart: string;
  pool: WeeklyTask[];
  days: { dayOfWeek: number; tasks: WeeklyTask[] }[];
  firstDayOfWeek: number;
  todayIsoDate: string;
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeeklyView({ weekStart, pool, days, firstDayOfWeek, todayIsoDate }: Props) {
  const create = useCreateWeeklyTask(weekStart);
  const update = useUpdateWeeklyTask(weekStart);
  const del = useDeleteWeeklyTask(weekStart);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const {
    collapsed: poolCollapsed,
    setCollapsed: setPoolCollapsed,
    toggle: togglePoolCollapsed,
  } = usePoolCollapsed('weekly', true);

  const orderedDays = orderDaysFromWeek(weekStart, firstDayOfWeek, days);
  const today = todayIsoDate;

  const handleStart = (_e: DragStartEvent) => {
    // On phone, ensure the pool is visible while a drag is active so the user
    // can target it. On desktop the .is-expanded class has no visual effect.
    setTimeout(() => setPoolCollapsed(false), 0);
  };

  const handleEnd = (e: DragEndEvent) => {
    const id = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    if (overId === 'weekly-pool') {
      update.mutate({ id, patch: { dayOfWeek: null } });
      return;
    }
    if (typeof overId === 'string' && overId.startsWith('weekly-day-')) {
      const dow = Number(overId.slice('weekly-day-'.length));
      if (Number.isFinite(dow)) {
        update.mutate({ id, patch: { dayOfWeek: dow } });
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

  return (
    <div className="tb-week">
      <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd}>
        <PoolDroppable
          tasks={pool}
          onOpen={(id) => setEditingId(id)}
          collapsed={poolCollapsed}
          onToggleCollapsed={togglePoolCollapsed}
        >
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
              <span>Add to weekly pool…</span>
            </button>
          )}
        </PoolDroppable>
        <div className="tb-week-grid">
          {orderedDays.map(({ dayOfWeek, tasks, dayDate }) => (
            <DayColumn
              key={dayOfWeek}
              dayOfWeek={dayOfWeek}
              tasks={tasks}
              isToday={dayDate === today}
              isWeekend={dayOfWeek === 0 || dayOfWeek === 6}
              dayDate={dayDate}
              onOpen={(id) => setEditingId(id)}
            />
          ))}
        </div>
      </DndContext>
      {editingId && (
        <EditTaskModal
          task={[...pool, ...days.flatMap((d) => d.tasks)].find((t) => t.id === editingId)}
          onClose={() => setEditingId(null)}
          onSave={(patch) => {
            update.mutate({ id: editingId, patch });
            setEditingId(null);
          }}
          onDelete={() => {
            del.mutate(editingId);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

interface OrderedDay {
  dayOfWeek: number;
  tasks: WeeklyTask[];
  dayDate: string;
}

function orderDaysFromWeek(
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
      dayDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    });
  }
  return result;
}

function PoolDroppable({
  tasks,
  onOpen,
  collapsed,
  onToggleCollapsed,
  children,
}: {
  tasks: WeeklyTask[];
  onOpen: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'weekly-pool' });
  return (
    <aside
      ref={setNodeRef}
      className={`tb-inbox ${collapsed ? '' : 'is-expanded'}`}
      style={isOver ? { background: 'var(--surface-2)' } : undefined}
    >
      <div className="tb-inbox-header">
        <div className="tb-inbox-title">Weekly pool</div>
        <div className="tb-inbox-count">{tasks.length}</div>
        <button
          type="button"
          className="tb-inbox-toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand pool' : 'Collapse pool'}
          aria-expanded={!collapsed}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={14} />
        </button>
      </div>
      <div className="tb-inbox-list">
        {tasks.map((t) => (
          <PoolCard key={t.id} task={t} onOpen={onOpen} />
        ))}
        {tasks.length === 0 && (
          <div className="empty-message" style={{ padding: '8px 4px' }}>
            Drop tasks here to keep them at the week level without a day.
          </div>
        )}
      </div>
      {children}
    </aside>
  );
}

function PoolCard({ task, onOpen }: { task: WeeklyTask; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { kind: 'weekly-task', task },
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

function DayColumn({
  dayOfWeek,
  tasks,
  isToday,
  isWeekend,
  dayDate,
  onOpen,
}: {
  dayOfWeek: number;
  tasks: WeeklyTask[];
  isToday: boolean;
  isWeekend: boolean;
  dayDate: string;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `weekly-day-${dayOfWeek}`,
    data: { kind: 'weekly-day', dayOfWeek },
  });
  const dayNum = Number(dayDate.slice(-2));
  return (
    <div className="tb-day-col" ref={setNodeRef}>
      <div
        className={`tb-day-col-head ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
      >
        <div className="dow">{DOW_LABELS[dayOfWeek]}</div>
        <div className="num">{dayNum}</div>
      </div>
      <div
        className="tb-day-col-body"
        style={isOver ? { background: 'var(--accent-soft)' } : undefined}
      >
        {tasks.map((t) => (
          <DayCard key={t.id} task={t} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function DayCard({ task, onOpen }: { task: WeeklyTask; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { kind: 'weekly-task', task },
  });
  return (
    <div
      ref={setNodeRef}
      className={`tb-week-card ${task.kind !== 'default' ? task.kind : ''} ${isDragging ? 'is-source-while-dragging' : ''}`}
      style={{ touchAction: 'none' }}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onOpen(task.id)}
    >
      <div>{task.title}</div>
      {task.notes && <div className="tb-week-card-note">{task.notes}</div>}
    </div>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: WeeklyTask | undefined;
  onClose: () => void;
  onSave: (patch: Partial<WeeklyTask>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [kind, setKind] = useState<WeeklyTask['kind']>(task?.kind ?? 'default');
  if (!task) return null;
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
        <h2 className="modal-title">Edit weekly task</h2>
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
            onChange={(e) => setKind(e.target.value as WeeklyTask['kind'])}
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
