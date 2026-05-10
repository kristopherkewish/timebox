import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/desktop/shell/Header';
import { WeeklyView } from '@/components/desktop/weekly/WeeklyView';
import { useWeekly } from '@/hooks/useWeekly';
import { useSettings } from '@/hooks/useSettings';
import { addDays, localISODate, parseISODate, weekStartFor } from '@/lib/time';

export function WeeklyPage() {
  const [params, setParams] = useSearchParams();
  const { settings } = useSettings();
  const today = useMemo(() => localISODate(), []);
  const fdw = settings.firstDayOfWeek;

  const queryWeek = params.get('week');
  const weekStart =
    queryWeek && /^\d{4}-\d{2}-\d{2}$/.test(queryWeek)
      ? queryWeek
      : weekStartFor(today, fdw);

  const navigate = useNavigate();
  const data = useWeekly(weekStart);

  const start = parseISODate(weekStart);
  const end = parseISODate(addDays(weekStart, 6));

  const eyebrow = 'Week';
  const title = sameMonth(start, end)
    ? `${start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
    : `${start.toLocaleDateString(undefined, { month: 'short' })} – ${end.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
  const dateLabel = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  const setWeek = (w: string) => {
    if (w === weekStartFor(today, fdw)) {
      params.delete('week');
    } else {
      params.set('week', w);
    }
    setParams(params, { replace: true });
  };

  return (
    <>
      <Header
        eyebrow={eyebrow}
        title={title}
        dateLabel={dateLabel}
        onPrev={() => setWeek(addDays(weekStart, -7))}
        onNext={() => setWeek(addDays(weekStart, 7))}
        onToday={() => navigate('/week', { replace: true })}
      />
      {data.isLoading || !data.data ? (
        <div className="empty-message">Loading…</div>
      ) : (
        <WeeklyView
          weekStart={weekStart}
          pool={data.data.pool}
          days={data.data.days}
          firstDayOfWeek={fdw}
          todayIsoDate={today}
        />
      )}
    </>
  );
}

function sameMonth(a: Date, b: Date) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
