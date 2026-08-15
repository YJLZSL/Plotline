import { describe, it, expect } from 'vitest';

import { buildEventGraph, compareEvents } from './eventGraph';
import type { Event, EventConnection } from '@/types';

function mkEvent(
  id: string,
  title: string,
  order: number,
  connected: string[] = [],
  dateType: 'absolute' | 'relative' = 'relative',
  dateValue = '',
): Event {
  return {
    id,
    workspaceId: 'ws',
    trackId: 't1',
    title,
    description: '',
    dateType,
    dateValue,
    sortOrder: order,
    status: 'draft',
    color: null,
    locationId: null,
    imageUrls: [],
    characterIds: [],
    connectedEventIds: connected,
    createdAt: '',
    updatedAt: '',
  };
}

function mkConn(sourceId: string, targetId: string, type: 'causal' | 'foreshadow' = 'causal'): EventConnection {
  return { sourceId, targetId, sourceTitle: '', targetTitle: '', connectionType: type };
}

describe('buildEventGraph', () => {
  it('should migrate legacy connectedEventIds into related edges without touching data', () => {
    const events = [mkEvent('a', '伏笔', 0, ['b']), mkEvent('b', '回收', 1)];
    const layout = buildEventGraph(events, []);

    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0]).toMatchObject({
      sourceId: 'a',
      targetId: 'b',
      connectionType: 'related',
      migrated: true,
    });
    expect(layout.stats.migratedCount).toBe(1);
    expect(events[0]!.connectedEventIds).toEqual(['b']);
  });

  it('should prefer explicit typed connections over legacy ids and dedupe', () => {
    const events = [mkEvent('a', 'A', 0, ['b']), mkEvent('b', 'B', 1)];
    const layout = buildEventGraph(events, [mkConn('a', 'b', 'foreshadow')]);

    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0]!.connectionType).toBe('foreshadow');
    expect(layout.stats.migratedCount).toBe(0);
  });

  it('should filter missing targets, self loops and duplicate edges', () => {
    const events = [mkEvent('a', 'A', 0, ['missing', 'a', 'b', 'b']), mkEvent('b', 'B', 1)];
    const layout = buildEventGraph(events, []);

    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0]!.targetId).toBe('b');
    expect(layout.stats.migratedCount).toBe(1);
  });

  it('should place sources at depth 0 and targets at depth 1', () => {
    const events = [mkEvent('a', 'A', 0), mkEvent('b', 'B', 1)];
    const layout = buildEventGraph(events, [mkConn('a', 'b')]);

    const a = layout.nodes.find((n) => n.id === 'a')!;
    const b = layout.nodes.find((n) => n.id === 'b')!;
    expect(a.depth).toBe(0);
    expect(b.depth).toBe(1);
    expect(b.x).toBeGreaterThan(a.x);
  });

  it('should assign longest-path depth for diamonds', () => {
    const events = [
      mkEvent('a', 'A', 0),
      mkEvent('b', 'B', 1),
      mkEvent('c', 'C', 2),
      mkEvent('d', 'D', 3),
    ];
    const layout = buildEventGraph(events, [
      mkConn('a', 'b'),
      mkConn('a', 'c'),
      mkConn('b', 'd'),
      mkConn('c', 'd'),
    ]);
    expect(layout.nodes.find((n) => n.id === 'd')!.depth).toBe(2);
  });

  it('should handle cycles without losing nodes', () => {
    const events = [mkEvent('a', 'A', 0), mkEvent('b', 'B', 1)];
    const layout = buildEventGraph(events, [mkConn('a', 'b'), mkConn('b', 'a')]);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.edges).toHaveLength(2);
  });

  it('should count isolated nodes and components', () => {
    const events = [
      mkEvent('a', 'A', 0),
      mkEvent('b', 'B', 1),
      mkEvent('c', 'C', 2),
      mkEvent('d', 'D', 3),
    ];
    const layout = buildEventGraph(events, [mkConn('a', 'b')]);

    expect(layout.stats.eventCount).toBe(4);
    expect(layout.stats.edgeCount).toBe(1);
    expect(layout.stats.isolatedCount).toBe(2);
    expect(layout.stats.componentCount).toBe(3);
  });

  it('should sort absolute events by date within a layer', () => {
    const events = [
      mkEvent('b', 'B', 1, [], 'absolute', '2024-03-01'),
      mkEvent('a', 'A', 0, [], 'absolute', '2024-01-01'),
    ];
    const layout = buildEventGraph(events, []);
    const ids = layout.nodes.map((n) => n.id);
    expect(ids).toEqual(['a', 'b']);
  });
});

describe('compareEvents', () => {
  it('should compare sortOrder then title', () => {
    expect(compareEvents(mkEvent('a', 'A', 0), mkEvent('b', 'B', 1))).toBeLessThan(0);
    expect(compareEvents(mkEvent('a', 'B', 0), mkEvent('b', 'A', 0))).toBeGreaterThan(0);
  });
});
