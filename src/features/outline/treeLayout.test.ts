import { describe, it, expect } from 'vitest';
import { buildTree, computeTreeLayout, TREE_NODE_W, TREE_NODE_H, TREE_H_GAP } from './treeLayout';
import type { OutlineNode } from '@/types';

function mkNode(
  id: string,
  type: OutlineNode['type'],
  title: string,
  parentId: string | null,
  order: number,
): OutlineNode {
  return {
    id,
    workspaceId: 'ws',
    type,
    title,
    content: '',
    parentId,
    sortOrder: order,
    eventId: null,
    status: 'draft',
    coverImage: null,
    createdAt: '',
    updatedAt: '',
  };
}

describe('buildTree', () => {
  it('should nest children under parents', () => {
    const nodes = [
      mkNode('v1', 'volume', '卷一', null, 0),
      mkNode('c1', 'chapter', '章一', 'v1', 0),
      mkNode('c2', 'chapter', '章二', 'v1', 1),
    ];
    const tree = buildTree(nodes);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe('v1');
    expect(tree[0]!.children).toHaveLength(2);
    expect(tree[0]!.children[0]!.id).toBe('c1');
  });

  it('should sort children by sortOrder', () => {
    const nodes = [
      mkNode('v1', 'volume', '卷一', null, 0),
      mkNode('c2', 'chapter', 'B', 'v1', 1),
      mkNode('c1', 'chapter', 'A', 'v1', 0),
    ];
    const tree = buildTree(nodes);
    expect(tree[0]!.children[0]!.id).toBe('c1');
    expect(tree[0]!.children[1]!.id).toBe('c2');
  });

  it('should treat missing parent as root', () => {
    const nodes = [mkNode('orphan', 'chapter', '孤儿', 'missing', 0)];
    const tree = buildTree(nodes);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe('orphan');
  });
});

describe('computeTreeLayout', () => {
  it('should return empty layout for no nodes', () => {
    const layout = computeTreeLayout([]);
    expect(layout.nodes).toHaveLength(0);
    expect(layout.edges).toHaveLength(0);
    expect(layout.width).toBe(0);
  });

  it('should assign increasing depth x positions', () => {
    const nodes = [
      mkNode('v1', 'volume', '卷一', null, 0),
      mkNode('c1', 'chapter', '章一', 'v1', 0),
      mkNode('s1', 'scene', '场景一', 'c1', 0),
    ];
    const layout = computeTreeLayout(nodes);
    const v = layout.nodes.find((n) => n.id === 'v1')!;
    const c = layout.nodes.find((n) => n.id === 'c1')!;
    const s = layout.nodes.find((n) => n.id === 's1')!;
    expect(v.depth).toBe(0);
    expect(c.depth).toBe(1);
    expect(s.depth).toBe(2);
    expect(c.x).toBe(v.x + TREE_NODE_W + TREE_H_GAP);
    expect(s.x).toBe(c.x + TREE_NODE_W + TREE_H_GAP);
  });

  it('should create edges only between parent and child', () => {
    const nodes = [
      mkNode('v1', 'volume', '卷一', null, 0),
      mkNode('c1', 'chapter', '章一', 'v1', 0),
    ];
    const layout = computeTreeLayout(nodes);
    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0]!.fromId).toBe('v1');
    expect(layout.edges[0]!.toId).toBe('c1');
  });

  it('should center parent vertically between its children', () => {
    const nodes = [
      mkNode('v1', 'volume', '卷一', null, 0),
      mkNode('c1', 'chapter', '章一', 'v1', 0),
      mkNode('c2', 'chapter', '章二', 'v1', 1),
    ];
    const layout = computeTreeLayout(nodes);
    const v = layout.nodes.find((n) => n.id === 'v1')!;
    const c1 = layout.nodes.find((n) => n.id === 'c1')!;
    const c2 = layout.nodes.find((n) => n.id === 'c2')!;
    expect(v.y + TREE_NODE_H / 2).toBeCloseTo((c1.y + c2.y) / 2 + TREE_NODE_H / 2, 0);
  });

  it('should compute width and height bounds', () => {
    const nodes = [
      mkNode('v1', 'volume', '卷一', null, 0),
      mkNode('c1', 'chapter', '章一', 'v1', 0),
    ];
    const layout = computeTreeLayout(nodes);
    expect(layout.width).toBeGreaterThanOrEqual(TREE_NODE_W * 2);
    expect(layout.height).toBeGreaterThanOrEqual(TREE_NODE_H);
  });
});
