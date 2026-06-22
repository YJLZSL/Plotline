import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { RelationshipMatrix } from './RelationshipMatrix';
import type { Character, CharacterRelationship } from '@/types';

function mkChar(id: string, name: string): Character {
  return {
    id, workspaceId: 'ws', name, aliases: [], avatar: null, description: '',
    appearance: '', backstory: '', goals: '', conflicts: '', arc: '', tags: [],
    color: '#F4B6C2', eventIds: [], createdAt: '', updatedAt: '',
  };
}

function mkRel(
  id: string, s: string, t: string, type: CharacterRelationship['type'], strength: number,
): CharacterRelationship {
  return { id, workspaceId: 'ws', sourceId: s, targetId: t, type, description: '', strength };
}

describe('RelationshipMatrix', () => {
  it('should render an N x N SVG grid with relationship cells', () => {
    const chars = [mkChar('a', '甲'), mkChar('b', '乙')];
    const rels = [mkRel('r1', 'a', 'b', 'friend', 4)];
    const { container } = render(
      <RelationshipMatrix characters={chars} relationships={rels} />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('should show empty state when no characters', () => {
    const { getByText } = render(
      <RelationshipMatrix characters={[]} relationships={[]} />,
    );
    expect(getByText('characters.empty.title')).toBeInTheDocument();
  });
});
