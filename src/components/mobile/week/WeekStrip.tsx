export interface WeekStripCell {
  dayOfWeek: number; // 0 = Sun .. 6 = Sat
  dayNum: number;    // calendar day-of-month
  count: number;
  isToday: boolean;
  isWeekend: boolean;
}

interface Props {
  /** Already ordered by `firstDayOfWeek`. */
  days: WeekStripCell[];
}

const DOW_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WeekStrip({ days }: Props) {
  return (
    <div className="tbm-week-strip">
      {days.map((d) => (
        <div
          key={d.dayOfWeek}
          className={`tbm-week-day${d.isToday ? ' today' : ''}${d.isWeekend ? ' weekend' : ''}`}
        >
          <span className="dow">{DOW_INITIAL[d.dayOfWeek]}</span>
          <span className="num">{d.dayNum}</span>
          <span className="pips">
            {Array.from({ length: Math.min(d.count, 3) }).map((_, i) => (
              <span className="pip" key={i} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
