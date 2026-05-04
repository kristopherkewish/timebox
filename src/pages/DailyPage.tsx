import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/shell/Header';
import { DailyView } from '@/components/daily/DailyView';
import { useDaily } from '@/hooks/useDaily';
import { useSettings } from '@/hooks/useSettings';
import { addDays, isToday, localISODate, parseISODate } from '@/lib/time';

export function DailyPage() {
  const [params, setParams] = useSearchParams();
  const dateParam = params.get('date');
  const today = useMemo(() => localISODate(), []);
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const navigate = useNavigate();
  const { settings } = useSettings();

  const dailyQ = useDaily(date);
  const data = dailyQ.data;

  const dateObj = parseISODate(date);
  const eyebrow = dateObj.toLocaleDateString(undefined, { weekday: 'long' });
  const title = dateObj.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const dateLabel = isToday(date)
    ? 'Today'
    : dateObj.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

  const setDate = (d: string) => {
    if (d === today) {
      params.delete('date');
    } else {
      params.set('date', d);
    }
    setParams(params, { replace: true });
  };

  return (
    <>
      <Header
        eyebrow={eyebrow}
        title={title}
        dateLabel={dateLabel}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        onToday={() => navigate('/', { replace: true })}
      />
      {dailyQ.isLoading || !data ? (
        <div className="empty-message">Loading…</div>
      ) : (
        <DailyView
          date={date}
          inbox={data.inbox}
          timeline={data.timeline}
          hourPx={96}
          dayStartMin={settings.dayStartMin}
          dayEndMin={settings.dayEndMin}
          increment={settings.defaultIncrementMin}
          allowOverlap={settings.allowOverlap}
        />
      )}
    </>
  );
}
