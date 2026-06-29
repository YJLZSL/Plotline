import { describe, it, expect } from 'vitest';
import type { Event, Track } from '@/types';
import {
  createTimelineGrid,
  computeTimelineLayout,
  computeRelativeDurationUnits,
  getZoomLabel,
  adjustZoom,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_FACTOR,
  LEFT_PADDING,
  getXAtTime,
  getTimeAtX,
  getSnapTimeAtTime,
  getSnapTimeAtX,
  getSnapXAtTime,
  getSnapThreshold,
  type ViewportState,
} from './timelineGrid';
import { getSnapInterval } from './timeScale';

function makeEvent(overrides: Partial<Event> & { id: string; title: string; trackId: string }): Event {
  return {
    ...overrides,
    workspaceId: 'ws-1',
    description: '',
    dateType: overrides.dateType ?? 'absolute',
    dateValue: overrides.dateValue ?? '',
    sortOrder: overrides.sortOrder ?? 0,
    status: 'draft',
    color: null,
    locationId: null,
    imageUrls: [],
    characterIds: [],
    connectedEventIds: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function makeTrack(id: string): Track {
  return {
    id,
    workspaceId: 'ws-1',
    name: `Track ${id}`,
    color: '#F4B6C2',
    sortOrder: 0,
    isVisible: true,
    createdAt: '2024-01-01T00:00:00Z',
  };
}

const LAYOUT_OPTIONS = {
  eventHeight: 64,
  rowGap: 8,
  baseTop: 12,
  trackHeight: 92,
};

describe('getZoomLabel', () => {
  it('labels base zoom values with their corresponding level', () => {
    expect(getZoomLabel(60)).toBe('hour');
    expect(getZoomLabel(90)).toBe('day');
    expect(getZoomLabel(140)).toBe('month');
    expect(getZoomLabel(220)).toBe('year');
  });

  it('uses geometric mean thresholds between base values', () => {
    expect(getZoomLabel(50)).toBe('hour');
    expect(getZoomLabel(80)).toBe('day');
    expect(getZoomLabel(120)).toBe('month');
    expect(getZoomLabel(180)).toBe('year');
  });
});

describe('adjustZoom', () => {
  it('multiplies zoom by the fixed factor when zooming in', () => {
    expect(adjustZoom(100, 1)).toBeCloseTo(100 * ZOOM_FACTOR, 6);
  });

  it('divides zoom by the fixed factor when zooming out', () => {
    expect(adjustZoom(100, -1)).toBeCloseTo(100 / ZOOM_FACTOR, 6);
  });

  it('clamps zoom to the configured min and max', () => {
    expect(adjustZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
    expect(adjustZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
  });
});

describe('createTimelineGrid', () => {
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
  const maxTime = new Date('2024-12-31T00:00:00Z').getTime();

  it('exposes continuous zoom and approximate label', () => {
    const grid = createTimelineGrid(baseTime, maxTime, DEFAULT_ZOOM, 24);
    expect(grid.zoom).toBe(DEFAULT_ZOOM);
    expect(grid.zoomLabel).toBe('month');
    expect(grid.baseTime).toBe(baseTime);
  });

  it('clamps zoom to the legal range', () => {
    const grid = createTimelineGrid(baseTime, maxTime, 1, 24);
    expect(grid.zoom).toBe(MIN_ZOOM);
  });

  it('maps absolute times using the current zoom', () => {
    const grid = createTimelineGrid(baseTime, maxTime, 90, 24);
    const x0 = grid.timeToX(baseTime);
    const x1 = grid.timeToX(new Date('2024-01-02T00:00:00Z').getTime());
    expect(x0).toBe(24);
    expect(x1 - x0).toBeCloseTo(90, 6);
  });

  it('round-trips xToTime for absolute times', () => {
    const grid = createTimelineGrid(baseTime, maxTime, 90, 24);
    const original = new Date('2024-03-15T00:00:00Z').getTime();
    const x = grid.timeToX(original);
    expect(grid.xToTime(x)).toBe(original);
  });

  it('returns a TimeScale with the same mapping', () => {
    const grid = createTimelineGrid(baseTime, maxTime, 140, 24);
    const scale = grid.getTimeScale();
    expect(scale.timeToX(baseTime)).toBe(grid.timeToX(baseTime));
    expect(scale.zoom).toBe(grid.zoomLabel);
    expect(scale.getUnitWidth()).toBe(grid.zoom);
  });

  it('uses baseTime = 0 as the relative event origin', () => {
    const grid = createTimelineGrid(0, 365 * 24 * 3600 * 1000, 90, 24);
    expect(grid.baseTime).toBe(0);
    expect(grid.timeToX(0)).toBe(24);
  });
});

describe('computeRelativeDurationUnits', () => {
  it('decreases as zoom increases', () => {
    const small = createTimelineGrid(0, 1, 60, 0);
    const large = createTimelineGrid(0, 1, 220, 0);
    expect(computeRelativeDurationUnits(small, 200, 16)).toBeGreaterThan(
      computeRelativeDurationUnits(large, 200, 16),
    );
  });

  it('matches the old level-based values at base zooms', () => {
    expect(computeRelativeDurationUnits(createTimelineGrid(0, 1, 60, 0), 200, 16)).toBe(4);
    expect(computeRelativeDurationUnits(createTimelineGrid(0, 1, 90, 0), 200, 16)).toBe(3);
    expect(computeRelativeDurationUnits(createTimelineGrid(0, 1, 140, 0), 200, 16)).toBe(2);
    expect(computeRelativeDurationUnits(createTimelineGrid(0, 1, 220, 0), 200, 16)).toBe(2);
  });
});

describe('computeTimelineLayout', () => {
  const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
  const maxTime = new Date('2024-12-31T00:00:00Z').getTime();
  const grid = createTimelineGrid(baseTime, maxTime, 90, 24);
  const track = makeTrack('t1');

  it('places a single event at row 0 without vertical offset', () => {
    const ev = makeEvent({ id: 'e1', title: '唯一事件', trackId: 't1', dateValue: '2024-01-01' });
    const result = computeTimelineLayout([ev], [track], grid, LAYOUT_OPTIONS);

    const layout = result.layouts.get('e1');
    expect(layout).toBeDefined();
    expect(layout!.row).toBe(0);
    expect(layout!.y).toBe(LAYOUT_OPTIONS.baseTop);
    expect(result.trackHeights.get('t1')).toBe(LAYOUT_OPTIONS.trackHeight);
  });

  it('keeps two non-overlapping events on the same row', () => {
    const a = makeEvent({ id: 'a', title: 'A', trackId: 't1', dateValue: '2024-01-01' });
    const b = makeEvent({ id: 'b', title: 'B', trackId: 't1', dateValue: '2024-01-10' });
    const result = computeTimelineLayout([a, b], [track], grid, LAYOUT_OPTIONS);

    expect(result.layouts.get('a')!.row).toBe(0);
    expect(result.layouts.get('b')!.row).toBe(0);
    expect(result.trackHeights.get('t1')).toBe(LAYOUT_OPTIONS.trackHeight);
  });

  it('places two overlapping events on row 0 and row 1', () => {
    const a = makeEvent({ id: 'a', title: 'A', trackId: 't1', dateValue: '2024-01-01' });
    const b = makeEvent({ id: 'b', title: 'B', trackId: 't1', dateValue: '2024-01-02' });
    const result = computeTimelineLayout([a, b], [track], grid, LAYOUT_OPTIONS);

    expect(result.layouts.get('a')!.row).toBe(0);
    expect(result.layouts.get('b')!.row).toBe(1);
    expect(result.layouts.get('b')!.y).toBe(LAYOUT_OPTIONS.baseTop + LAYOUT_OPTIONS.eventHeight + LAYOUT_OPTIONS.rowGap);
    expect(result.trackHeights.get('t1')).toBeGreaterThan(LAYOUT_OPTIONS.trackHeight);
  });

  it('places three chained overlapping events on rows 0, 1 and 2', () => {
    const a = makeEvent({ id: 'a', title: 'A', trackId: 't1', dateValue: '2024-01-01' });
    const b = makeEvent({ id: 'b', title: 'B', trackId: 't1', dateValue: '2024-01-02' });
    const c = makeEvent({ id: 'c', title: 'C', trackId: 't1', dateValue: '2024-01-03' });
    const result = computeTimelineLayout([a, b, c], [track], grid, LAYOUT_OPTIONS);

    expect(result.layouts.get('a')!.row).toBe(0);
    expect(result.layouts.get('b')!.row).toBe(1);
    expect(result.layouts.get('c')!.row).toBe(2);
    const expectedHeight =
      LAYOUT_OPTIONS.baseTop * 2 +
      3 * LAYOUT_OPTIONS.eventHeight +
      2 * LAYOUT_OPTIONS.rowGap;
    expect(result.trackHeights.get('t1')).toBe(expectedHeight);
  });

  it('re-layouts remaining events compactly after filtering', () => {
    const a = makeEvent({ id: 'a', title: 'A', trackId: 't1', dateValue: '2024-01-01' });
    const b = makeEvent({ id: 'b', title: 'B', trackId: 't1', dateValue: '2024-01-02' });
    const c = makeEvent({ id: 'c', title: 'C', trackId: 't1', dateValue: '2024-01-10' });

    const full = computeTimelineLayout([a, b, c], [track], grid, LAYOUT_OPTIONS);
    expect(full.layouts.get('a')!.row).toBe(0);
    expect(full.layouts.get('b')!.row).toBe(1);
    expect(full.layouts.get('c')!.row).toBe(0);

    const filtered = computeTimelineLayout([a, c], [track], grid, LAYOUT_OPTIONS);
    expect(filtered.layouts.get('a')!.row).toBe(0);
    expect(filtered.layouts.get('c')!.row).toBe(0);
    expect(filtered.trackHeights.get('t1')).toBe(LAYOUT_OPTIONS.trackHeight);
  });

  it('places two adjacent relative events on the same row with default spacing', () => {
    const a = makeEvent({ id: 'a', title: 'A', trackId: 't1', dateType: 'relative', sortOrder: 0 });
    const b = makeEvent({ id: 'b', title: 'B', trackId: 't1', dateType: 'relative', sortOrder: 1 });
    const result = computeTimelineLayout([a, b], [track], grid, LAYOUT_OPTIONS);

    const layoutA = result.layouts.get('a')!;
    const layoutB = result.layouts.get('b')!;
    expect(layoutA.x).toBeLessThan(layoutB.x);
    expect(layoutA.row).toBe(0);
    expect(layoutB.row).toBe(0);
    expect(result.trackHeights.get('t1')).toBe(LAYOUT_OPTIONS.trackHeight);
  });

  it('stacks relative events when explicit spacing is too small', () => {
    const a = makeEvent({ id: 'a', title: 'A', trackId: 't1', dateType: 'relative', sortOrder: 0 });
    const b = makeEvent({ id: 'b', title: 'B', trackId: 't1', dateType: 'relative', sortOrder: 1 });
    const result = computeTimelineLayout([a, b], [track], grid, {
      ...LAYOUT_OPTIONS,
      relativeDurationUnits: 2,
    });

    expect(result.layouts.get('a')!.row).toBe(0);
    expect(result.layouts.get('b')!.row).toBe(1);
  });

  it('places relative events starting from baseTime when absolute events exist', () => {
    const absolute = makeEvent({ id: 'abs', title: 'Abs', trackId: 't1', dateValue: '2024-01-01' });
    const relative = makeEvent({ id: 'rel', title: 'Rel', trackId: 't1', dateType: 'relative', sortOrder: 0 });
    const result = computeTimelineLayout([absolute, relative], [track], grid, LAYOUT_OPTIONS);

    const absoluteX = result.layouts.get('abs')!.x;
    const relativeX = result.layouts.get('rel')!.x;
    expect(relativeX).toBe(absoluteX);
  });

  it('places relative events at left padding when there is no absolute event', () => {
    const noAbsoluteGrid = createTimelineGrid(0, 365 * 24 * 3600 * 1000, 90, 24);
    const a = makeEvent({ id: 'a', title: 'A', trackId: 't1', dateType: 'relative', sortOrder: 0 });
    const result = computeTimelineLayout([a], [track], noAbsoluteGrid, LAYOUT_OPTIONS);

    expect(result.layouts.get('a')!.x).toBe(noAbsoluteGrid.leftPadding);
  });

  it('computes relative duration units based on zoom value', () => {
    const hourGrid = createTimelineGrid(0, 1, 60, 0);
    const dayGrid = createTimelineGrid(0, 1, 90, 0);
    const monthGrid = createTimelineGrid(0, 1, 140, 0);
    const yearGrid = createTimelineGrid(0, 1, 220, 0);

    expect(computeRelativeDurationUnits(hourGrid, 200, 16)).toBe(4);
    expect(computeRelativeDurationUnits(dayGrid, 200, 16)).toBe(3);
    expect(computeRelativeDurationUnits(monthGrid, 200, 16)).toBe(2);
    expect(computeRelativeDurationUnits(yearGrid, 200, 16)).toBe(2);
  });
});

// ===== 单一坐标源：ViewportState / getXAtTime / getTimeAtX =====

function makeViewportState(
  startTime: number,
  endTime: number,
  zoom: number,
  overrides: Partial<ViewportState> = {},
): ViewportState {
  return {
    zoom,
    scrollLeft: 0,
    viewportWidth: 1024,
    timeRange: { startTime, endTime },
    leftPadding: LEFT_PADDING,
    ...overrides,
  };
}

describe('getXAtTime', () => {
  it('should return leftPadding when time equals startTime at hour zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    expect(getXAtTime(state, new Date(start))).toBe(LEFT_PADDING);
  });

  it('should map 6 hours after start to LEFT + 6*zoom at hour zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    const t = new Date('2024-01-01T06:00:00Z').getTime();
    expect(getXAtTime(state, t)).toBe(LEFT_PADDING + 6 * 60);
  });

  it('should map 2.5 days after start at day zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-10T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 90);
    const t = new Date('2024-01-03T12:00:00Z').getTime();
    expect(getXAtTime(state, t)).toBeCloseTo(LEFT_PADDING + 2.5 * 90, 6);
  });

  it('should use real calendar months at month zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-04-01T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 140);
    const jan31 = new Date('2024-01-31T00:00:00Z').getTime();
    expect(getXAtTime(state, jan31)).toBeCloseTo(LEFT_PADDING + (30 / 31) * 140, 6);
  });

  it('should use real calendar years at year zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2025-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 220);
    // 2024 is a leap year (366 days). Jan 1 -> Jul 1 = 182 days.
    const jul1 = new Date('2024-07-01T00:00:00Z').getTime();
    expect(getXAtTime(state, jul1)).toBeCloseTo(LEFT_PADDING + (182 / 366) * 220, 6);
  });

  it('should accept both Date and number inputs producing identical results', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    const t = new Date('2024-01-01T12:00:00Z');
    expect(getXAtTime(state, t)).toBe(getXAtTime(state, t.getTime()));
  });

  it('should be backward compatible with grid.timeToX for the same zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-12-31T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 90);
    const grid = createTimelineGrid(start, end, 90, LEFT_PADDING);
    const sample = new Date('2024-03-15T00:00:00Z').getTime();
    expect(getXAtTime(state, sample)).toBe(grid.timeToX(sample));
  });
});

