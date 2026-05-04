import { describe, expect, it } from 'vitest';
import { detectConflict, snapToIncrement } from '@/lib/timeline';

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
