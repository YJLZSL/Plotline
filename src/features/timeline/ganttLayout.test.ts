import { describe, it, expect } from 'vitest';
import { computeGanttLayout } from './ganttLayout';
import type { Event, Track } from '@/types';

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

function mkEvent(id: string, trackId: string, title: string, date: string, order: number): Event {
  return {
    id,
    workspaceId: 'ws',
    trackId,
    title,
    description: '',
    dateType: 'absolute',
    dateValue: date,
    sortOrder: order,
    status: 'draft',
    color: null,
    characterIds: [],
    connectedEventIds: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('computeGanttLayout', () => {
  it('should return empty bars when no events', () => {
    const layout = computeGanttLayout([mkTrack('t1', '主线', 0)], []);
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
    const layout = computeGanttLayout(tracks, events);
    expect(layout.bars).toHaveLength(2);
    expect(layout.bars[0]!.row).toBe(0);
    expect(layout.bars[1]!.row).toBe(1);
  });

  it('should sort events by dateValue ascending', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [
      mkEvent('e2', 't1', '晚', '2024-05-01', 1),
      mkEvent('e1', 't1', '早', '2024-01-01', 0),
    ];
    const layout = computeGanttLayout(tracks, events);
    expect(layout.bars[0]!.eventId).toBe('e1');
    expect(layout.bars[1]!.eventId).toBe('e2');
    expect(layout.bars[0]!.x).toBeLessThan(layout.bars[1]!.x);
  });

  it('should fall back to sortOrder when dateValue empty', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [
      mkEvent('e2', 't1', '第二', '', 5),
      mkEvent('e1', 't1', '第一', '', 1),
    ];
    const layout = computeGanttLayout(tracks, events);
    expect(layout.bars[0]!.eventId).toBe('e1');
    expect(layout.bars[1]!.eventId).toBe('e2');
  });

  it('should skip events on hidden tracks', () => {
    const tracks = [mkTrack('t1', '主线', 0, true), mkTrack('t2', '隐藏线', 1, false)];
    const events = [
      mkEvent('e1', 't1', '可见', '2024-01-01', 0),
      mkEvent('e2', 't2', '不可见', '2024-01-02', 0),
    ];
    const layout = computeGanttLayout(tracks, events);
    expect(layout.bars).toHaveLength(1);
    expect(layout.rowCount).toBe(1);
  });

  it('should use track color as bar fallback color', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [mkEvent('e1', 't1', '事件', '2024-01-01', 0)];
    const layout = computeGanttLayout(tracks, events);
    expect(layout.bars[0]!.color).toBe('#F4B6C2');
  });

  it('should generate tick labels with date or sequence index', () => {
    const tracks = [mkTrack('t1', '主线', 0)];
    const events = [
      mkEvent('e1', 't1', '有日期', '2024-01-01', 0),
      mkEvent('e2', 't1', '无日期', '', 1),
    ];
    const layout = computeGanttLayout(tracks, events);
    expect(layout.tickLabels[0]!.label).toBe('2024-01-01');
    expect(layout.tickLabels[1]!.label).toBe('#2');
  });
});
