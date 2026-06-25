import { describe, it, expect } from 'vitest';

import { buildEventTree, getVisibleNodes, toggleCollapsed } from './treeLayout';
import type { Event, EventConnection } from '@/types';

function mkEvent(
  id: string,
  title: string,
  order: number,
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
    characterIds: [],
    connectedEventIds: [],
    createdAt: '',
    updatedAt: '',
  };
}

function mkConn(sourceId: string, targetId: string): EventConnection {
  return {
    sourceId,
    targetId,
    sourceTitle: '',
    targetTitle: '',
    connectionType: 'causal',
  };
}

describe('buildEventTree', () => {
  it('should place roots at depth 0 and children at depth 1', () => {
    const events = [mkEvent('a', 'Root', 0), mkEvent('b', 'Child', 1)];
    const connections = [mkConn('a', 'b')];
    const layout = buildEventTree(events, connections);

    const root = layout.nodes.find((n) => n.id === 'a');
    const child = layout.nodes.find((n) => n.id === 'b');
    expect(root).toBeDefined();
    expect(child).toBeDefined();
    expect(root!.depth).toBe(0);
    expect(child!.depth).toBe(1);
    expect(child!.x).toBeGreaterThan(root!.x);
  });

  it('should center parent vertically over its children', () => {
    const events = [
      mkEvent('a', 'Root', 0),
      mkEvent('b', 'Child 1', 1),
      mkEvent('c', 'Child 2', 2),
    ];
    const connections = [mkConn('a', 'b'), mkConn('a', 'c')];
    const layout = buildEventTree(events, connections);

    const root = layout.nodes.find((n) => n.id === 'a')!;
    const child1 = layout.nodes.find((n) => n.id === 'b')!;
    const child2 = layout.nodes.find((n) => n.id === 'c')!;
    const midChildren = (child1.y + child2.y + layout.nodeHeight) / 2;
    expect(root.y + layout.nodeHeight / 2).toBeCloseTo(midChildren, 1);
  });

  it('should sort children by sortOrder', () => {
    const events = [
      mkEvent('a', 'Root', 0),
      mkEvent('b', 'Second', 2),
      mkEvent('c', 'First', 1),
    ];
    const connections = [mkConn('a', 'b'), mkConn('a', 'c')];
    const layout = buildEventTree(events, connections);

    const children = layout.nodes.filter((n) => n.depth === 1).sort((a, b) => a.y - b.y);
    expect(children.map((n) => n.id)).toEqual(['c', 'b']);
  });

  it('should include unconnected events as isolated roots', () => {
    const events = [mkEvent('a', 'Root', 0), mkEvent('b', 'Orphan', 1)];
    const layout = buildEventTree(events, []);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.nodes.every((n) => n.depth === 0)).toBe(true);
  });

  it('should sort absolute events by date', () => {
    const events = [
      mkEvent('b', 'Later', 1, 'absolute', '2024-03-01'),
      mkEvent('a', 'Earlier', 0, 'absolute', '2024-01-01'),
    ];
    const layout = buildEventTree(events, []);
    const sorted = [...layout.nodes].sort((a, b) => a.y - b.y);
    expect(sorted.map((n) => n.id)).toEqual(['a', 'b']);
  });
});

describe('toggleCollapsed', () => {
  it('should toggle collapsed flag on a node', () => {
    const events = [mkEvent('a', 'Root', 0), mkEvent('b', 'Child', 1)];
    const layout = buildEventTree(events, [mkConn('a', 'b')]);
    const toggled = toggleCollapsed(layout, 'a');
    expect(toggled.nodes.find((n) => n.id === 'a')!.collapsed).toBe(true);
  });
});

describe('getVisibleNodes', () => {
  it('should hide descendants of collapsed nodes', () => {
    const events = [
      mkEvent('a', 'Root', 0),
      mkEvent('b', 'Child', 1),
      mkEvent('c', 'Grandchild', 2),
    ];
    const connections = [mkConn('a', 'b'), mkConn('b', 'c')];
    const layout = buildEventTree(events, connections);
    const collapsed = toggleCollapsed(layout, 'b');
    const visible = getVisibleNodes(collapsed);
    expect(visible.map((n) => n.id).sort()).toEqual(['a', 'b']);
  });
});