describe('getTimeAtX', () => {
  it('should return null when viewport state is degenerate (zero viewportWidth)', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60, { viewportWidth: 0 });
    expect(getTimeAtX(state, LEFT_PADDING + 100)).toBeNull();
  });

  it('should return null when time range is degenerate', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, start, 60);
    expect(getTimeAtX(state, LEFT_PADDING + 100)).toBeNull();
  });

  it('should return null for NaN x input', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    expect(getTimeAtX(state, Number.NaN)).toBeNull();
  });

  it('should return the start Date at leftPadding for hour zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    const result = getTimeAtX(state, LEFT_PADDING);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(start);
  });

  it('should round-trip within 1px precision at hour zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    const original = new Date('2024-01-01T06:00:00Z').getTime();
    const x = getXAtTime(state, original);
    const back = getTimeAtX(state, x);
    expect(back).not.toBeNull();
    const roundTripX = getXAtTime(state, back!.getTime());
    expect(Math.abs(roundTripX - x)).toBeLessThanOrEqual(1);
  });

  it('should round-trip within 1px precision at day zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-10T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 90);
    const original = new Date('2024-01-03T12:00:00Z').getTime();
    const x = getXAtTime(state, original);
    const back = getTimeAtX(state, x);
    expect(back).not.toBeNull();
    const roundTripX = getXAtTime(state, back!.getTime());
    expect(Math.abs(roundTripX - x)).toBeLessThanOrEqual(1);
  });

  it('should round-trip within 1px precision at month zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-12-31T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 140);
    const original = new Date('2024-06-15T00:00:00Z').getTime();
    const x = getXAtTime(state, original);
    const back = getTimeAtX(state, x);
    expect(back).not.toBeNull();
    const roundTripX = getXAtTime(state, back!.getTime());
    expect(Math.abs(roundTripX - x)).toBeLessThanOrEqual(1);
  });

  it('should round-trip within 1px precision at year zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2025-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 220);
    const original = new Date('2024-07-01T00:00:00Z').getTime();
    const x = getXAtTime(state, original);
    const back = getTimeAtX(state, x);
    expect(back).not.toBeNull();
    const roundTripX = getXAtTime(state, back!.getTime());
    expect(Math.abs(roundTripX - x)).toBeLessThanOrEqual(1);
  });

  it('should be backward compatible with grid.xToTime for the same zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-10T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 90);
    const grid = createTimelineGrid(start, end, 90, LEFT_PADDING);
    const x = LEFT_PADDING + 2.5 * 90;
    const result = getTimeAtX(state, x);
    expect(result).not.toBeNull();
    expect(result!.getTime()).toBe(grid.xToTime(x));
  });
});

