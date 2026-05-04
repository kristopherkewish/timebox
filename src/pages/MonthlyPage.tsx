import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/shell/Header';
import { MonthlyView } from '@/components/monthly/MonthlyView';
import { useMonthly } from '@/hooks/useMonthly';
import { useSettings } from '@/hooks/useSettings';
import { localISODate, monthStartFor, parseISODate } from '@/lib/time';
import { buildMonthWeeks, currentMonthWeekIndex } from '@/lib/month';

export function MonthlyPage() {
  const [params, setParams] = useSearchParams();
  const { settings } = useSettings();
  const today = useMemo(() => localISODate(), []);

  const queryMonth = params.get('month');
  const monthStart =
    queryMonth && /^\d{4}-\d{2}-\d{2}$/.test(queryMonth) && queryMonth.endsWith('-01')
      ? queryMonth
      : monthStartFor(today);

  const navigate = useNavigate();
  const data = useMonthly(monthStart);

  const ms = parseISODate(monthStart);
  const title = ms.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const dateLabel = ms.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  const weeks = buildMonthWeeks(monthStart, settings.firstDayOfWeek);
  const currentIdx = currentMonthWeekIndex(weeks, today);

  const setMonth = (m: string) => {
    if (m === monthStartFor(today)) {
      params.delete('month');
    } else {
      params.set('month', m);
    }
    setParams(params, { replace: true });
  };

  const prevMonth = () => {
    const d = parseISODate(monthStart);
    d.setMonth(d.getMonth() - 1);
    setMonth(monthStartFor(localISODate(d)));
  };
  const nextMonth = () => {
    const d = parseISODate(monthStart);
    d.setMonth(d.getMonth() + 1);
    setMonth(monthStartFor(localISODate(d)));
  };

  return (
    <>
      <Header
        eyebrow="Month"
        title={title}
        dateLabel={dateLabel}
        onPrev={prevMonth}
        onNext={nextMonth}
        onToday={() => navigate('/month', { replace: true })}
      />
      {data.isLoading || !data.data ? (
        <div className="empty-message">Loading…</div>
      ) : (
        <MonthlyView
          monthStart={monthStart}
          pool={data.data.pool}
          byWeek={data.data.byWeek}
          weeks={weeks}
          currentWeekIndex={currentIdx}
        />
      )}
    </>
  );
}
