export type RelationshipType =
  | 'family'
  | 'love'
  | 'enemy'
  | 'mentor'
  | 'friend'
  | 'rival';

export interface Character {
  id: string;
  workspaceId: string;
  name: string;
  aliases: string[];
  avatar: string | null;
  description: string;
  appearance: string;
  backstory: string;
  goals: string;
  conflicts: string;
  arc: string;
  tags: string[];
  color: string;
  eventIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCharacterInput {
  workspaceId: string;
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
}

export interface UpdateCharacterInput {
  id: string;
  name?: string;
  aliases?: string[];
  avatar?: string | null;
  description?: string;
  appearance?: string;
  backstory?: string;
  goals?: string;
  conflicts?: string;
  arc?: string;
  tags?: string[];
  color?: string;
}

export interface CharacterRelationship {
  id: string;
  workspaceId: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  description: string;
  strength: number;
}

export interface CreateRelationshipInput {
  workspaceId: string;
  sourceId: string;
  targetId: string;
  relationshipType?: RelationshipType;
  description?: string;
  strength?: number;
}

export interface UpdateRelationshipInput {
  id: string;
  relationshipType?: RelationshipType;
  description?: string;
  strength?: number;
}
