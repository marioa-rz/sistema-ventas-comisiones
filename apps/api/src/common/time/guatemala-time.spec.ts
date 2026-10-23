import { describe, expect, it } from 'vitest';
import {
  formatGuatemalaDate,
  getGuatemalaDayRange,
  getGuatemalaMonthRange,
  getGuatemalaWeekRange,
  getGuatemalaYearRange,
  parseDateRangeInGuatemala,
} from './guatemala-time';

describe('guatemala-time', () => {
  // 2026-10-22 23:30:00 Guatemala is 2026-10-23 05:30:00 UTC
  const testDate = new Date('2026-10-23T05:30:00.000Z');

  it('computes start and end of day in Guatemala', () => {
    const range = getGuatemalaDayRange(testDate);
    // 2026-10-22 00:00:00 Guatemala = 2026-10-22 06:00:00 UTC
    expect(range.startUtc.toISOString()).toBe('2026-10-22T06:00:00.000Z');
    // 2026-10-23 00:00:00 Guatemala = 2026-10-23 06:00:00 UTC
    expect(range.endUtc.toISOString()).toBe('2026-10-23T06:00:00.000Z');
    expect(formatGuatemalaDate(testDate)).toBe('2026-10-22');
  });

  it('computes week range starting on Monday in Guatemala', () => {
    // 2026-10-22 is a Thursday. Monday of that week was 2026-10-19.
    const range = getGuatemalaWeekRange(testDate);
    expect(range.startUtc.toISOString()).toBe('2026-10-19T06:00:00.000Z');
    // Next Monday is 2026-10-26
    expect(range.endUtc.toISOString()).toBe('2026-10-26T06:00:00.000Z');
  });

  it('computes month range in Guatemala', () => {
    const range = getGuatemalaMonthRange(testDate);
    expect(range.startUtc.toISOString()).toBe('2026-10-01T06:00:00.000Z');
    expect(range.endUtc.toISOString()).toBe('2026-11-01T06:00:00.000Z');
  });

  it('computes year range in Guatemala', () => {
    const range = getGuatemalaYearRange(testDate);
    expect(range.startUtc.toISOString()).toBe('2026-01-01T06:00:00.000Z');
    expect(range.endUtc.toISOString()).toBe('2027-01-01T06:00:00.000Z');
  });

  it('parses date strings YYYY-MM-DD into inclusive Guatemala day range', () => {
    const range = parseDateRangeInGuatemala('2026-10-01', '2026-10-05');
    expect(range.startUtc.toISOString()).toBe('2026-10-01T06:00:00.000Z');
    // Covers through end of 2026-10-05 Guatemala (until 2026-10-06 06:00:00 UTC)
    expect(range.endUtc.toISOString()).toBe('2026-10-06T06:00:00.000Z');
  });

  it('rejects invalid or inverted date ranges', () => {
    expect(() => parseDateRangeInGuatemala('invalid', '2026-10-05')).toThrow();
    expect(() => parseDateRangeInGuatemala('2026-10-05', '2026-10-01')).toThrow();
  });
});
