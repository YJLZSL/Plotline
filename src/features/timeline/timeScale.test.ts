import { describe, expect, it } from 'vitest';

import {
  chooseTickLevel,
  createTimeScale,
  formatMajorTick,
  formatMinorTick,
  getMajorTickTimestamps,
  getMinorTickTimestamps,
  getTickInterval,
  type TickLevel,
} from './timeScale';

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

describe('chooseTickLevel', () => {
  it('should return hour when zoom is below day threshold', () => {
    expect(chooseTickLevel(15)).toBe('hour');
    expect(chooseTickLevel(50)).toBe('hour');
    expect(chooseTickLevel(72)).toBe('hour');
  });

  it('should return day when zoom is in day range', () => {
    expect(chooseTickLevel(73)).toBe('day');
    expect(chooseTickLevel(100)).toBe('day');
    expect(chooseTickLevel(111)).toBe('day');
  });

  it('should return week when zoom is in week range', () => {
    expect(chooseTickLevel(112)).toBe('week');
    expect(chooseTickLevel(130)).toBe('week');
    expect(chooseTickLevel(139)).toBe('week');
  });

  it('should return month when zoom is in month range', () => {
    expect(chooseTickLevel(140)).toBe('month');
    expect(chooseTickLevel(160)).toBe('month');
    expect(chooseTickLevel(174)).toBe('month');
  });

  it('should return quarter when zoom is in quarter range', () => {
    expect(chooseTickLevel(175)).toBe('quarter');
    expect(chooseTickLevel(200)).toBe('quarter');
    expect(chooseTickLevel(219)).toBe('quarter');
  });

  it('should return year when zoom is at or above year threshold', () => {
    expect(chooseTickLevel(220)).toBe('year');
    expect(chooseTickLevel(300)).toBe('year');
    expect(chooseTickLevel(800)).toBe('year');
  });

  it('should return hour for invalid or non-positive zoom', () => {
    expect(chooseTickLevel(0)).toBe('hour');
    expect(chooseTickLevel(-5)).toBe('hour');
    expect(chooseTickLevel(Number.NaN)).toBe('hour');
    expect(chooseTickLevel(Number.POSITIVE_INFINITY)).toBe('year');
  });
});

describe('formatMajorTick', () => {
  it('should format year tick as 4-digit year', () => {
    expect(formatMajorTick(new Date(Date.UTC(2027, 0, 1)), 'year')).toBe('2027');
  });

  it('should format quarter tick as year + quarter', () => {
    expect(formatMajorTick(new Date(Date.UTC(2027, 9, 1)), 'quarter')).toBe('2027 Q4');
    expect(formatMajorTick(new Date(Date.UTC(2027, 0, 1)), 'quarter')).toBe('2027 Q1');
  });

  it('should format month tick as YYYY-MM', () => {
    expect(formatMajorTick(new Date(Date.UTC(2027, 11, 1)), 'month')).toBe('2027-12');
  });

  it('should format week tick as ISO week', () => {
    // 2027-12-01 is a Wednesday in ISO week 48
    expect(formatMajorTick(new Date(Date.UTC(2027, 11, 1)), 'week')).toBe('2027-W48');
  });

  it('should format day tick as MM-DD', () => {
    expect(formatMajorTick(new Date(Date.UTC(2027, 11, 3)), 'day')).toBe('12-03');
  });

  it('should format hour tick as HH:00', () => {
    expect(formatMajorTick(new Date(Date.UTC(2027, 11, 3, 14)), 'hour')).toBe('14:00');
  });
});

describe('formatMinorTick', () => {
  it('should format minor tick at year level as quarter', () => {
    expect(formatMinorTick(new Date(Date.UTC(2027, 5, 1)), 'year')).toBe('Q2');
  });

  it('should format minor tick at quarter level as month number', () => {
    expect(formatMinorTick(new Date(Date.UTC(2027, 4, 1)), 'quarter')).toBe('5');
  });

  it('should format minor tick at month level as day number', () => {
    expect(formatMinorTick(new Date(Date.UTC(2027, 11, 15)), 'month')).toBe('15');
  });

  it('should format minor tick at day level as HH:00', () => {
    expect(formatMinorTick(new Date(Date.UTC(2027, 11, 3, 9)), 'day')).toBe('09:00');
  });
});

describe('getTickInterval', () => {
  it('should return 1 year for year level', () => {
    expect(getTickInterval('year')).toEqual({ unit: 'year', value: 1 });
  });

  it('should return 3 months for quarter level', () => {
    expect(getTickInterval('quarter')).toEqual({ unit: 'month', value: 3 });
  });

  it('should return 1 month for month level', () => {
    expect(getTickInterval('month')).toEqual({ unit: 'month', value: 1 });
  });

  it('should return 7 days for week level', () => {
    expect(getTickInterval('week')).toEqual({ unit: 'day', value: 7 });
  });

  it('should return 1 day for day level', () => {
    expect(getTickInterval('day')).toEqual({ unit: 'day', value: 1 });
  });

  it('should return 1 hour for hour level', () => {
    expect(getTickInterval('hour')).toEqual({ unit: 'hour', value: 1 });
  });
});

