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

export interface ColumnLayout {
  column: number;
  cols: number;
}

/**
 * Assigns each timeline block a column so overlapping blocks render side-by-side.
 *
 * Greedy interval-graph layout: blocks are grouped into clusters of transitively
 * overlapping intervals, each block is placed in the lowest-indexed column that is
 * free at its start, and every block in a cluster shares the cluster's max column
 * count so widths are equal within the cluster.
 */
export function layoutColumns(
  blocks: Array<Pick<TimelineBlock, 'id' | 'startMin' | 'durationMin'>>,
): Record<string, ColumnLayout> {
  const onTimeline = blocks.filter(
    (b): b is { id: string; startMin: number; durationMin: number } => b.startMin != null,
  );
  const sorted = [...onTimeline].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin;
    return b.durationMin - a.durationMin;
  });

  const result: Record<string, ColumnLayout> = {};
  let columns: Array<{ endMin: number }[]> = [];
  let groupIds: string[] = [];
  let groupEndMax = -Infinity;

  const finalize = () => {
    const cols = columns.length;
    for (const id of groupIds) {
      result[id] = { column: result[id].column, cols };
    }
    columns = [];
    groupIds = [];
    groupEndMax = -Infinity;
  };

  for (const b of sorted) {
    const start = b.startMin;
    const end = start + b.durationMin;

    if (start >= groupEndMax) finalize();

    let colIdx = -1;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const last = col[col.length - 1];
      if (last.endMin <= start) {
        colIdx = i;
        break;
      }
    }
    if (colIdx === -1) {
      columns.push([{ endMin: end }]);
      colIdx = columns.length - 1;
    } else {
      columns[colIdx].push({ endMin: end });
    }

    result[b.id] = { column: colIdx, cols: 0 };
    groupIds.push(b.id);
    if (end > groupEndMax) groupEndMax = end;
  }
  finalize();

  return result;
}
