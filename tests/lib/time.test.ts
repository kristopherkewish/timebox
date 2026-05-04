import { describe, expect, it } from 'vitest';
import { fmtDur, fmtTime, fmtTimeShort } from '@/lib/time';

describe('fmtTime', () => {
  it('formats midnight, noon, and ampm boundaries', () => {
    expect(fmtTime(0)).toBe('12:00 AM');
    expect(fmtTime(12 * 60)).toBe('12:00 PM');
    expect(fmtTime(11 * 60 + 59)).toBe('11:59 AM');
    expect(fmtTime(13 * 60 + 5)).toBe('1:05 PM');
    expect(fmtTime(6 * 60 + 30)).toBe('6:30 AM');
  });
});

describe('fmtTimeShort', () => {
  it('drops trailing :00 minutes', () => {
    expect(fmtTimeShort(0)).toBe('12a');
    expect(fmtTimeShort(12 * 60)).toBe('12p');
    expect(fmtTimeShort(9 * 60)).toBe('9a');
    expect(fmtTimeShort(14 * 60 + 30)).toBe('2:30p');
    expect(fmtTimeShort(13 * 60)).toBe('1p');
  });
});

describe('fmtDur', () => {
  it('formats minutes, hours, and combos', () => {
    expect(fmtDur(0)).toBe('0m');
    expect(fmtDur(45)).toBe('45m');
    expect(fmtDur(60)).toBe('1h');
    expect(fmtDur(90)).toBe('1h 30m');
    expect(fmtDur(125)).toBe('2h 5m');
  });
});
