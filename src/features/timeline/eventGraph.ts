import type { Event, EventConnection } from '@/types';

export type EventGraphEdgeType = 'causal' | 'foreshadow' | 'related';

export interface EventGraphEdge {
  /** 稳定 id：`sourceId→targetId`，重复边去重后仅保留第一条。 */
  id: string;
  sourceId: string;
  targetId: string;
  sourceTitle: string;
  targetTitle: string;
  connectionType: EventGraphEdgeType;
  /** 是否由旧版 `event.connectedEventIds` 迁移而来（无显式类型，默认"关联"）。 */
  migrated: boolean;
}

export interface EventGraphNode {
  id: string;
  event: Event;
  x: number;
  y: number;
  depth: number;
  lane: number;
  inDegree: number;
  outDegree: number;
  componentId: number;
}

export interface EventGraphStats {
  eventCount: number;
  edgeCount: number;
  isolatedCount: number;
  componentCount: number;
  migratedCount: number;
}

export interface EventGraphLayout {
  nodes: EventGraphNode[];
  edges: EventGraphEdge[];
  nodeWidth: number;
  nodeHeight: number;
  gapX: number;
  gapY: number;
  totalWidth: number;
  totalHeight: number;
  stats: EventGraphStats;
}

export const GRAPH_NODE_WIDTH = 208;
export const GRAPH_NODE_HEIGHT = 84;
export const GRAPH_GAP_X = 88;
export const GRAPH_GAP_Y = 28;

interface EventGraphConfig {
  nodeWidth?: number;
  nodeHeight?: number;
  gapX?: number;
  gapY?: number;
}

/**
 * 把旧时间轴数据（事件 + `event_connections` + `event.connectedEventIds`）构建为
 * 事件关系图布局。这是 v5.0 老用户迁移的唯一数据入口：
 * - `event.connectedEventIds`（v2/v3 导入或旧 bundle）自动成为 `related` 类型边；
 * - `event_connections` 保持原有 causal/foreshadow 类型；
 * - 缺失目标、自环与重复边会被安全过滤，**绝不改写原数据**。
 *
 * 布局为确定性分层布局（BFS 最长路径深度），不依赖物理模拟：
 * 根节点（入度为 0）在 x=0 列，按时间/sortOrder 排序；同层节点纵向排布。
 */