describe('ViewportState single source of truth', () => {
  it('should produce identical x for the same time regardless of scrollLeft', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const stateA = makeViewportState(start, end, 60, { scrollLeft: 0 });
    const stateB = makeViewportState(start, end, 60, { scrollLeft: 500 });
    const t = new Date('2024-01-01T12:00:00Z').getTime();
    // scrollLeft 是视口偏移，不影响 time→content-x 映射
    expect(getXAtTime(stateA, t)).toBe(getXAtTime(stateB, t));
  });

  it('should reflect zoom changes in the time→x mapping', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    // 使用同一 hour 级别内的两档 zoom，避免跨级别刻度切换
    const state30 = makeViewportState(start, end, 30);
    const state60 = makeViewportState(start, end, 60);
    const t = new Date('2024-01-01T06:00:00Z').getTime();
    const x30 = getXAtTime(state30, t);
    const x60 = getXAtTime(state60, t);
    // 双倍 zoom → 双倍像素间距
    expect(x60 - LEFT_PADDING).toBeCloseTo(2 * (x30 - LEFT_PADDING), 6);
  });
});

// ===== 吸附网格 =====

describe('getSnapInterval', () => {
  it('returns reasonable millisecond intervals for each tick level', () => {
    const HOUR_MS = 3600 * 1000;
    const DAY_MS = 24 * HOUR_MS;
    expect(getSnapInterval('hour')).toBe(HOUR_MS);
    expect(getSnapInterval('day')).toBe(DAY_MS);
    expect(getSnapInterval('week')).toBe(7 * DAY_MS);
    expect(getSnapInterval('month')).toBeCloseTo(30.4375 * DAY_MS, 6);
    expect(getSnapInterval('quarter')).toBeCloseTo(3 * 30.4375 * DAY_MS, 6);
    expect(getSnapInterval('year')).toBeCloseTo(365.25 * DAY_MS, 6);
  });
});

