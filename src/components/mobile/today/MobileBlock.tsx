import type { KeyboardEvent } from 'react';

import type { Timebox } from '@/hooks/useDaily';
import type { BlockState } from '@/lib/completion';
import { fmtDur, fmtTime } from '@/lib/time';
import { minutesToPx } from '@/lib/timeline';

interface Props {
  block: Timebox;
  state: BlockState;
  hourPx: number;
  dayStartMin: number;
  fresh?: boolean;
  onTap?: (id: string) => void;
}

export function MobileBlock({ block, state, hourPx, dayStartMin, fresh, onTap }: Props) {
  if (block.startMin == null) return null;
  const top = minutesToPx(block.startMin, dayStartMin, hourPx);
  const height = (block.durationMin / 60) * hourPx;

  const stateClass =
    state === 'completed' ? ' done' : state === 'in-progress' ? ' live' : '';
  const freshClass = fresh ? ' fresh' : '';

  const handleClick = onTap ? () => onTap(block.id) : undefined;
  const handleKey = onTap
    ? (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(block.id);
        }
      }
    : undefined;

  return (
    <div
      className={`tbm-block${stateClass}${freshClass}`}
      style={{ top, height: height - 4 }}
      role={onTap ? 'button' : undefined}
      tabIndex={onTap ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
      <div className="tbm-block-title">
        <span className="tbm-check">
          {state === 'completed' && <CheckIcon />}
        </span>
        <span
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {block.title}
        </span>
      </div>
      {height > 44 && (
        <div className="tbm-block-meta">
          {fmtTime(block.startMin)} – {fmtTime(block.startMin + block.durationMin)} ·{' '}
          {fmtDur(block.durationMin)}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 6l3 3 5-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
