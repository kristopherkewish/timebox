import { addDays, localISODate, parseISODate, weekStartFor } from './time';

export interface MonthWeek {
  index: number;
  weekStart: string; // ISO date for the first day of this week (per fdw)
  range: string; // e.g. "May 4 – May 10"
  label: string; // e.g. "Week 19"
  isoWeek: number;
}

export function buildMonthWeeks(monthStart: string, firstDayOfWeek = 1): MonthWeek[] {
  const ms = parseISODate(monthStart);
  const monthIdx = ms.getMonth();
  const year = ms.getFullYear();
  const monthEnd = new Date(year, monthIdx + 1, 0); // last day of month

  const weeks: MonthWeek[] = [];
  let cur = parseISODate(weekStartFor(monthStart, firstDayOfWeek));
  let i = 0;
  while (cur <= monthEnd) {
    const start = localISODate(cur);
    const end = addDays(start, 6);
    const startD = parseISODate(start);
    const endD = parseISODate(end);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    weeks.push({
      index: i,
      weekStart: start,
      range: `${fmt(startD)} – ${fmt(endD)}`,
      label: `Week ${isoWeekNumber(startD)}`,
      isoWeek: isoWeekNumber(startD),
    });
    i++;
    cur = parseISODate(addDays(start, 7));
  }
  return weeks;
}

// Standard ISO week number (week starts Monday). Independent of firstDayOfWeek;
// purely for the "Week 19" label.
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function currentMonthWeekIndex(
  weeks: MonthWeek[],
  todayISO: string,
): number | null {
  for (const w of weeks) {
    const start = w.weekStart;
    const end = addDays(start, 7);
    if (start <= todayISO && todayISO < end) return w.index;
  }
  return null;
}
