import { createContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
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
import {
  useCreateTimebox,
  useDeleteTimebox,
  useUpdateTimebox,
} from '@/hooks/useDaily';
import type { Timebox } from '@/hooks/useDaily';
import { detectConflict, snapToIncrement } from '@/lib/timeline';
import { isPastDate } from '@/lib/time';
import { usePoolCollapsed } from '@/hooks/usePoolCollapsed';

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

/**
 * Per-frame drag offset. Computed from raw `pointermove` + `scroll` events on
 * the timeline-wrap rather than dnd-kit's `transform` value, because dnd-kit's
 * source-element transform path drifts when the draggable lives inside a
 * scrollable container with non-zero `scrollTop` (#2). The block consumes this
 * via context and writes it into its inline `transform`.
 */
export const DragOffsetContext = createContext<{ activeId: string | null; dy: number }>({
  activeId: null,
  dy: 0,
});

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
  const [dy, setDy] = useState(0);
  const [notesId, setNotesId] = useState<string | null>(null);
  const [pendingPastConfirm, setPendingPastConfirm] = useState<
    | null
    | {
        title: string;
        action: () => void;
      }
  >(null);
  const {
    collapsed: inboxCollapsed,
    setCollapsed: setInboxCollapsed,
    toggle: toggleInboxCollapsed,
  } = usePoolCollapsed('daily', true);

  // Refs that hold the raw drag state. We need synchronous access in
  // handleMove (dnd-kit's onDragMove fires from the same pointermove that we
  // listen to, and reading via state would lag a frame).
  const initialPointerY = useRef(0);
  const initialPointerX = useRef(0);
  const initialScrollTop = useRef(0);
  const currentPointerY = useRef(0);
  const dyRef = useRef(0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
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

    const ae = e.activatorEvent as PointerEvent | MouseEvent;
    const wrap = getTimelineWrap();
    initialPointerY.current = ae.clientY;
    initialPointerX.current = ae.clientX;
    initialScrollTop.current = wrap?.scrollTop ?? 0;
    currentPointerY.current = ae.clientY;
    dyRef.current = 0;
    setDy(0);

    setActive({ kind: data.kind as ActiveDrag['kind'], id: block.id, block });

    // On phone, the inbox lives as a collapsed top strip. When the user starts
    // dragging a timeline block back toward the inbox, expand it so they can see
    // where they're dropping. Defer one frame so dnd-kit's pointer activation
    // lands first.
    if (data.kind === 'timebox-move') {
      setTimeout(() => setInboxCollapsed(false), 0);
    }
  };

  // Track raw pointer + scroll while a drag is in progress. dnd-kit's
  // `transform` drifts inside scrolled overflow containers, so we ignore it
  // and recompute dy ourselves: cursor delta + scroll delta.
  useEffect(() => {
    if (!active) return;
    const wrap = getTimelineWrap();

    const recompute = () => {
      const scrollDelta = (wrap?.scrollTop ?? 0) - initialScrollTop.current;
      const pointerDelta = currentPointerY.current - initialPointerY.current;
      const next = pointerDelta + scrollDelta;
      dyRef.current = next;
      setDy(next);
    };

    const onPointerMove = (e: PointerEvent) => {
      currentPointerY.current = e.clientY;
      recompute();
    };
    const onScroll = () => recompute();

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    wrap?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      wrap?.removeEventListener('scroll', onScroll);
    };
  }, [active]);

  const handleMove = (e: DragMoveEvent) => {
    if (!active) return;
    const dyNow = dyRef.current;

    if (active.kind === 'task-from-inbox') {
      // Inbox cards live in a different scroll container, so dnd-kit's
      // translated rect (which carries the card's "would-be top" with click
      // offset already baked in) is still the right value to convert.
      // gridTop is read live so it accounts for the timeline-wrap's scroll.
      const cardTop = e.active.rect.current.translated?.top ?? 0;
      const pointerYInGrid = cardTop - getTimelineGridTop();
      const target = snapToIncrement(
        dayStartMin + (pointerYInGrid / hourPx) * 60,
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
        baseStart + (dyNow / hourPx) * 60,
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
      const target = snapToIncrement(baseEnd + (dyNow / hourPx) * 60, increment);
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
      const target = snapToIncrement(baseStart + (dyNow / hourPx) * 60, increment);
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
    setDy(0);
    dyRef.current = 0;
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

  return (
    <div className="tb-day layout-left">
      <DragOffsetContext.Provider value={{ activeId: active?.id ?? null, dy }}>
        <DndContext
          sensors={sensors}
          onDragStart={handleStart}
          onDragMove={handleMove}
          onDragEnd={handleEnd}
          onDragCancel={() => {
            setActive(null);
            setGhost(null);
            setDy(0);
            dyRef.current = 0;
          }}
        >
          <Inbox
            tasks={inbox}
            onCreate={onCreate}
            onOpen={setNotesId}
            collapsed={inboxCollapsed}
            onToggleCollapsed={toggleInboxCollapsed}
          />
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
        </DndContext>
      </DragOffsetContext.Provider>
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

function getTimelineWrap(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector('.tb-timeline-wrap') as HTMLElement | null;
}

function getTimelineGridTop(): number {
  if (typeof document === 'undefined') return 0;
  const el = document.querySelector('.tb-timeline-grid') as HTMLElement | null;
  if (!el) return 0;
  return el.getBoundingClientRect().top;
}
