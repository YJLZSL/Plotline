import type { OutlineNode } from '@/types';

export interface TreeNode extends OutlineNode {
  children: TreeNode[];
}

export interface PositionedNode {
  id: string;
  title: string;
  type: OutlineNode['type'];
  status: OutlineNode['status'];
  depth: number;
  x: number;
  y: number;
}

export interface TreeEdge {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface TreeLayout {
  nodes: PositionedNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
}

export const TREE_NODE_W = 168;
export const TREE_NODE_H = 44;
export const TREE_H_GAP = 72;
export const TREE_V_GAP = 20;

export function buildTree(nodes: OutlineNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const n of nodes) map.set(n.id, { ...n, children: [] });
  const roots: TreeNode[] = [];
  for (const n of nodes) {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const node of map.values()) {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return roots.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function computeTreeLayout(nodes: OutlineNode[]): TreeLayout {
  const roots = buildTree(nodes);
  const positioned: PositionedNode[] = [];
  const edges: TreeEdge[] = [];
  let leafCounter = 0;

  const layout = (node: TreeNode, depth: number): number => {
    const x = depth * (TREE_NODE_W + TREE_H_GAP);
    if (node.children.length === 0) {
      const y = leafCounter * (TREE_NODE_H + TREE_V_GAP);
      leafCounter += 1;
      positioned.push({
        id: node.id,
        title: node.title,
        type: node.type,
        status: node.status,
        depth,
        x,
        y,
      });
      return y;
    }
    const childYs = node.children.map((child) => layout(child, depth + 1));
    const centerY = (childYs[0]! + childYs[childYs.length - 1]!) / 2;
    positioned.push({
      id: node.id,
      title: node.title,
      type: node.type,
      status: node.status,
      depth,
      x,
      y: centerY,
    });
    for (const child of node.children) {
      const childPos = positioned.find((p) => p.id === child.id)!;
      edges.push({
        fromId: node.id,
        toId: child.id,
        fromX: x + TREE_NODE_W,
        fromY: centerY + TREE_NODE_H / 2,
        toX: childPos.x,
        toY: childPos.y + TREE_NODE_H / 2,
      });
    }
    return centerY;
  };

  for (const root of roots) {
    layout(root, 0);
    if (leafCounter > 0) {
      leafCounter += 1;
    }
  }

  if (positioned.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const maxX = Math.max(...positioned.map((p) => p.x)) + TREE_NODE_W;
  const maxY = Math.max(...positioned.map((p) => p.y)) + TREE_NODE_H;
  return { nodes: positioned, edges, width: maxX, height: maxY };
}
