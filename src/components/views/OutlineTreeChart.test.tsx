import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { OutlineTreeChart } from './OutlineTreeChart';
import type { OutlineNode } from '@/types';

function mkNode(
  id: string,
  type: OutlineNode['type'],
  title: string,
  parentId: string | null,
  order: number,
): OutlineNode {
  return {
    id, workspaceId: 'ws', type, title, content: '', parentId, sortOrder: order,
    eventId: null, status: 'draft', coverImage: null, createdAt: '', updatedAt: '',
  };
}

describe('OutlineTreeChart', () => {
  it('should render SVG nodes and edges for a simple tree', () => {
    const nodes = [
      mkNode('v1', 'volume', '卷一', null, 0),
      mkNode('c1', 'chapter', '章一', 'v1', 0),
    ];
    const { container } = render(
      <OutlineTreeChart nodes={nodes} selectedId={null} onSelect={() => {}} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });

  it('should show empty state when no nodes', () => {
    const { getByText } = render(
      <OutlineTreeChart nodes={[]} selectedId={null} onSelect={() => {}} />,
    );
    expect(getByText('outline.empty.title')).toBeInTheDocument();
  });
});
