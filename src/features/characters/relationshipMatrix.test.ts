import { describe, it, expect } from 'vitest';
import { buildRelationshipMatrix, RELATIONSHIP_LABELS } from './relationshipMatrix';
import type { Character, CharacterRelationship } from '@/types';

function mkChar(id: string, name: string): Character {
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
    arc: '',
    tags: [],
    color: '#F4B6C2',
    eventIds: [],
    createdAt: '',
    updatedAt: '',
  };
}

function mkRel(
  id: string,
  sourceId: string,
  targetId: string,
  type: CharacterRelationship['type'],
  strength: number,
): CharacterRelationship {
  return {
    id,
    workspaceId: 'ws',
    sourceId,
    targetId,
    type,
    description: '',
    strength,
  };
}

describe('buildRelationshipMatrix', () => {
  it('should produce an N x N matrix', () => {
    const chars = [mkChar('a', '甲'), mkChar('b', '乙'), mkChar('c', '丙')];
    const m = buildRelationshipMatrix(chars, []);
    expect(m.cells).toHaveLength(3);
    m.cells.forEach((row) => expect(row).toHaveLength(3));
  });

  it('should mark diagonal cells as non-relationship', () => {
    const chars = [mkChar('a', '甲'), mkChar('b', '乙')];
    const m = buildRelationshipMatrix(chars, []);
    expect(m.cells[0]![0]!.hasRelationship).toBe(false);
    expect(m.cells[1]![1]!.hasRelationship).toBe(false);
  });

  it('should place relationship at [source,target] cell', () => {
    const chars = [mkChar('a', '甲'), mkChar('b', '乙')];
    const rels = [mkRel('r1', 'a', 'b', 'friend', 3)];
    const m = buildRelationshipMatrix(chars, rels);
    expect(m.cells[0]![1]!.hasRelationship).toBe(true);
    expect(m.cells[0]![1]!.type).toBe('friend');
    expect(m.cells[1]![0]!.hasRelationship).toBe(false);
  });

  it('should count totals and track max strength', () => {
    const chars = [mkChar('a', '甲'), mkChar('b', '乙'), mkChar('c', '丙')];
    const rels = [
      mkRel('r1', 'a', 'b', 'friend', 2),
      mkRel('r2', 'b', 'c', 'enemy', 5),
    ];
    const m = buildRelationshipMatrix(chars, rels);
    expect(m.totals).toBe(2);
    expect(m.maxStrength).toBe(5);
  });

  it('should handle empty characters', () => {
    const m = buildRelationshipMatrix([], []);
    expect(m.cells).toHaveLength(0);
    expect(m.totals).toBe(0);
  });

  it('should expose stable relationship label set', () => {
    expect(RELATIONSHIP_LABELS.friend).toBe('友谊');
    expect(RELATIONSHIP_LABELS.enemy).toBe('敌对');
    expect(Object.keys(RELATIONSHIP_LABELS)).toHaveLength(6);
  });
});
