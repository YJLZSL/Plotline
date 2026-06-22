import { describe, it, expect } from 'vitest';
import { computePlotDensity, computeCharacterArcs } from './advancedStats';
import type { Character, Event } from '@/types';

function mkEvent(
  id: string,
  title: string,
  date: string,
  order: number,
  charIds: string[] = [],
): Event {
  return {
    id,
    workspaceId: 'ws',
    trackId: 't1',
    title,
    description: '',
    dateType: 'absolute',
    dateValue: date,
    sortOrder: order,
    status: 'draft',
    color: null,
    characterIds: charIds,
    connectedEventIds: [],
    createdAt: '',
    updatedAt: '',
  };
}

function mkChar(id: string, name: string, eventIds: string[], arc = ''): Character {
  return {
    id,
    workspaceId: 'ws',
    name,
    aliases: [],
    avatar: null,
    description: '',
    appearance: '',
    backstory: '',
    goals: '',
    conflicts: '',
    arc,
    tags: [],
    color: '#F4B6C2',
    eventIds,
    createdAt: '',
    updatedAt: '',
  };
}

describe('computePlotDensity', () => {
  it('should return empty for no events', () => {
    const d = computePlotDensity([]);
    expect(d.buckets).toHaveLength(0);
    expect(d.totalEvents).toBe(0);
  });

  it('should bucket events into at most bucketCount segments', () => {
    const events = Array.from({ length: 20 }, (_, i) => mkEvent(`e${i}`, `t${i}`, '', i));
    const d = computePlotDensity(events, 8);
    expect(d.buckets.length).toBeLessThanOrEqual(8);
    expect(d.totalEvents).toBe(20);
  });

  it('should compute peak and average counts', () => {
    const events = Array.from({ length: 20 }, (_, i) => mkEvent(`e${i}`, `t${i}`, '', i));
    const d = computePlotDensity(events, 4);
    expect(d.peakCount).toBeGreaterThanOrEqual(5);
    expect(d.avgCount).toBeCloseTo(5, 1);
  });
});

describe('computeCharacterArcs', () => {
  it('should map each character to their appearances in sequence order', () => {
    const events = [
      mkEvent('e1', '开篇', '2024-01-01', 0, ['c1']),
      mkEvent('e2', '发展', '2024-02-01', 1, ['c1', 'c2']),
      mkEvent('e3', '结局', '2024-03-01', 2, ['c2']),
    ];
    const chars = [
      mkChar('c1', '主角', ['e1', 'e2'], '成长弧线'),
      mkChar('c2', '反派', ['e2', 'e3']),
    ];
    const arcs = computeCharacterArcs(events, chars);
    expect(arcs).toHaveLength(2);
    const c1 = arcs.find((a) => a.characterId === 'c1')!;
    expect(c1.appearances).toHaveLength(2);
    expect(c1.appearances[0]!.eventTitle).toBe('开篇');
    expect(c1.appearances[1]!.eventTitle).toBe('发展');
    expect(c1.arc).toBe('成长弧线');
  });

  it('should return empty appearances for character with no events', () => {
    const arcs = computeCharacterArcs([mkEvent('e1', 'x', '', 0)], [mkChar('c1', '孤独', [])]);
    expect(arcs[0]!.appearances).toHaveLength(0);
  });

  it('should ignore eventIds that no longer exist', () => {
    const events = [mkEvent('e1', '开篇', '', 0, ['c1'])];
    const chars = [mkChar('c1', '主角', ['e1', 'ghost'])];
    const arcs = computeCharacterArcs(events, chars);
    expect(arcs[0]!.appearances).toHaveLength(1);
  });
});
