import { useEffect, useMemo, useRef, useState } from 'react';

import { BottomSheet } from './BottomSheet';
import { useCreateTimebox, useDaily } from '@/hooks/useDaily';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { useFreshIds } from '@/hooks/useFreshIds';
import { useSettings } from '@/hooks/useSettings';
import { useSheet } from '@/hooks/useSheet';
import { findSlots } from '@/lib/scheduler';
import { fmtTime, isToday, nowMinutes } from '@/lib/time';

const DURATIONS = [15, 30, 45, 60, 90, 120] as const;

export function QuickAddSheet() {
  const date = useCurrentDate();
  const create = useCreateTimebox(date);
  const dailyQ = useDaily(date);
  const close = useSheet((s) => s.close);
  const markFresh = useFreshIds((s) => s.mark);
  const { settings } = useSettings();

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [scheduleNow, setScheduleNow] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const recommended = useMemo(() => {
    if (!scheduleNow) return null;
    const startCutoff = isToday(date) ? nowMinutes() : settings.dayStartMin;
    const result = findSlots(startCutoff, dailyQ.data?.timeline ?? [], duration, {
      dayStartMin: settings.dayStartMin,
      dayEndMin: settings.dayEndMin,
      increment: settings.defaultIncrementMin,
      allowOverlap: Boolean(settings.allowOverlap),
    });
    return result.recommended;
  }, [scheduleNow, date, dailyQ.data?.timeline, duration, settings]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const startMin = scheduleNow ? recommended?.startMin ?? null : null;
    create.mutate(
      { title: trimmed, durationMin: duration, startMin },
      {
        onSuccess: (newTask) => {
          markFresh(newTask.id);
          close();
        },
      },
    );
  };

  const ctaLabel =
    scheduleNow && recommended
      ? `Schedule for ${fmtTime(recommended.startMin)}`
      : scheduleNow && !recommended
        ? 'No slot fits — add to pool instead'
        : 'Add to pool';

  const ctaDisabled = !title.trim() || create.isPending;

  const body = (
    <>
      <div style={{ paddingTop: 4 }}>
        <input
          ref={inputRef}
          className="tbm-input"
          value={title}
          placeholder="What's the task?"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--ink-3)',
            marginBottom: 8,
          }}
        >
          Duration
        </div>
        <div className="tbm-chips-row">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`tbm-dur-chip${duration === d ? ' active' : ''}`}
              onClick={() => setDuration(d)}
            >
              {d < 60 ? `${d}m` : d % 60 === 0 ? `${d / 60}h` : `${Math.floor(d / 60)}h ${d % 60}m`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="tbm-field" style={{ borderTop: 0 }}>
          <span className="tbm-field-icon">
            <ClockIcon />
          </span>
          <span className="tbm-field-label">Schedule</span>
          <button
            type="button"
            className={`toggle${scheduleNow ? ' on' : ''}`}
            aria-pressed={scheduleNow}
            onClick={() => setScheduleNow((v) => !v)}
          />
        </div>
        {scheduleNow && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', padding: '0 4px' }}>
            {recommended
              ? `Auto-scheduling for ${fmtTime(recommended.startMin)} (next free slot).`
              : 'No open slot fits today — task will land in the pool.'}
          </div>
        )}
      </div>
    </>
  );

  const cta = (
    <button
      type="button"
      className="tbm-sheet-cta"
      disabled={ctaDisabled}
      onClick={submit}
    >
      {ctaLabel}
    </button>
  );

  return <BottomSheet title="New task" body={body} cta={cta} />;
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
