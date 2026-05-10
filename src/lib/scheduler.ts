// Recommended-slot finder for the mobile schedule sheet.
//
// Pure function over the day's already-loaded blocks. Walks the day's free
// intervals from max(now, dayStart) to dayEnd, snapping each candidate start
// to the configured increment. Returns the first slot that fits as
// `recommended` and up to 3 later free slots as `alternatives`, anchored to
// "After X, before Y" sub-labels so the schedule sheet can describe them.

export interface SchedulerBlock {
  id: string;
  startMin: number | null;
  durationMin: number;
  title: string;
}

export interface Slot {
  startMin: number;
  /** First-line label, e.g. "After Standup, before lunch". */
  ttl: string;
  /** Second-line label, e.g. "Fits exactly" or "30m free". */
  sub: string;
}

export interface SchedulerConfig {
  dayStartMin: number;
  dayEndMin: number;
  increment: number;
  allowOverlap: boolean;
}

export interface SchedulerResult {
  recommended: Slot | null;
  alternatives: Slot[];
}

interface FreeInterval {
  start: number;
  end: number;
  prev: SchedulerBlock | null;
  next: SchedulerBlock | null;
}

export function findSlots(
  now: number,
  blocks: SchedulerBlock[],
  durationMin: number,
  cfg: SchedulerConfig,
): SchedulerResult {
  const { dayStartMin, dayEndMin, increment, allowOverlap } = cfg;

  const intervals = freeIntervals(blocks, dayStartMin, dayEndMin, allowOverlap);
  const slots: Slot[] = [];
  const startCutoff = Math.max(now, dayStartMin);

  for (const interval of intervals) {
    const minStart = Math.max(interval.start, startCutoff);
    const slotStart = Math.ceil(minStart / increment) * increment;
    if (slotStart + durationMin > interval.end) continue;
    if (slotStart >= dayEndMin) continue;

    const free = interval.end - slotStart;
    slots.push({
      startMin: slotStart,
      ttl: ttlFor(interval.prev, interval.next),
      sub: subFor(free, durationMin),
    });
  }

  if (slots.length === 0) return { recommended: null, alternatives: [] };

  return {
    recommended: slots[0],
    alternatives: slots.slice(1, 4),
  };
}

function freeIntervals(
  blocks: SchedulerBlock[],
  dayStartMin: number,
  dayEndMin: number,
  allowOverlap: boolean,
): FreeInterval[] {
  const scheduled = blocks
    .filter((b): b is SchedulerBlock & { startMin: number } => b.startMin != null)
    .sort((a, b) => a.startMin - b.startMin);

  if (allowOverlap || scheduled.length === 0) {
    return [{ start: dayStartMin, end: dayEndMin, prev: null, next: null }];
  }

  const out: FreeInterval[] = [];
  let cursor = dayStartMin;
  let prev: SchedulerBlock | null = null;
  for (const b of scheduled) {
    const end = b.startMin + b.durationMin;
    if (b.startMin > cursor) {
      out.push({ start: cursor, end: b.startMin, prev, next: b });
    }
    if (end > cursor) cursor = end;
    prev = b;
  }
  if (cursor < dayEndMin) {
    out.push({ start: cursor, end: dayEndMin, prev, next: null });
  }
  return out;
}

function ttlFor(prev: SchedulerBlock | null, next: SchedulerBlock | null): string {
  if (prev && next) return `After ${prev.title}, before ${next.title}`;
  if (prev) return `After ${prev.title}`;
  if (next) return `Before ${next.title}`;
  return 'First open slot';
}

function subFor(freeMin: number, durationMin: number): string {
  if (freeMin === durationMin) return 'Fits exactly';
  return `${fmtFreeShort(freeMin)} free`;
}

function fmtFreeShort(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
