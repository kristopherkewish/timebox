import { useContext } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Icon } from '@/components/icons/Icon';
import { fmtDur, fmtTime } from '@/lib/time';
import { minutesToPx } from '@/lib/timeline';
import type { BlockState } from '@/lib/completion';
import type { Timebox } from '@/hooks/useDaily';
import { DragOffsetContext } from './DailyView';

interface Props {
  block: Timebox;
  state: BlockState;
  hourPx: number;
  dayStart: number; // minutes
  conflict?: boolean;
  column?: number;
  cols?: number;
  onOpen: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onKeyboardNudge?: (id: string, deltaMin: number) => void;
  onKeyboardResize?: (id: string, deltaMin: number) => void;
}

// Matches `.tb-block { left: 6px; right: 12px }` in app.css. Kept in sync so
// column-divided blocks use the same outer gutters as a single full-width block.
const LEFT_PAD_PX = 6;
const RIGHT_PAD_PX = 12;
const COLUMN_GAP_PX = 4;

export function Block({
  block,
  state,
  hourPx,
  dayStart,
  conflict,
  column = 0,
  cols = 1,
  onOpen,
  onToggleComplete,
  onKeyboardNudge,
  onKeyboardResize,
}: Props) {
  const top = minutesToPx(block.startMin ?? dayStart, dayStart, hourPx);
  const height = (block.durationMin / 60) * hourPx;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    data: { kind: 'timebox-move', block },
  });

  const moveResize = useDraggable({
    id: `${block.id}__resize-bot`,
    data: { kind: 'timebox-resize-bot', block },
  });
  const topResize = useDraggable({
    id: `${block.id}__resize-top`,
    data: { kind: 'timebox-resize-top', block },
  });

  // We deliberately ignore @dnd-kit's `transform` here. Inside a scrolled
  // overflow container the transform path drifts; DailyView tracks the raw
  // cursor + scroll delta and exposes it via DragOffsetContext (#2).
  const { activeId, dy } = useContext(DragOffsetContext);
  const isMoveDrag = isDragging && activeId === block.id;

  const cls = [
    'tb-block',
    state,
    isDragging ? 'dragging' : '',
    conflict ? 'conflict' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    top: `${top}px`,
    height: `${height}px`,
    transform: isMoveDrag ? `translate3d(0, ${dy}px, 0)` : undefined,
  };
  if (cols > 1) {
    const totalGutter = LEFT_PAD_PX + RIGHT_PAD_PX + COLUMN_GAP_PX * (cols - 1);
    style.left = `calc(${LEFT_PAD_PX}px + ${column} * ((100% - ${totalGutter}px) / ${cols} + ${COLUMN_GAP_PX}px))`;
    style.width = `calc((100% - ${totalGutter}px) / ${cols})`;
    style.right = 'auto';
  }

  const showMeta = height >= 36;
  const showNote = !isDragging && block.notes && height >= 70;

  const handleKey = (e: React.KeyboardEvent) => {
    if (!onKeyboardNudge && !onKeyboardResize) return;
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    const dir = e.key === 'ArrowUp' ? -1 : 1;
    if (e.shiftKey) {
      onKeyboardResize?.(block.id, dir);
      e.preventDefault();
    } else {
      onKeyboardNudge?.(block.id, dir);
      e.preventDefault();
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cls}
      style={style}
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`${block.title}, ${block.durationMin} minutes${block.startMin != null ? `, starts at ${block.startMin}` : ''}`}
      onKeyDown={handleKey}
      onDoubleClick={() => onOpen(block.id)}
    >
      <div
        ref={topResize.setNodeRef}
        className="tb-resize top"
        {...topResize.listeners}
        {...topResize.attributes}
      />
      <div className="tb-block-title">
        <button
          type="button"
          className="tb-check"
          aria-label={state === 'completed' ? 'Mark incomplete' : 'Mark completed'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(block.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            background: state === 'completed' ? 'var(--success)' : undefined,
            borderColor: state === 'completed' ? 'var(--success)' : undefined,
            color: state === 'completed' ? 'white' : 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {state === 'completed' && <Icon name="check" size={9} stroke={2.5} />}
        </button>
        <span>{block.title}</span>
      </div>
      {showMeta && (
        <div className="tb-block-meta">
          <span>
            {fmtTime(block.startMin ?? 0)} – {fmtTime((block.startMin ?? 0) + block.durationMin)}
          </span>
          <span>·</span>
          <span>{fmtDur(block.durationMin)}</span>
          {block.notes && height < 70 && (
            <>
              <span>·</span>
              <Icon name="note" size={10} />
            </>
          )}
        </div>
      )}
      {showNote && <div className="tb-block-note">{block.notes}</div>}
      <div
        ref={moveResize.setNodeRef}
        className="tb-resize bot"
        {...moveResize.listeners}
        {...moveResize.attributes}
      />
    </div>
  );
}
