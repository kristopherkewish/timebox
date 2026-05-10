import { describe, expect, it } from 'vitest';

import { findSlots, type SchedulerBlock, type SchedulerConfig } from '@/lib/scheduler';

const cfg = (overrides?: Partial<SchedulerConfig>): SchedulerConfig => ({
  dayStartMin: 6 * 60,
  dayEndMin: 22 * 60,
  increment: 15,
  allowOverlap: false,
  ...overrides,
});

const block = (id: string, title: string, startMin: number | null, durationMin: number): SchedulerBlock => ({
  id,
  title,
  startMin,
  durationMin,
});

describe('findSlots', () => {
  it('empty day → recommended at now snapped up, no alternatives', () => {
    const r = findSlots(10 * 60 + 23, [], 25, cfg());
    expect(r.recommended).toEqual({
      startMin: 10 * 60 + 30,
      ttl: 'First open slot',
      sub: expect.stringContaining('free'),
    });
    expect(r.alternatives).toEqual([]);
  });

  it('returns alternatives for gaps after the recommended slot', () => {
    const blocks = [
      block('a', 'Standup', 9 * 60, 30),       // 9:00–9:30
      block('b', 'Lunch', 12 * 60, 60),        // 12:00–13:00
      block('c', 'Review', 15 * 60, 60),       // 15:00–16:00
    ];
    const r = findSlots(8 * 60, blocks, 25, cfg());
    // 4 free intervals: [6:00–9:00], [9:30–12:00], [13:00–15:00], [16:00–22:00]
    // After cutoff (8:00 snapped up to 8:00), the candidates are:
    // 8:00 (in [6:00–9:00]), 9:30 ([9:30–12:00]), 13:00 ([13:00–15:00]), 16:00 ([16:00–22:00]).
    expect(r.recommended?.startMin).toBe(8 * 60);
    expect(r.alternatives.map((s) => s.startMin)).toEqual([
      9 * 60 + 30,
      13 * 60,
      16 * 60,
    ]);
  });

  it('skips intervals shorter than the requested duration', () => {
    const blocks = [
      block('a', 'Block A', 9 * 60, 60),       // 9:00–10:00
      block('b', 'Block B', 10 * 60 + 15, 60), // 10:15–11:15 (15-min gap before)
    ];
    const r = findSlots(8 * 60, blocks, 30, cfg());
    // Free intervals: [6:00–9:00], [10:00–10:15] (skipped, 15m too short),
    // [11:15–22:00]. So recommended = 8:00, alternatives = [11:15].
    expect(r.recommended?.startMin).toBe(8 * 60);
    expect(r.alternatives.map((s) => s.startMin)).toEqual([11 * 60 + 15]);
  });

  it('full day → no slots', () => {
    const blocks = [block('a', 'Marathon', 6 * 60, 16 * 60)]; // 6:00–22:00
    const r = findSlots(8 * 60, blocks, 30, cfg());
    expect(r.recommended).toBeNull();
    expect(r.alternatives).toEqual([]);
  });

  it('now past dayEnd → no slots', () => {
    const r = findSlots(23 * 60, [], 30, cfg());
    expect(r.recommended).toBeNull();
    expect(r.alternatives).toEqual([]);
  });

  it('duration longer than day → no slots', () => {
    const r = findSlots(8 * 60, [], 24 * 60, cfg());
    expect(r.recommended).toBeNull();
  });

  it('allowOverlap=true ignores blocks; entire day is one interval', () => {
    const blocks = [
      block('a', 'A', 8 * 60, 60),
      block('b', 'B', 9 * 60, 60),
      block('c', 'C', 11 * 60, 120),
    ];
    const r = findSlots(7 * 60 + 22, blocks, 25, { ...cfg(), allowOverlap: true });
    // First slot snaps 7:22 up to 7:30. Sub-label is "First open slot".
    expect(r.recommended?.startMin).toBe(7 * 60 + 30);
    expect(r.recommended?.ttl).toBe('First open slot');
  });

  it('uses prev/next titles for sub-labels', () => {
    const blocks = [
      block('a', 'Standup', 9 * 60, 30),
      block('b', 'Lunch', 12 * 60, 60),
    ];
    const r = findSlots(11 * 60, blocks, 30, cfg());
    // Free intervals: [6:00–9:00], [9:30–12:00], [13:00–22:00].
    // Cutoff 11:00 snaps to 11:00; only [9:30–12:00] still admits a 30m slot
    // starting at or after 11:00 (11:00–11:30). Then [13:00–22:00] starting 13:00.
    expect(r.recommended?.ttl).toBe('After Standup, before Lunch');
    expect(r.alternatives[0]?.ttl).toBe('After Lunch');
  });

  it('"Fits exactly" sub when free == duration', () => {
    const blocks = [
      block('a', 'Open', 6 * 60, 60),     // 6:00–7:00
      block('b', 'Close', 7 * 60 + 30, 60), // 7:30–8:30 (30m gap exactly)
    ];
    const r = findSlots(6 * 60, blocks, 30, cfg());
    // [7:00–7:30] is the first sufficient gap → recommended.
    expect(r.recommended?.startMin).toBe(7 * 60);
    expect(r.recommended?.sub).toBe('Fits exactly');
  });

  it('edge-touching block end → next slot starts exactly there', () => {
    const blocks = [
      block('a', 'A', 9 * 60, 30),  // 9:00–9:30
      block('b', 'B', 10 * 60, 30), // 10:00–10:30 (30m gap, edges touch)
    ];
    const r = findSlots(9 * 60, blocks, 30, cfg());
    // Slot at 9:30 fills [9:30–10:00] exactly, edge-touches B at 10:00.
    expect(r.recommended?.startMin).toBe(9 * 60 + 30);
    expect(r.recommended?.sub).toBe('Fits exactly');
  });
});
