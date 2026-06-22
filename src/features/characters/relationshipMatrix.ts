import type { Character, CharacterRelationship, RelationshipType } from '@/types';

export interface MatrixCell {
  rowId: string;
  colId: string;
  relationship: CharacterRelationship | null;
  hasRelationship: boolean;
  strength: number;
  type: RelationshipType | null;
}

export interface RelationshipMatrix {
  characters: Character[];
  cells: MatrixCell[][];
  totals: number;
  maxStrength: number;
}

export function buildRelationshipMatrix(
  characters: Character[],
  relationships: CharacterRelationship[],
): RelationshipMatrix {
  const byPair = new Map<string, CharacterRelationship>();
  for (const r of relationships) {
    byPair.set(pairKey(r.sourceId, r.targetId), r);
  }

  let totals = 0;
  let maxStrength = 0;
  const cells: MatrixCell[][] = characters.map((rowChar) =>
    characters.map((colChar) => {
      if (rowChar.id === colChar.id) {
        return {
          rowId: rowChar.id,
          colId: colChar.id,
          relationship: null,
          hasRelationship: false,
          strength: 0,
          type: null,
        };
      }
      const rel = byPair.get(pairKey(rowChar.id, colChar.id)) ?? null;
      if (rel) {
        totals += 1;
        maxStrength = Math.max(maxStrength, rel.strength);
      }
      return {
        rowId: rowChar.id,
        colId: colChar.id,
        relationship: rel,
        hasRelationship: rel !== null,
        strength: rel?.strength ?? 0,
        type: rel?.type ?? null,
      };
    }),
  );

  return { characters, cells, totals, maxStrength };
}

function pairKey(a: string, b: string): string {
  return `${a}|${b}`;
}

export const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  family: '#E07B7B',
  love: '#E0977B',
  enemy: '#A04040',
  mentor: '#7BA0E0',
  friend: '#7BE0A0',
  rival: '#E0C97B',
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  family: '亲情',
  love: '爱情',
  enemy: '敌对',
  mentor: '师徒',
  friend: '友谊',
  rival: '竞争',
};
