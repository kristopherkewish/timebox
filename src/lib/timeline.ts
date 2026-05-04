export interface TimelineBlock {
  id: string;
  startMin: number | null;
  durationMin: number;
}

export function snapToIncrement(mins: number, inc: number): number {
  if (inc <= 0) return mins;
  return Math.round(mins / inc) * inc;
}

export function minutesToPx(mins: number, dayStart: number, hourPx: number): number {
  return ((mins - dayStart) / 60) * hourPx;
}

export function pxToMinutes(
  y: number,
  dayStart: number,
  hourPx: number,
  inc: number,
): number {
  return snapToIncrement(dayStart + (y / hourPx) * 60, inc);
}

export function detectConflict(
  blocks: TimelineBlock[],
  start: number,
  dur: number,
  excludeId?: string,
): boolean {
  for (const b of blocks) {
    if (b.id === excludeId) continue;
    if (b.startMin == null) continue;
    const bEnd = b.startMin + b.durationMin;
    const aEnd = start + dur;
    if (start < bEnd && aEnd > b.startMin) return true;
  }
  return false;
}

export function clampToDay(
  start: number,
  duration: number,
  dayStart: number,
  dayEnd: number,
): number {
  if (start < dayStart) return dayStart;
  if (start + duration > dayEnd) return dayEnd - duration;
  return start;
}
