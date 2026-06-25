import type { Event, EventConnection } from '@/types';

export interface TreeNode {
  id: string;
  event: Event;
  x: number;
  y: number;
  depth: number;
  parentIds: string[];
  childIds: string[];
  collapsed: boolean;
}

export interface TreeLayout {
  nodes: TreeNode[];
  nodeWidth: number;
  nodeHeight: number;
  gapX: number;
  gapY: number;
  totalWidth: number;
  totalHeight: number;
  connections: EventConnection[];
}

export const TREE_NODE_WIDTH = 192;
export const TREE_NODE_HEIGHT = 72;
export const TREE_GAP_X = 64;
export const TREE_GAP_Y = 24;

interface TreeBuildConfig {
  nodeWidth?: number;
  nodeHeight?: number;
  gapX?: number;
  gapY?: number;
}

export function buildEventTree(
  events: Event[],
  connections: EventConnection[],
  config: TreeBuildConfig = {},
): TreeLayout {
  const nodeWidth = config.nodeWidth ?? TREE_NODE_WIDTH;
  const nodeHeight = config.nodeHeight ?? TREE_NODE_HEIGHT;
  const gapX = config.gapX ?? TREE_GAP_X;
  const gapY = config.gapY ?? TREE_GAP_Y;

  const eventMap = new Map<string, Event>();
  for (const ev of events) eventMap.set(ev.id, ev);

  const parentIds = new Map<string, string[]>();
  const childIds = new Map<string, string[]>();
  for (const ev of events) {
    parentIds.set(ev.id, []);
    childIds.set(ev.id, []);
  }

  for (const conn of connections) {
    if (!eventMap.has(conn.sourceId) || !eventMap.has(conn.targetId)) continue;
    const parents = parentIds.get(conn.targetId) ?? [];
    if (!parents.includes(conn.sourceId)) parents.push(conn.sourceId);
    parentIds.set(conn.targetId, parents);

    const children = childIds.get(conn.sourceId) ?? [];
    if (!children.includes(conn.targetId)) children.push(conn.targetId);
    childIds.set(conn.sourceId, children);
  }

  // Roots: events with no incoming connections, sorted by sortOrder / date
  const roots = events
    .filter((ev) => (parentIds.get(ev.id)?.length ?? 0) === 0)
    .sort(compareEvents);

  const nodeMap = new Map<string, TreeNode>();
  const visited = new Set<string>();

  // Depth-first layout: assign y by accumulating subtree heights.
  let currentY = gapY;

  function place(eventId: string, depth: number) {
    if (visited.has(eventId)) return;
    visited.add(eventId);

    const ev = eventMap.get(eventId);
    if (!ev) return;

    const x = gapX + depth * (nodeWidth + gapX);
    const y = currentY;

    nodeMap.set(eventId, {
      id: eventId,
      event: ev,
      x,
      y,
      depth,
      parentIds: parentIds.get(eventId) ?? [],
      childIds: childIds.get(eventId) ?? [],
      collapsed: false,
    });

    const children = (childIds.get(eventId) ?? []).sort((a, b) =>
      compareEvents(eventMap.get(a)!, eventMap.get(b)!),
    );

    if (children.length === 0) {
      currentY += nodeHeight + gapY;
      return;
    }

    // Children are placed contiguously below the parent span
    const before = currentY;
    for (const cid of children) {
      place(cid, depth + 1);
    }

    // Center parent vertically over its children span
    const after = currentY - gapY;
    const node = nodeMap.get(eventId);
    if (node) {
      node.y = (before + after) / 2 - nodeHeight / 2;
    }
  }

  for (const root of roots) {
    place(root.id, 0);
  }

  // Include isolated events (no connections) as a fallback if not visited
  for (const ev of events) {
    if (!visited.has(ev.id)) {
      const x = gapX;
      const y = currentY;
      nodeMap.set(ev.id, {
        id: ev.id,
        event: ev,
        x,
        y,
        depth: 0,
        parentIds: [],
        childIds: [],
        collapsed: false,
      });
      currentY += nodeHeight + gapY;
    }
  }

  const nodes = Array.from(nodeMap.values()).sort((a, b) => a.y - b.y || a.x - b.x);
  const maxDepth = nodes.reduce((max, n) => Math.max(max, n.depth), 0);
  const totalWidth = gapX + (maxDepth + 1) * (nodeWidth + gapX);
  const totalHeight = currentY + gapY;

  return {
    nodes,
    nodeWidth,
    nodeHeight,
    gapX,
    gapY,
    totalWidth,
    totalHeight,
    connections,
  };
}

function compareEvents(a: Event, b: Event): number {
  if (a.dateType === 'absolute' && b.dateType === 'absolute' && a.dateValue && b.dateValue) {
    const ta = new Date(a.dateValue).getTime();
    const tb = new Date(b.dateValue).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.title.localeCompare(b.title, 'zh-CN');
}

export function toggleCollapsed(layout: TreeLayout, eventId: string): TreeLayout {
  const nodes = layout.nodes.map((n) =>
    n.id === eventId ? { ...n, collapsed: !n.collapsed } : n,
  );
  return { ...layout, nodes };
}

export function getVisibleNodes(layout: TreeLayout): TreeNode[] {
  const hidden = new Set<string>();
  for (const node of layout.nodes) {
    if (node.collapsed) {
      for (const cid of node.childIds) {
        collectDescendants(layout, cid, hidden);
      }
    }
  }
  return layout.nodes.filter((n) => !hidden.has(n.id));
}

function collectDescendants(layout: TreeLayout, eventId: string, out: Set<string>) {
  out.add(eventId);
  const node = layout.nodes.find((n) => n.id === eventId);
  if (!node) return;
  for (const cid of node.childIds) {
    collectDescendants(layout, cid, out);
  }
}
