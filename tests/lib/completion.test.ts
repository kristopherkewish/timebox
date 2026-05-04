import { describe, expect, it } from 'vitest';
import { deriveState } from '@/lib/completion';

const today = '2026-05-05';
const tomorrow = '2026-05-06';

function ms(date: string, h: number, m = 0) {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).getTime();
}

describe('deriveState', () => {
  it('returns upcoming before start', () => {
    expect(
      deriveState(ms(today, 8, 0), {
        date: today,
        startMin: 9 * 60,
        durationMin: 60,
        completionState: 'upcoming',
        completionOverridden: 0,
      }),
    ).toBe('upcoming');
  });

  it('returns in-progress between start and end', () => {
    expect(
      deriveState(ms(today, 9, 30), {
        date: today,
        startMin: 9 * 60,
        durationMin: 60,
        completionState: 'upcoming',
        completionOverridden: 0,
      }),
    ).toBe('in-progress');
  });

  it('returns completed once end has passed', () => {
    expect(
      deriveState(ms(today, 11, 0), {
        date: today,
        startMin: 9 * 60,
        durationMin: 60,
        completionState: 'upcoming',
        completionOverridden: 0,
      }),
    ).toBe('completed');
  });

  it('honours overridden state regardless of clock', () => {
    expect(
      deriveState(ms(today, 11, 0), {
        date: today,
        startMin: 9 * 60,
        durationMin: 60,
        completionState: 'incomplete',
        completionOverridden: 1,
      }),
    ).toBe('incomplete');
  });

  it('is stable across the now boundary', () => {
    const block = {
      date: today,
      startMin: 9 * 60,
      durationMin: 60,
      completionState: 'upcoming' as const,
      completionOverridden: 0 as const,
    };
    expect(deriveState(ms(today, 8, 59), block)).toBe('upcoming');
    expect(deriveState(ms(today, 9, 0), block)).toBe('in-progress');
    expect(deriveState(ms(today, 9, 59), block)).toBe('in-progress');
    expect(deriveState(ms(today, 10, 0), block)).toBe('completed');
  });

  it('past dates fall through to completed without override', () => {
    expect(
      deriveState(ms(tomorrow, 0, 0), {
        date: today,
        startMin: 9 * 60,
        durationMin: 60,
        completionState: 'upcoming',
        completionOverridden: 0,
      }),
    ).toBe('completed');
  });

  it('inbox tasks (no startMin) stay upcoming', () => {
    expect(
      deriveState(ms(today, 23, 0), {
        date: today,
        startMin: null,
        durationMin: 30,
        completionState: 'upcoming',
        completionOverridden: 0,
      }),
    ).toBe('upcoming');
  });
});
