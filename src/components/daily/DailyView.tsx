import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from '@dnd-kit/core';

import { Inbox } from './Inbox';
import { Timeline } from './Timeline';
import { NotesModal } from './NotesModal';
import { BlockDragOverlay } from './Block';
import { InboxCardDragOverlay } from './InboxCard';
import {
  useCreateTimebox,
  useDeleteTimebox,
  useUpdateTimebox,
} from '@/hooks/useDaily';
import type { Timebox } from '@/hooks/useDaily';
import { detectConflict, snapToIncrement } from '@/lib/timeline';
import { deriveState } from '@/lib/completion';
import { isPastDate } from '@/lib/time';

interface Props {
  date: string;
  inbox: Timebox[];
  timeline: Timebox[];
  hourPx: number;
  dayStartMin: number;
  dayEndMin: number;
  increment: number;
  allowOverlap: boolean;
}

interface ActiveDrag {
  kind: 'task-from-inbox' | 'timebox-move' | 'timebox-resize-top' | 'timebox-resize-bot';
  id: string;
  block: Timebox;
}

interface Ghost {
  startMin: number;
  durationMin: number;
  conflict: boolean;
}

export function DailyView({
  date,
  inbox,
  timeline,
  hourPx,
  dayStartMin,
  dayEndMin,
  increment,
  allowOverlap,
}: Props) {
  const create = useCreateTimebox(date);
  const update = useUpdateTimebox(date);
  const del = useDeleteTimebox(date);

  const [active, setActive] = useState<ActiveDrag | null>(null);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [notesId, setNotesId] = useState<string | null>(null);
  const [pendingPastConfirm, setPendingPastConfirm] = useState<
    | null
    | {
        title: string;
        action: () => void;
      }
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const blocks = useMemo(() => [...inbox, ...timeline], [inbox, timeline]);
  const allTimeboxes = useMemo(
    () => Object.fromEntries(blocks.map((b) => [b.id, b])) as Record<string, Timebox>,
    [blocks],
  );

  const isPastDay = isPastDate(date);

  const handleStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { kind?: string; task?: Timebox; block?: Timebox } | undefined;
    if (!data?.kind) return;
    const block = (data.task ?? data.block) as Timebox | undefined;
    if (!block) return;
    setActive({ kind: data.kind as ActiveDrag['kind'], id: block.id, block });
  };

  const handleMove = (e: DragMoveEvent) => {
    if (!active) return;
    const dy = e.delta?.y ?? 0;

    if (active.kind === 'task-from-inbox') {
      // Compute target start from the original block start (irrelevant for inbox)
      // by reading pointer Y inside timeline. We approximate using delta from
      // pointer's clientY relative to grid: dnd-kit gives us active rect.
      const pointerY = (e.active.rect.current.translated?.top ?? 0) - getTimelineGridTop();
      const target = snapToIncrement(
        dayStartMin + (pointerY / hourPx) * 60,
        increment,
      );
      const start = clamp(target, dayStartMin, dayEndMin - active.block.durationMin);
      const conflict =
        !allowOverlap && detectConflict(timeline, start, active.block.durationMin, active.block.id);
      setGhost({ startMin: start, durationMin: active.block.durationMin, conflict });
      return;
    }

    if (active.kind === 'timebox-move') {
      const baseStart = active.block.startMin ?? dayStartMin;
      const target = snapToIncrement(
        baseStart + (dy / hourPx) * 60,
        increment,
      );
      const start = clamp(target, dayStartMin, dayEndMin - active.block.durationMin);
      const conflict =
        !allowOverlap && detectConflict(timeline, start, active.block.durationMin, active.block.id);
      setGhost({ startMin: start, durationMin: active.block.durationMin, conflict });
      return;
    }

    if (active.kind === 'timebox-resize-bot') {
      const baseStart = active.block.startMin ?? dayStartMin;
      const baseEnd = baseStart + active.block.durationMin;
      const target = snapToIncrement(baseEnd + (dy / hourPx) * 60, increment);
      const newEnd = clamp(target, baseStart + increment, dayEndMin);
      const newDur = newEnd - baseStart;
      const conflict =
        !allowOverlap && detectConflict(timeline, baseStart, newDur, active.block.id);
      setGhost({ startMin: baseStart, durationMin: newDur, conflict });
      return;
    }

    if (active.kind === 'timebox-resize-top') {
      const baseStart = active.block.startMin ?? dayStartMin;
      const baseEnd = baseStart + active.block.durationMin;
      const target = snapToIncrement(baseStart + (dy / hourPx) * 60, increment);
      const newStart = clamp(target, dayStartMin, baseEnd - increment);
      const newDur = baseEnd - newStart;
      const conflict =
        !allowOverlap && detectConflict(timeline, newStart, newDur, active.block.id);
      setGhost({ startMin: newStart, durationMin: newDur, conflict });
    }
  };

  const handleEnd = (e: DragEndEvent) => {
    const cur = active;
    setActive(null);
    setGhost(null);
    if (!cur) return;

    const overId = e.over?.id;
    const block = allTimeboxes[cur.id] ?? cur.block;

    // Drop off both droppables → return to inbox if it was on the timeline.
    if (!overId) {
      if (cur.kind === 'timebox-move' && block.startMin != null) {
        confirmIfPast(block.title, () =>
          update.mutate({ id: cur.id, patch: { startMin: null } }),
        );
      }
      return;
    }

    if (overId === 'inbox-drop') {
      if (cur.kind === 'task-from-inbox') return; // already inbox
      if (cur.kind === 'timebox-move') {
        confirmIfPast(block.title, () =>
          update.mutate({ id: cur.id, patch: { startMin: null } }),
        );
      }
      return;
    }

    if (overId === 'timeline-drop') {
      if (!ghost && (cur.kind === 'task-from-inbox' || cur.kind === 'timebox-move')) return;
      if (cur.kind === 'task-from-inbox') {
        if (!ghost) return;
        if (ghost.conflict) return;
        confirmIfPast(block.title, () =>
          update.mutate({ id: cur.id, patch: { startMin: ghost.startMin } }),
        );
        return;
      }
      if (cur.kind === 'timebox-move') {
        if (!ghost) return;
        if (ghost.conflict) return;
        if (ghost.startMin === block.startMin) return;
        confirmIfPast(block.title, () =>
          update.mutate({ id: cur.id, patch: { startMin: ghost.startMin } }),
        );
        return;
      }
      if (cur.kind === 'timebox-resize-top' || cur.kind === 'timebox-resize-bot') {
        if (!ghost) return;
        if (ghost.conflict) return;
        const patch: Partial<Timebox> = { durationMin: ghost.durationMin };
        if (cur.kind === 'timebox-resize-top') patch.startMin = ghost.startMin;
        confirmIfPast(block.title, () => update.mutate({ id: cur.id, patch }));
      }
    }
  };

  function confirmIfPast(title: string, action: () => void) {
    if (isPastDay) {
      setPendingPastConfirm({ title, action });
    } else {
      action();
    }
  }

  const onCreate = (title: string, durationMin: number) => {
    confirmIfPast(title, () => create.mutate({ title, durationMin }));
  };

  const onToggleComplete = (id: string) => {
    const b = allTimeboxes[id];
    if (!b) return;
    const completed = b.completionState === 'completed';
    confirmIfPast(b.title, () =>
      update.mutate({
        id,
        patch: {
          completionState: completed ? 'incomplete' : 'completed',
          completionOverridden: 1,
        },
      }),
    );
  };

  const onDelete = (id: string) => {
    const b = allTimeboxes[id];
    if (!b) return;
    confirmIfPast(b.title, () => del.mutate(id));
  };

  const onKeyboardNudge = (id: string, deltaMin: number) => {
    const b = allTimeboxes[id];
    if (!b || b.startMin == null) return;
    const next = clamp(
      b.startMin + deltaMin * increment,
      dayStartMin,
      dayEndMin - b.durationMin,
    );
    if (next === b.startMin) return;
    if (!allowOverlap && detectConflict(timeline, next, b.durationMin, b.id)) return;
    confirmIfPast(b.title, () => update.mutate({ id, patch: { startMin: next } }));
  };
  const onKeyboardResize = (id: string, deltaMin: number) => {
    const b = allTimeboxes[id];
    if (!b || b.startMin == null) return;
    const newDur = Math.max(increment, b.durationMin + deltaMin * increment);
    if (b.startMin + newDur > dayEndMin) return;
    if (!allowOverlap && detectConflict(timeline, b.startMin, newDur, b.id)) return;
    confirmIfPast(b.title, () => update.mutate({ id, patch: { durationMin: newDur } }));
  };

  const activeState = active && active.kind === 'timebox-move'
    ? deriveState(Date.now(), {
        date,
        startMin: active.block.startMin,
        durationMin: active.block.durationMin,
        completionState: active.block.completionState,
        completionOverridden: active.block.completionOverridden,
      })
    : 'upcoming';

  return (
    <div className="tb-day layout-left">
      <DndContext
        sensors={sensors}
        onDragStart={handleStart}
        onDragMove={handleMove}
        onDragEnd={handleEnd}
        onDragCancel={() => {
          setActive(null);
          setGhost(null);
        }}
      >
        <Inbox tasks={inbox} onCreate={onCreate} onOpen={setNotesId} />
        <Timeline
          date={date}
          timeline={timeline}
          hourPx={hourPx}
          dayStartMin={dayStartMin}
          dayEndMin={dayEndMin}
          increment={increment}
          showStats={true}
          ghost={ghost}
          onOpen={setNotesId}
          onToggleComplete={onToggleComplete}
          onKeyboardNudge={onKeyboardNudge}
          onKeyboardResize={onKeyboardResize}
        />
        <DragOverlay dropAnimation={null}>
          {active?.kind === 'timebox-move' ? (
            <BlockDragOverlay block={active.block} state={activeState} hourPx={hourPx} />
          ) : active?.kind === 'task-from-inbox' ? (
            <InboxCardDragOverlay task={active.block} />
          ) : null}
        </DragOverlay>
      </DndContext>
      {notesId && (
        <NotesModal
          block={allTimeboxes[notesId]}
          onClose={() => setNotesId(null)}
          onSave={(patch) => {
            confirmIfPast(allTimeboxes[notesId]?.title ?? 'task', () =>
              update.mutate({ id: notesId, patch }),
            );
            setNotesId(null);
          }}
          onDelete={() => {
            onDelete(notesId);
            setNotesId(null);
          }}
        />
      )}
      {pendingPastConfirm && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setPendingPastConfirm(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Edit a past day?</h2>
            <p className="modal-sub">
              "{pendingPastConfirm.title}" is on a day that has already passed. Editing changes
              the historical record.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="tb-btn"
                onClick={() => setPendingPastConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tb-btn primary"
                onClick={() => {
                  pendingPastConfirm.action();
                  setPendingPastConfirm(null);
                }}
              >
                Make the change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function getTimelineGridTop(): number {
  if (typeof document === 'undefined') return 0;
  const el = document.querySelector('.tb-timeline-grid') as HTMLElement | null;
  if (!el) return 0;
  return el.getBoundingClientRect().top;
}
