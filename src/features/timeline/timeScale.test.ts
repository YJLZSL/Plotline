import { describe, expect, it } from 'vitest';

import { createTimeScale } from './timeScale';

const LEFT = 24;
const UNIT_WIDTH = 100;

function ts(min: string, max: string, zoom: 'hour' | 'day' | 'month' | 'year') {
  return createTimeScale(new Date(min).getTime(), new Date(max).getTime(), zoom, LEFT, UNIT_WIDTH);
}

describe('createTimeScale', () => {
  it('should map hour zoom linearly', () => {
    const scale = ts('2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 'hour');
    expect(scale.timeToX(new Date('2024-01-01T00:00:00Z').getTime())).toBe(LEFT);
    expect(scale.timeToX(new Date('2024-01-01T06:00:00Z').getTime())).toBe(LEFT + 6 * UNIT_WIDTH);
    expect(scale.xToTime(LEFT + 6 * UNIT_WIDTH)).toBe(new Date('2024-01-01T06:00:00Z').getTime());
  });

  it('should map day zoom linearly', () => {
    const scale = ts('2024-01-01T00:00:00Z', '2024-01-10T00:00:00Z', 'day');
    expect(scale.timeToX(new Date('2024-01-01T00:00:00Z').getTime())).toBe(LEFT);
    // Jan 1 00:00 -> Jan 3 12:00 is 2.5 days
    expect(scale.timeToX(new Date('2024-01-03T12:00:00Z').getTime())).toBe(LEFT + 2.5 * UNIT_WIDTH);
    expect(scale.xToTime(LEFT + 2.5 * UNIT_WIDTH)).toBe(new Date('2024-01-03T12:00:00Z').getTime());
  });

  it('should use real calendar months instead of fixed 30 days', () => {
    const scale = ts('2024-01-01T00:00:00Z', '2024-04-01T00:00:00Z', 'month');
    // Jan 31 is 30/31 of the way through January
    const jan31 = scale.timeToX(new Date('2024-01-31T00:00:00Z').getTime());
    expect(jan31).toBeCloseTo(LEFT + (30 / 31) * UNIT_WIDTH, 6);

    // Feb 29 (leap year) is 1 + 28/29 months from Jan 1
    const feb29 = scale.timeToX(new Date('2024-02-29T00:00:00Z').getTime());
    expect(feb29).toBeCloseTo(LEFT + (1 + 28 / 29) * UNIT_WIDTH, 6);

    // Reverse mapping lands on Feb 29
    expect(scale.xToTime(LEFT + (1 + 28 / 29) * UNIT_WIDTH)).toBe(
      new Date('2024-02-29T00:00:00Z').getTime(),
    );
  });

  it('should use real calendar years instead of fixed 365 days', () => {
    const scale = ts('2024-01-01T00:00:00Z', '2025-01-01T00:00:00Z', 'year');
    // 2024 is a leap year (366 days). From Jan 1 to Jul 1 is 182 full days.
    const fullDays = 182;
    const jul1 = scale.timeToX(new Date('2024-07-01T00:00:00Z').getTime());
    expect(jul1).toBeCloseTo(LEFT + (fullDays / 366) * UNIT_WIDTH, 6);

    // Reverse mapping lands on Jan 1 of the next year
    expect(scale.xToTime(LEFT + UNIT_WIDTH)).toBe(new Date('2025-01-01T00:00:00Z').getTime());
  });

  it('should round-trip within rounding tolerance for month zoom', () => {
    const scale = ts('2024-01-01T00:00:00Z', '2024-12-31T00:00:00Z', 'month');
    const original = new Date('2024-06-15T00:00:00Z').getTime();
    const x = scale.timeToX(original);
    const back = scale.xToTime(x);
    // xToTime rounds to nearest day
    expect(new Date(back).toISOString().slice(0, 10)).toBe('2024-06-15');
  });

  it('should generate ticks aligned with real calendar boundaries', () => {
    const scale = ts('2024-01-15T00:00:00Z', '2024-06-15T00:00:00Z', 'month');
    const { major, minor } = scale.getTicks();
    // Major ticks every 3 months: Apr 1 is the first major within range
    expect(major.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(['2024-04-01']);
    // Minor ticks every month between majors
    expect(minor.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2024-02-01',
      '2024-03-01',
      '2024-05-01',
      '2024-06-01',
    ]);
  });

  it('should generate year ticks without fixed 365-day approximation', () => {
    const scale = ts('2024-06-01T00:00:00Z', '2025-06-01T00:00:00Z', 'year');
    const { major, minor } = scale.getTicks();
    expect(major.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(['2025-01-01']);
    expect(minor.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual(['2024-07-01']);
  });
});
