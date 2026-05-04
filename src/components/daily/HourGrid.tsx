interface Props {
  dayStart: number; // hours (e.g. 6)
  dayEnd: number; // hours (e.g. 22)
  hourPx: number;
}

function hourLabel(h: number): string {
  if (h === 12) return '12 noon';
  if (h === 0 || h === 24) return '12 mid';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export function HourGrid({ dayStart, dayEnd, hourPx }: Props) {
  const hours: number[] = [];
  for (let h = dayStart; h < dayEnd; h++) hours.push(h);
  return (
    <>
      {hours.map((h) => (
        <div key={h} className="tb-hour-row" style={{ height: hourPx }}>
          <div className="tb-hour-label">{hourLabel(h)}</div>
          <div className="tb-quarter q1" />
          <div className="tb-quarter q2" />
          <div className="tb-quarter q3" />
        </div>
      ))}
    </>
  );
}