describe('getSnapTimeAtTime', () => {
  it('snaps to the nearest year boundary at year zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2025-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 220);
    const input = new Date('2024-03-01T00:00:00Z');
    const snapped = getSnapTimeAtTime(state, input);
    expect(snapped.getTime()).toBe(start);
  });

  it('snaps to the nearest month boundary at month zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-12-31T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 140);
    const input = new Date('2024-01-20T00:00:00Z');
    const snapped = getSnapTimeAtTime(state, input);
    expect(snapped.getTime()).toBe(new Date('2024-02-01T00:00:00Z').getTime());
  });

  it('snaps to the nearest day boundary at day zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-10T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 90);
    const input = new Date('2024-01-01T14:00:00Z');
    const snapped = getSnapTimeAtTime(state, input);
    expect(snapped.getTime()).toBe(new Date('2024-01-02T00:00:00Z').getTime());
  });

  it('snaps to the nearest hour boundary at hour zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    const input = new Date('2024-01-01T01:40:00Z');
    const snapped = getSnapTimeAtTime(state, input);
    expect(snapped.getTime()).toBe(new Date('2024-01-01T02:00:00Z').getTime());
  });

  it('returns the input time unchanged when viewport state is degenerate', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, start, 60);
    const input = new Date('2024-01-01T12:34:00Z');
    const snapped = getSnapTimeAtTime(state, input);
    expect(snapped.getTime()).toBe(input.getTime());
  });
});

