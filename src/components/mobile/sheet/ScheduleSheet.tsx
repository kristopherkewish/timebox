import { useMemo } from 'react';

import { BottomSheet } from './BottomSheet';
import { useDaily, useUpdateTimebox } from '@/hooks/useDaily';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { useFreshIds } from '@/hooks/useFreshIds';
import { useSettings } from '@/hooks/useSettings';
import { useSheet } from '@/hooks/useSheet';
import { findSlots, type Slot } from '@/lib/scheduler';
import { fmtDur, fmtTime, isToday, nowMinutes } from '@/lib/time';

interface Props {
  taskId: string;
}

export function ScheduleSheet({ taskId }: Props) {
  const date = useCurrentDate();
  const dailyQ = useDaily(date);
  const update = useUpdateTimebox(date);
  const close = useSheet((s) => s.close);
  const markFresh = useFreshIds((s) => s.mark);
  const { settings } = useSettings();

  const all = [...(dailyQ.data?.inbox ?? []), ...(dailyQ.data?.timeline ?? [])];
  const task = all.find((b) => b.id === taskId);

  const result = useMemo(() => {
    if (!task) return { recommended: null, alternatives: [] };
    const startCutoff = isToday(date) ? nowMinutes() : settings.dayStartMin;
    return findSlots(startCutoff, dailyQ.data?.timeline ?? [], task.durationMin, {
      dayStartMin: settings.dayStartMin,
      dayEndMin: settings.dayEndMin,
      increment: settings.defaultIncrementMin,
      allowOverlap: Boolean(settings.allowOverlap),
    });
  }, [task, dailyQ.data?.timeline, settings, date]);

  if (!task) return null;

  const pick = (startMin: number) => {
    update.mutate(
      { id: taskId, patch: { startMin } },
      {
        onSuccess: () => {
          markFresh(taskId);
          close();
        },
      },
    );
  };

  const subtitle = (
    <>
      {task.title} · {fmtDur(task.durationMin)}
    </>
  );

  const body = (
    <>
      {result.recommended ? (
        <div>
          <div className="tbm-slot-eyebrow">
            <span className="pulse" />
            Recommended
          </div>
          <SlotRow slot={result.recommended} variant="recommended" onPick={pick} />
        </div>
      ) : (
        <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>
          No open slot fits a {fmtDur(task.durationMin)} block today.
        </div>
      )}

      {result.alternatives.length > 0 && (
        <div>
          <div className="tbm-slots-other">Other open slots</div>
          {result.alternatives.map((s) => (
            <SlotRow key={s.startMin} slot={s} onPick={pick} />
          ))}
        </div>
      )}

      <div className="tbm-drag-hint">
        <ClockIcon />
        Or drag the pool card onto the timeline to place anywhere.
      </div>
    </>
  );

  const cta = result.recommended ? (
    <button
      type="button"
      className="tbm-sheet-cta"
      disabled={update.isPending}
      onClick={() => pick(result.recommended!.startMin)}
    >
      Schedule for {fmtTime(result.recommended.startMin)}
    </button>
  ) : null;

  return <BottomSheet title="Schedule" subtitle={subtitle} body={body} cta={cta} />;
}

function SlotRow({
  slot,
  variant,
  onPick,
}: {
  slot: Slot;
  variant?: 'recommended';
  onPick: (mins: number) => void;
}) {
  const cls = variant === 'recommended' ? 'tbm-slot recommended' : 'tbm-slot';
  return (
    <div className={cls}>
      <div className="tbm-slot-time">{fmtTime(slot.startMin)}</div>
      <div className="tbm-slot-info">
        <span className="ttl">{slot.ttl}</span>
        <span className="sub">{slot.sub}</span>
      </div>
      <button
        type="button"
        className="pick"
        aria-label={`Pick ${fmtTime(slot.startMin)}`}
        onClick={() => onPick(slot.startMin)}
      >
        <ArrowIcon />
      </button>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M14 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7.5v5l3 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
