import { buildTree, type TreeNode } from './treeLayout';
import type { OutlineNode } from '@/types';

export interface RadialNode {
  id: string;
  title: string;
  type: OutlineNode['type'];
  status: OutlineNode['status'];
  depth: number;
  x: number;
  y: number;
  angle: number;
}

export interface RadialEdge {
  fromId: string;
  toId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface RadialLayout {
  nodes: RadialNode[];
  edges: RadialEdge[];
  width: number;
  height: number;
}

const RADIUS_STEP = 140;
const NODE_W = 128;
const NODE_H = 44;

function leafCount(node: TreeNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + leafCount(c), 0);
}

export function computeRadialTreeLayout(nodes: OutlineNode[]): RadialLayout {
  const roots = buildTree(nodes);
  const positioned: RadialNode[] = [];
  const edges: RadialEdge[] = [];

  const layout = (node: TreeNode, depth: number, startAngle: number, endAngle: number) => {
    const angle = (startAngle + endAngle) / 2;
    const radius = depth * RADIUS_STEP;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    positioned.push({
      id: node.id,
      title: node.title,
      type: node.type,
      status: node.status,
      depth,
      x,
      y,
      angle,
    });

    if (node.children.length > 0) {
      const totalLeaves = leafCount(node);
      let currentAngle = startAngle;
      for (const child of node.children) {
        const childLeaves = leafCount(child);
        const span = ((endAngle - startAngle) * childLeaves) / totalLeaves;
        layout(child, depth + 1, currentAngle, currentAngle + span);
        currentAngle += span;
      }
    }
  };

  if (roots.length === 1) {
    layout(roots[0]!, 0, 0, Math.PI * 2);
  } else {
    const totalLeaves = roots.reduce((sum, r) => sum + leafCount(r), 0);
    let currentAngle = 0;
    for (const root of roots) {
      const span = ((Math.PI * 2) * leafCount(root)) / totalLeaves;
      layout(root, 0, currentAngle, currentAngle + span);
      currentAngle += span;
    }
  }

  const map = new Map(positioned.map((p) => [p.id, p]));
  const addEdges = (node: TreeNode) => {
    const parent = map.get(node.id)!;
    for (const child of node.children) {
      const childPos = map.get(child.id)!;
      edges.push({
        fromId: node.id,
        toId: child.id,
        fromX: parent.x,
        fromY: parent.y,
        toX: childPos.x,
        toY: childPos.y,
      });
      addEdges(child);
    }
  };
  for (const root of roots) addEdges(root);

  if (positioned.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }
  const minX = Math.min(...positioned.map((p) => p.x)) - NODE_W / 2;
  const maxX = Math.max(...positioned.map((p) => p.x)) + NODE_W / 2;
  const minY = Math.min(...positioned.map((p) => p.y)) - NODE_H / 2;
  const maxY = Math.max(...positioned.map((p) => p.y)) + NODE_H / 2;
  return {
    nodes: positioned.map((p) => ({ ...p, x: p.x - minX, y: p.y - minY })),
    edges: edges.map((e) => ({
      ...e,
      fromX: e.fromX - minX,
      fromY: e.fromY - minY,
      toX: e.toX - minX,
      toY: e.toY - minY,
    })),
    width: maxX - minX,
    height: maxY - minY,
  };
}
