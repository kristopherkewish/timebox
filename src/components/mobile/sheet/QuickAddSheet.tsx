import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { BottomSheet } from './BottomSheet';
import { useCreateTimebox, useDaily } from '@/hooks/useDaily';
import { useCurrentDate } from '@/hooks/useCurrentDate';
import { useFreshIds } from '@/hooks/useFreshIds';
import { useCreateMonthlyTask } from '@/hooks/useMonthly';
import { useSettings } from '@/hooks/useSettings';
import { useSheet } from '@/hooks/useSheet';
import { useCreateWeeklyTask } from '@/hooks/useWeekly';
import { findSlots } from '@/lib/scheduler';
import {
  fmtTime,
  isToday,
  localISODate,
  monthStartFor,
  nowMinutes,
  weekStartFor,
} from '@/lib/time';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DURATIONS = [15, 30, 45, 60, 90, 120] as const;

type Scope = 'day' | 'week' | 'month';

export function QuickAddSheet() {
  const payload = useSheet((s) => s.payload) as { scope?: Scope } | null;
  const scope = payload?.scope ?? 'day';
  if (scope === 'week') return <QuickAddWeekly />;
  if (scope === 'month') return <QuickAddMonthly />;
  return <QuickAddDaily />;
}

// ─────────────────────────── Daily ────────────────────────────
function QuickAddDaily() {
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
        <SectionLabel>Duration</SectionLabel>
        <div className="tbm-chips-row">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`tbm-dur-chip${duration === d ? ' active' : ''}`}
              onClick={() => setDuration(d)}
            >
              {fmtChip(d)}
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

  return (
    <BottomSheet
      title="New task"
      body={body}
      cta={
        <button
          type="button"
          className="tbm-sheet-cta"
          disabled={!title.trim() || create.isPending}
          onClick={submit}
        >
          {ctaLabel}
        </button>
      }
    />
  );
}

// ─────────────────────────── Weekly ───────────────────────────
function QuickAddWeekly() {
  const [params] = useSearchParams();
  const { settings } = useSettings();
  const today = useMemo(() => localISODate(), []);
  const queryWeek = params.get('week');
  const weekStart =
    queryWeek && ISO.test(queryWeek)
      ? queryWeek
      : weekStartFor(today, settings.firstDayOfWeek);

  const create = useCreateWeeklyTask(weekStart);
  const close = useSheet((s) => s.close);
  const markFresh = useFreshIds((s) => s.mark);

  return (
    <SimplePoolCapture
      title="New weekly task"
      placeholder="What's the task?"
      helper="Lands in this week's pool. Drag onto a day to schedule."
      ctaLabel="Add to weekly pool"
      pending={create.isPending}
      onSubmit={(text) =>
        create.mutate(
          { title: text },
          {
            onSuccess: (newTask) => {
              markFresh(newTask.id);
              close();
            },
          },
        )
      }
    />
  );
}

// ─────────────────────────── Monthly ──────────────────────────
function QuickAddMonthly() {
  const [params] = useSearchParams();
  const today = useMemo(() => localISODate(), []);
  const queryMonth = params.get('month');
  const monthStart =
    queryMonth && /^\d{4}-\d{2}-01$/.test(queryMonth)
      ? queryMonth
      : monthStartFor(today);

  const create = useCreateMonthlyTask(monthStart);
  const close = useSheet((s) => s.close);
  const markFresh = useFreshIds((s) => s.mark);

  return (
    <SimplePoolCapture
      title="New monthly task"
      placeholder="What's the task?"
      helper="Lands in this month's pool. Drag onto a week to schedule."
      ctaLabel="Add to monthly pool"
      pending={create.isPending}
      onSubmit={(text) =>
        create.mutate(
          { title: text },
          {
            onSuccess: (newTask) => {
              markFresh(newTask.id);
              close();
            },
          },
        )
      }
    />
  );
}

// ─────────────────────── Shared bare-title sheet ──────────────────────
function SimplePoolCapture({
  title,
  placeholder,
  helper,
  ctaLabel,
  pending,
  onSubmit,
}: {
  title: string;
  placeholder: string;
  helper: string;
  ctaLabel: string;
  pending: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = text.trim();

  const body = (
    <div style={{ paddingTop: 4 }}>
      <input
        ref={inputRef}
        className="tbm-input"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && trimmed) {
            e.preventDefault();
            onSubmit(trimmed);
          }
        }}
      />
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
        {helper}
      </div>
    </div>
  );

  return (
    <BottomSheet
      title={title}
      body={body}
      cta={
        <button
          type="button"
          className="tbm-sheet-cta"
          disabled={!trimmed || pending}
          onClick={() => onSubmit(trimmed)}
        >
          {ctaLabel}
        </button>
      }
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function fmtChip(min: number): string {
  if (min < 60) return `${min}m`;
  if (min % 60 === 0) return `${min / 60}h`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
