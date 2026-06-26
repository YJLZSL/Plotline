import { describe, it, expect } from 'vitest';

import { computeGanttLayout, GANTT_LABEL_WIDTH } from './ganttLayout';
import { createTimeScale } from './timeScale';
import type { Event, Track } from '@/types';

const LEFT = 24;
const UNIT_WIDTH = 100;

function mkScale(min = '2024-01-01T00:00:00Z', max = '2024-12-31T00:00:00Z', zoom = 'month' as const) {
  return createTimeScale(new Date(min).getTime(), new Date(max).getTime(), zoom, LEFT, UNIT_WIDTH);
}

function mkTrack(id: string, name: string, order: number, visible = true): Track {
  return {
    id,
    workspaceId: 'ws',
    name,
    color: '#F4B6C2',
    sortOrder: order,
    isVisible: visible,
    createdAt: '',
  };
}

function mkEvent(
  id: string,
  trackId: string,
  title: string,
  date: string,
  order: number,
  dateType: 'absolute' | 'relative' = 'absolute',
): Event {
  return {
    id,
    workspaceId: 'ws',
    trackId,
    title,
    description: '',
    dateType,
    dateValue: date,
    sortOrder: order,
    status: 'draft',
    color: null,
    locationId: null,
    imageUrls: [],
    characterIds: [],
    connectedEventIds: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('computeGanttLayout', () => {
  it('should return empty bars when no events', () => {
    const layout = computeGanttLayout([mkTrack('t1', '主线', 0)], [], mkScale());
    expect(layout.bars).toHaveLength(0);
    expect(layout.rowCount).toBe(1);
    expect(layout.rowLabels).toHaveLength(1);
  });

  it('should place each event in its track row', () => {
    const tracks = [mkTrack('t1', '主线', 0), mkTrack('t2', '支线', 1)];
    const events = [
      mkEvent('e1', 't1', '事件A', '2024-01-01', 0),
      mkEvent('e2', 't2', '事件B', '2024-02-01', 0),
    ];
    const layout = computeGanttLayout(tracks, events, mkScale());
    expect(layout.bars).toHaveLength(2);
    const e1 = layout.bars.find((b) => b.eventId === 'e1');
    const e2 = layout.bars.find((b) => b.eventId === 'e2');
    expect(e1?.row).toBe(0);
    expect(e2?.row).toBe(1);
  });

  it('should place absolute events by real calendar time', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [
      mkEvent('e2', 't1', '晚', '2024-05-01', 1),
      mkEvent('e1', 't1', '早', '2024-01-01', 0),
    ];
    const scale = mkScale('2024-01-01T00:00:00Z', '2024-06-01T00:00:00Z', 'month');
    const layout = computeGanttLayout(tracks, events, scale);
    const e1 = layout.bars.find((b) => b.eventId === 'e1')!;
    const e2 = layout.bars.find((b) => b.eventId === 'e2')!;
    expect(e1.x).toBeLessThan(e2.x);
    expect(e1.x).toBe(GANTT_LABEL_WIDTH + (scale.timeToX(new Date('2024-01-01').getTime()) - LEFT));
  });

  it('should place relative events in a left-side lane ordered by sortOrder', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [
      mkEvent('e2', 't1', '第二', '', 5, 'relative'),
      mkEvent('e1', 't1', '第一', '', 1, 'relative'),
    ];
    const layout = computeGanttLayout(tracks, events, mkScale());
    const e1 = layout.bars.find((b) => b.eventId === 'e1')!;
    const e2 = layout.bars.find((b) => b.eventId === 'e2')!;
    expect(e1.x).toBeLessThan(e2.x);
    expect(e1.x).toBe(GANTT_LABEL_WIDTH);
  });

  it('should skip events on hidden tracks', () => {
    const tracks = [mkTrack('t1', '主线', 0, true), mkTrack('t2', '隐藏线', 1, false)];
    const events = [
      mkEvent('e1', 't1', '可见', '2024-01-01', 0),
      mkEvent('e2', 't2', '不可见', '2024-01-02', 0),
    ];
    const layout = computeGanttLayout(tracks, events, mkScale());
    expect(layout.bars).toHaveLength(1);
    expect(layout.rowCount).toBe(1);
  });

  it('should use track color as bar fallback color', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [mkEvent('e1', 't1', '事件', '2024-01-01', 0)];
    const layout = computeGanttLayout(tracks, events, mkScale());
    expect(layout.bars[0]!.color).toBe('#F4B6C2');
  });

  it('should generate tick labels from real calendar ticks', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [mkEvent('e1', 't1', '有日期', '2024-01-01', 0)];
    const scale = mkScale('2024-01-01T00:00:00Z', '2024-06-01T00:00:00Z', 'month');
    const layout = computeGanttLayout(tracks, events, scale);
    expect(layout.tickLabels.length).toBeGreaterThan(0);
    expect(layout.tickLabels[0]!.x).toBeGreaterThanOrEqual(GANTT_LABEL_WIDTH);
  });
});