describe('getMajorTickTimestamps', () => {
  it('should generate year ticks aligned to Jan 1', () => {
    const min = new Date('2024-06-01T00:00:00Z').getTime();
    const max = new Date('2027-06-01T00:00:00Z').getTime();
    const ticks = getMajorTickTimestamps(min, max, 'year');
    expect(ticks.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2025-01-01',
      '2026-01-01',
      '2027-01-01',
    ]);
  });

  it('should generate quarter ticks aligned to quarter start', () => {
    const min = new Date('2024-01-15T00:00:00Z').getTime();
    const max = new Date('2024-12-15T00:00:00Z').getTime();
    const ticks = getMajorTickTimestamps(min, max, 'quarter');
    expect(ticks.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2024-04-01',
      '2024-07-01',
      '2024-10-01',
    ]);
  });

  it('should generate month ticks aligned to 1st of each month', () => {
    const min = new Date('2024-01-15T00:00:00Z').getTime();
    const max = new Date('2024-04-15T00:00:00Z').getTime();
    const ticks = getMajorTickTimestamps(min, max, 'month');
    expect(ticks.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2024-02-01',
      '2024-03-01',
      '2024-04-01',
    ]);
  });

  it('should generate day ticks aligned to UTC midnight', () => {
    const min = new Date('2024-01-01T12:00:00Z').getTime();
    const max = new Date('2024-01-04T06:00:00Z').getTime();
    const ticks = getMajorTickTimestamps(min, max, 'day');
    expect(ticks.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
    ]);
  });

  it('should generate hour ticks aligned to top of hour', () => {
    const min = new Date('2024-01-01T08:30:00Z').getTime();
    const max = new Date('2024-01-01T12:00:00Z').getTime();
    const ticks = getMajorTickTimestamps(min, max, 'hour');
    expect(ticks.length).toBe(4); // 09:00, 10:00, 11:00, 12:00
    expect(new Date(ticks[0]!).toISOString()).toBe('2024-01-01T09:00:00.000Z');
    expect(new Date(ticks[3]!).toISOString()).toBe('2024-01-01T12:00:00.000Z');
  });
});

describe('getMinorTickTimestamps', () => {
  it('should generate quarter minor ticks when level is year', () => {
    const min = new Date('2024-01-01T00:00:00Z').getTime();
    const max = new Date('2024-12-31T00:00:00Z').getTime();
    const minors = getMinorTickTimestamps(min, max, 'year');
    // Year major at 2024-01-01; minors at Q2/Q3/Q4 (Apr/Jul/Oct 1)
    expect(minors.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2024-04-01',
      '2024-07-01',
      '2024-10-01',
    ]);
  });

  it('should generate month minor ticks when level is quarter', () => {
    const min = new Date('2024-01-01T00:00:00Z').getTime();
    const max = new Date('2024-03-31T00:00:00Z').getTime();
    const minors = getMinorTickTimestamps(min, max, 'quarter');
    // Quarter major at Jan 1; minors at Feb 1, Mar 1
    expect(minors.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2024-02-01',
      '2024-03-01',
    ]);
  });

  it('should generate day minor ticks when level is week', () => {
    const min = new Date('2024-01-01T00:00:00Z').getTime();
    const max = new Date('2024-01-08T00:00:00Z').getTime();
    const minors = getMinorTickTimestamps(min, max, 'week');
    // Week major at 2024-01-01 (Monday); minors at Jan 2-8
    expect(minors.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05',
      '2024-01-06',
      '2024-01-07',
    ]);
  });

  it('should generate hour minor ticks when level is day', () => {
    const min = new Date('2024-01-01T00:00:00Z').getTime();
    const max = new Date('2024-01-01T05:00:00Z').getTime();
    const minors = getMinorTickTimestamps(min, max, 'day');
    expect(minors.length).toBe(5); // 01:00, 02:00, 03:00, 04:00, 05:00
    expect(new Date(minors[0]!).toISOString()).toBe('2024-01-01T01:00:00.000Z');
  });

  it('should return empty array for hour level (no finer level)', () => {
    const min = new Date('2024-01-01T00:00:00Z').getTime();
    const max = new Date('2024-01-01T05:00:00Z').getTime();
    const minors = getMinorTickTimestamps(min, max, 'hour');
    expect(minors).toEqual([]);
  });
});

describe('chooseTickLevel integration with TickLevel thresholds', () => {
  const cases: Array<{ zoom: number; expected: TickLevel; label: string }> = [
    { zoom: 50, expected: 'hour', label: 'hour' },
    { zoom: 90, expected: 'day', label: 'day' },
    { zoom: 130, expected: 'week', label: 'week' },
    { zoom: 150, expected: 'month', label: 'month' },
    { zoom: 200, expected: 'quarter', label: 'quarter' },
    { zoom: 250, expected: 'year', label: 'year' },
  ];
  for (const c of cases) {
    it(`should select ${c.label} at zoom=${c.zoom}`, () => {
      expect(chooseTickLevel(c.zoom)).toBe(c.expected);
    });
  }
});
