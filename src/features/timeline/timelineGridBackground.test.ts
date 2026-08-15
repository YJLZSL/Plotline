import { describe, expect, it } from 'vitest';

import {
  buildTimelineGridBackground,
  toGridStops,
} from './timelineGridBackground';

describe('buildTimelineGridBackground', () => {
  it('should return none when totalWidth is invalid', () => {
    expect(buildTimelineGridBackground([{ x: 10 }], { totalWidth: 0 })).toBe('none');
    expect(buildTimelineGridBackground([{ x: 10 }], { totalWidth: Number.NaN })).toBe('none');
  });

  it('should align each stop to the same percentage position', () => {
    const result = buildTimelineGridBackground(
      [{ x: 0 }, { x: 50 }, { x: 100 }],
      { totalWidth: 200, leftPadding: 0 },
    );
    expect(result).toContain('transparent 0%');
    expect(result).toContain('transparent 25%');
    expect(result).toContain('transparent 50%');
  });

  it('should drop stops that are too close to avoid hairline duplication', () => {
    const result = buildTimelineGridBackground(
      [{ x: 10 }, { x: 10.4 }, { x: 40 }],
      { totalWidth: 100, leftPadding: 0 },
    );
    const matches = result.match(/var\(--border\)/g) ?? [];
    // 第一条 + 第三条，共两个颜色起始 stop。
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches.length).toBeLessThanOrEqual(4);
  });

  it('should filter stops before leftPadding', () => {
    const result = buildTimelineGridBackground(
      [{ x: 2 }, { x: 20 }],
      { totalWidth: 100, leftPadding: 10 },
    );
    expect(result).not.toContain('transparent 2%');
    expect(result).toContain('transparent 20%');
  });
});

describe('toGridStops', () => {
  it('should map timestamps through the single xAtTime source and filter invalid values', () => {
    const stops = toGridStops([0, 1, 2, 3], (time) => time * 10, 25);
    expect(stops.map((s) => s.x)).toEqual([0, 10, 20]);
  });

  it('should filter non-finite positions', () => {
    const stops = toGridStops([0, 1, 2], () => Number.NaN);
    expect(stops).toEqual([]);
  });
});
