import { describe, expect, it } from 'vitest';
import { detectConflict, layoutColumns, snapToIncrement } from '@/lib/timeline';

describe('snapToIncrement', () => {
  it('rounds to the nearest increment', () => {
    expect(snapToIncrement(0, 15)).toBe(0);
    expect(snapToIncrement(7, 15)).toBe(0);
    expect(snapToIncrement(8, 15)).toBe(15);
    expect(snapToIncrement(73, 30)).toBe(60);
    expect(snapToIncrement(75, 30)).toBe(90);
    expect(snapToIncrement(123, 5)).toBe(125);
  });

  it('passes through when increment is 0 or negative', () => {
    expect(snapToIncrement(123, 0)).toBe(123);
    expect(snapToIncrement(123, -5)).toBe(123);
  });
});

describe('detectConflict', () => {
  const blocks = [
    { id: 'a', startMin: 9 * 60, durationMin: 60 },
    { id: 'b', startMin: 11 * 60, durationMin: 30 },
    { id: 'c', startMin: null, durationMin: 30 },
  ];

  it('flags full overlap', () => {
    expect(detectConflict(blocks, 9 * 60 + 15, 30)).toBe(true);
  });

  it('flags partial overlap on either end', () => {
    expect(detectConflict(blocks, 8 * 60 + 30, 60)).toBe(true);
    expect(detectConflict(blocks, 9 * 60 + 30, 60)).toBe(true);
  });

  it('does not flag edge-touching boundaries', () => {
    expect(detectConflict(blocks, 10 * 60, 30)).toBe(false);
    expect(detectConflict(blocks, 8 * 60, 60)).toBe(false);
  });

  it('ignores excluded id', () => {
    expect(detectConflict(blocks, 9 * 60, 60, 'a')).toBe(false);
  });

  it('ignores inbox blocks', () => {
    expect(detectConflict(blocks, 14 * 60, 30)).toBe(false);
  });
});

describe('layoutColumns', () => {
  it('places non-overlapping blocks in a single full-width column', () => {
    const layout = layoutColumns([
      { id: 'a', startMin: 9 * 60, durationMin: 60 },
      { id: 'b', startMin: 11 * 60, durationMin: 30 },
    ]);
    expect(layout.a).toEqual({ column: 0, cols: 1 });
    expect(layout.b).toEqual({ column: 0, cols: 1 });
  });

  it('splits two parallel blocks into side-by-side columns', () => {
    const layout = layoutColumns([
      { id: 'a', startMin: 9 * 60, durationMin: 60 },
      { id: 'b', startMin: 9 * 60 + 15, durationMin: 60 },
    ]);
    expect(layout.a).toEqual({ column: 0, cols: 2 });
    expect(layout.b).toEqual({ column: 1, cols: 2 });
  });

  it('splits three parallel blocks into three columns', () => {
    const layout = layoutColumns([
      { id: 'a', startMin: 9 * 60, durationMin: 60 },
      { id: 'b', startMin: 9 * 60 + 10, durationMin: 60 },
      { id: 'c', startMin: 9 * 60 + 20, durationMin: 60 },
    ]);
    expect(layout.a.cols).toBe(3);
    expect(layout.b.cols).toBe(3);
    expect(layout.c.cols).toBe(3);
    const usedColumns = new Set([layout.a.column, layout.b.column, layout.c.column]);
    expect(usedColumns).toEqual(new Set([0, 1, 2]));
  });

  it('reuses freed columns within a transitively-connected cluster', () => {
    // A 9–10, B 9:30–10:30, C 10:15–11. A and C never overlap, but B bridges
    // them so all three share one cluster. C should reclaim A's freed column.
    const layout = layoutColumns([
      { id: 'a', startMin: 9 * 60, durationMin: 60 },
      { id: 'b', startMin: 9 * 60 + 30, durationMin: 60 },
      { id: 'c', startMin: 10 * 60 + 15, durationMin: 45 },
    ]);
    expect(layout.a).toEqual({ column: 0, cols: 2 });
    expect(layout.b).toEqual({ column: 1, cols: 2 });
    expect(layout.c).toEqual({ column: 0, cols: 2 });
  });

  it('treats edge-touching blocks as not overlapping', () => {
    const layout = layoutColumns([
      { id: 'a', startMin: 9 * 60, durationMin: 60 },
      { id: 'b', startMin: 10 * 60, durationMin: 30 },
    ]);
    expect(layout.a).toEqual({ column: 0, cols: 1 });
    expect(layout.b).toEqual({ column: 0, cols: 1 });
  });

  it('skips inbox blocks (startMin === null)', () => {
    const layout = layoutColumns([
      { id: 'a', startMin: 9 * 60, durationMin: 60 },
      { id: 'inbox', startMin: null, durationMin: 30 },
    ]);
    expect(layout.a).toEqual({ column: 0, cols: 1 });
    expect(layout.inbox).toBeUndefined();
  });
});