describe('getSnapXAtTime', () => {
  it('maps snapped times back to the correct grid x within 1px at year zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2025-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 220);
    const input = new Date('2024-10-01T00:00:00Z');
    const snappedX = getSnapXAtTime(state, input);
    const expected = getXAtTime(state, getSnapTimeAtTime(state, input));
    expect(Math.abs(snappedX - expected)).toBeLessThanOrEqual(1);
  });

  it('maps snapped times back to the correct grid x within 1px at month zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-12-31T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 140);
    const input = new Date('2024-01-20T00:00:00Z');
    const snappedX = getSnapXAtTime(state, input);
    const expected = getXAtTime(state, getSnapTimeAtTime(state, input));
    expect(Math.abs(snappedX - expected)).toBeLessThanOrEqual(1);
  });

  it('round-trips snap x to time and back at month zoom for April boundary', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-12-31T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 140);
    const snapX = getXAtTime(state, new Date('2024-04-01T00:00:00Z'));
    const snapTime = getSnapTimeAtX(state, snapX);
    expect(snapTime).not.toBeNull();
    const roundTripX = getSnapXAtTime(state, snapTime!);
    expect(Math.abs(roundTripX - snapX)).toBeLessThanOrEqual(1);
  });

  it('maps snapped times back to the correct grid x within 1px at day zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-10T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 90);
    const input = new Date('2024-01-01T14:00:00Z');
    const snappedX = getSnapXAtTime(state, input);
    const expected = getXAtTime(state, getSnapTimeAtTime(state, input));
    expect(Math.abs(snappedX - expected)).toBeLessThanOrEqual(1);
  });

  it('maps snapped times back to the correct grid x within 1px at hour zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    const input = new Date('2024-01-01T01:40:00Z');
    const snappedX = getSnapXAtTime(state, input);
    const expected = getXAtTime(state, getSnapTimeAtTime(state, input));
    expect(Math.abs(snappedX - expected)).toBeLessThanOrEqual(1);
  });
});