export function buildEventGraph(
  events: Event[],
  connections: EventConnection[],
  config: EventGraphConfig = {},
): EventGraphLayout {
  const nodeWidth = config.nodeWidth ?? GRAPH_NODE_WIDTH;
  const nodeHeight = config.nodeHeight ?? GRAPH_NODE_HEIGHT;
  const gapX = config.gapX ?? GRAPH_GAP_X;
  const gapY = config.gapY ?? GRAPH_GAP_Y;

  const eventMap = new Map<string, Event>();
  for (const ev of events) eventMap.set(ev.id, ev);

  const adjacency = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  for (const ev of events) {
    adjacency.set(ev.id, []);
    reverse.set(ev.id, []);
  }

  const edgeMap = new Map<string, EventGraphEdge>();
  let migratedCount = 0;

  const addEdge = (
    sourceId: string,
    targetId: string,
    connectionType: EventGraphEdgeType,
    migrated: boolean,
  ) => {
    if (!eventMap.has(sourceId) || !eventMap.has(targetId)) return;
    if (sourceId === targetId) return;
    const key = `${sourceId}→${targetId}`;
    if (edgeMap.has(key)) return;
    const source = eventMap.get(sourceId)!;
    const target = eventMap.get(targetId)!;
    edgeMap.set(key, {
      id: key,
      sourceId,
      targetId,
      sourceTitle: source.title,
      targetTitle: target.title,
      connectionType,
      migrated,
    });
    adjacency.get(sourceId)!.push(targetId);
    reverse.get(targetId)!.push(sourceId);
    if (migrated) migratedCount += 1;
  };

  // 1. 显式连线（新数据）优先，保留因果/伏笔类型。
  for (const conn of connections) {
    addEdge(conn.sourceId, conn.targetId, conn.connectionType, false);
  }

  // 2. 旧数据迁移：connectedEventIds 没有类型信息，统一标记为"关联"边。
  for (const ev of events) {
    for (const targetId of ev.connectedEventIds) {
      addEdge(ev.id, targetId, 'related', true);
    }
  }

  // 3. 分层：BFS 从入度为 0 的根出发；环/剩余组件追加到下一层。
  const depthMap = new Map<string, number>();
  const visited = new Set<string>();
  const roots = events
    .filter((ev) => (reverse.get(ev.id)?.length ?? 0) === 0)
    .sort(compareEvents);

  const queue: string[] = [];
  for (const root of roots) {
    depthMap.set(root.id, 0);
    queue.push(root.id);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const depth = depthMap.get(id) ?? 0;
    const children = (adjacency.get(id) ?? [])
      .slice()
      .sort((a, b) => compareEvents(eventMap.get(a)!, eventMap.get(b)!));
    for (const childId of children) {
      const candidate = depth + 1;
      if (!depthMap.has(childId) || depthMap.get(childId)! < candidate) {
        depthMap.set(childId, candidate);
      }
      if (!visited.has(childId)) queue.push(childId);
    }
  }

  // 环或孤立 SCC（全部节点都有入度）追加到当前最大深度之后。
  let nextDepth = 0;
  for (const n of events) nextDepth = Math.max(nextDepth, depthMap.get(n.id) ?? 0);
  const remaining = events
    .filter((ev) => !visited.has(ev.id))
    .sort(compareEvents);
  for (const ev of remaining) {
    depthMap.set(ev.id, nextDepth + 1);
    queue.push(ev.id);
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const depth = depthMap.get(id) ?? nextDepth + 1;
      nextDepth = Math.max(nextDepth, depth);
      for (const childId of (adjacency.get(id) ?? []).sort((a, b) =>
        compareEvents(eventMap.get(a)!, eventMap.get(b)!),
      )) {
        if (!visited.has(childId)) {
          depthMap.set(childId, Math.max(depthMap.get(childId) ?? 0, depth + 1));
          queue.push(childId);
        }
      }
    }
  }

  // 4. 同层按事件排序，分配 y。
  const lanes = new Map<number, Event[]>();
  for (const ev of events) {
    const depth = depthMap.get(ev.id) ?? 0;
    const list = lanes.get(depth) ?? [];
    list.push(ev);
    lanes.set(depth, list);
  }
  const depthKeys = Array.from(lanes.keys()).sort((a, b) => a - b);
  const nodeMap = new Map<string, EventGraphNode>();
  let maxLane = 0;
  for (const depth of depthKeys) {
    const layer = lanes.get(depth)!.sort(compareEvents);
    layer.forEach((ev, index) => {
      nodeMap.set(ev.id, {
        id: ev.id,
        event: ev,
        x: gapX + depth * (nodeWidth + gapX),
        y: gapY + index * (nodeHeight + gapY),
        depth,
        lane: index,
        inDegree: reverse.get(ev.id)?.length ?? 0,
        outDegree: adjacency.get(ev.id)?.length ?? 0,
        componentId: 0,
      });
      maxLane = Math.max(maxLane, index);
    });
  }

  // 5. 连通分量（无向）。
  const componentOf = assignComponents(events, adjacency);
  for (const node of nodeMap.values()) {
    node.componentId = componentOf.get(node.id) ?? 0;
  }

  const nodes = Array.from(nodeMap.values()).sort(
    (a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id),
  );
  const edges = Array.from(edgeMap.values()).sort((a, b) => {
    const sourceA = nodeMap.get(a.sourceId);
    const sourceB = nodeMap.get(b.sourceId);
    return (
      (sourceA?.x ?? 0) - (sourceB?.x ?? 0) ||
      (sourceA?.y ?? 0) - (sourceB?.y ?? 0) ||
      a.id.localeCompare(b.id)
    );
  });

  const maxDepth = depthKeys.length > 0 ? Math.max(...depthKeys) : 0;
  const totalWidth = gapX + (maxDepth + 1) * (nodeWidth + gapX);
  const totalHeight = gapY + (maxLane + 1) * (nodeHeight + gapY);
  const isolatedCount = nodes.filter((n) => n.inDegree === 0 && n.outDegree === 0).length;

  return {
    nodes,
    edges,
    nodeWidth,
    nodeHeight,
    gapX,
    gapY,
    totalWidth,
    totalHeight,
    stats: {
      eventCount: nodes.length,
      edgeCount: edges.length,
      isolatedCount,
      componentCount: new Set(componentOf.values()).size,
      migratedCount,
    },
  };
}

/** 比较事件顺序：绝对日期优先于日期，其次 sortOrder，最后标题。 */
export function compareEvents(a: Event, b: Event): number {
  if (a.dateType === 'absolute' && b.dateType === 'absolute' && a.dateValue && b.dateValue) {
    const ta = new Date(a.dateValue).getTime();
    const tb = new Date(b.dateValue).getTime();
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
  }
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.title.localeCompare(b.title, 'zh-CN');
}

function assignComponents(events: Event[], adjacency: Map<string, string[]>): Map<string, number> {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const ev of events) parent.set(ev.id, ev.id);
  for (const ev of events) {
    for (const next of adjacency.get(ev.id) ?? []) union(ev.id, next);
  }
  const componentIds = new Map<string, number>();
  const result = new Map<string, number>();
  for (const ev of events) {
    const root = find(ev.id);
    let id = componentIds.get(root);
    if (id === undefined) {
      id = componentIds.size;
      componentIds.set(root, id);
    }
    result.set(ev.id, id);
  }
  return result;
}
