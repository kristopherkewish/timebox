// Verbatim ports of fmtTime/fmtTimeShort/fmtDur from
// `Personal Timebox App/design_handoff_timebox/components/daily.jsx`.
// Their output is part of the visual contract — do not "improve" them.

export function fmtTime(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function fmtTimeShort(mins: number): string {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'p' : 'a';
  let h = h24 % 12;
  if (h === 0) h = 12;
  if (m === 0) return `${h}${ampm}`;
  return `${h}:${m.toString().padStart(2, '0')}${ampm}`;
}

export function fmtDur(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// --- Date helpers used by the daily/weekly/monthly hooks ---

export function localISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return localISODate(d);
}

export function isPastDate(iso: string, now = new Date()): boolean {
  return iso < localISODate(now);
}

export function isToday(iso: string, now = new Date()): boolean {
  return iso === localISODate(now);
}

export function nowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

// Returns the ISO date for the start of the week containing `iso`, given
// firstDayOfWeek (1 = Monday, 0 = Sunday).
export function weekStartFor(iso: string, firstDayOfWeek = 1): string {
  const d = parseISODate(iso);
  const dow = d.getDay(); // 0=Sun..6=Sat
  let delta = dow - firstDayOfWeek;
  if (delta < 0) delta += 7;
  d.setDate(d.getDate() - delta);
  return localISODate(d);
}

export function monthStartFor(iso: string): string {
  const d = parseISODate(iso);
  d.setDate(1);
  return localISODate(d);
}
