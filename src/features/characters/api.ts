import { invoke } from '@/lib/ipc';
import type {
  Character,
  CharacterRelationship,
  CreateCharacterInput,
  CreateRelationshipInput,
  UpdateCharacterInput,
  UpdateRelationshipInput,
} from '@/types';

export function listCharacters(workspaceId: string): Promise<Character[]> {
  return invoke<Character[]>('list_characters', { workspaceId });
}

export function getCharacter(id: string): Promise<Character> {
  return invoke<Character>('get_character', { id });
}

export function createCharacter(input: CreateCharacterInput): Promise<Character> {
  return invoke<Character>('create_character', { input });
}

export function updateCharacter(input: UpdateCharacterInput): Promise<Character> {
  return invoke<Character>('update_character', { input });
}

export function deleteCharacter(id: string): Promise<void> {
  return invoke<void>('delete_character', { id });
}

export function listRelationships(workspaceId: string): Promise<CharacterRelationship[]> {
  return invoke<CharacterRelationship[]>('list_relationships', { workspaceId });
}

export function createRelationship(input: CreateRelationshipInput): Promise<CharacterRelationship> {
  return invoke<CharacterRelationship>('create_relationship', { input });
}

export function updateRelationship(input: UpdateRelationshipInput): Promise<CharacterRelationship> {
  return invoke<CharacterRelationship>('update_relationship', { input });
}

export function deleteRelationship(id: string): Promise<void> {
  return invoke<void>('delete_relationship', { id });
}