describe('getSnapTimeAtX', () => {
  it('rounds x-derived time to the nearest grid line within 1px at year zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2025-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 220);
    const x = getXAtTime(state, new Date('2024-10-01T00:00:00Z'));
    const snapped = getSnapTimeAtX(state, x);
    expect(snapped).not.toBeNull();
    const expected = getSnapTimeAtTime(state, getTimeAtX(state, x)!.getTime());
    expect(snapped!.getTime()).toBe(expected.getTime());
  });

  it('rounds x-derived time to the nearest grid line within 1px at month zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-12-31T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 140);
    const x = getXAtTime(state, new Date('2024-01-20T00:00:00Z'));
    const snapped = getSnapTimeAtX(state, x);
    expect(snapped).not.toBeNull();
    const expected = getSnapTimeAtTime(state, getTimeAtX(state, x)!.getTime());
    expect(snapped!.getTime()).toBe(expected.getTime());
  });

  it('rounds x-derived time to the nearest grid line within 1px at day zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-10T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 90);
    const x = getXAtTime(state, new Date('2024-01-01T14:00:00Z'));
    const snapped = getSnapTimeAtX(state, x);
    expect(snapped).not.toBeNull();
    const expected = getSnapTimeAtTime(state, getTimeAtX(state, x)!.getTime());
    expect(snapped!.getTime()).toBe(expected.getTime());
  });

  it('rounds x-derived time to the nearest grid line within 1px at hour zoom', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2024-01-02T00:00:00Z').getTime();
    const state = makeViewportState(start, end, 60);
    const x = getXAtTime(state, new Date('2024-01-01T01:40:00Z'));
    const snapped = getSnapTimeAtX(state, x);
    expect(snapped).not.toBeNull();
    const expected = getSnapTimeAtTime(state, getTimeAtX(state, x)!.getTime());
    expect(snapped!.getTime()).toBe(expected.getTime());
  });

  it('returns null when viewport state is degenerate', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const state = makeViewportState(start, start, 60);
    expect(getSnapTimeAtX(state, LEFT_PADDING + 100)).toBeNull();
  });
});

describe('getSnapThreshold', () => {
  it('returns min(24px, gridCellWidth * 0.3) for each zoom level', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const end = new Date('2025-01-01T00:00:00Z').getTime();

    const hourState = makeViewportState(start, end, 60);
    expect(getSnapThreshold(hourState)).toBeCloseTo(Math.min(24, 60 * 0.3), 6);

    const dayState = makeViewportState(start, end, 90);
    expect(getSnapThreshold(dayState)).toBe(24);

    const monthState = makeViewportState(start, end, 140);
    expect(getSnapThreshold(monthState)).toBe(24);

    const yearState = makeViewportState(start, end, 220);
    expect(getSnapThreshold(yearState)).toBe(24);
  });
});
