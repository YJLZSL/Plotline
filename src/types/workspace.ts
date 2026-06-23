export type WorkspaceTemplate = 'blank' | 'hero-journey' | 'three-act' | 'chronicle' | 'biography';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  template: WorkspaceTemplate;
  coverColor: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  template?: WorkspaceTemplate;
  coverColor?: string;
}

export interface UpdateWorkspaceInput {
  id: string;
  name?: string;
  description?: string;
  coverColor?: string;
  settings?: Record<string, unknown>;
}

export interface WorkspaceBundle {
  version: number;
  workspace: Workspace;
  tracks: Track[];
  events: Event[];
  characters: Character[];
  relationships: CharacterRelationship[];
  eventConnections: EventConnection[];
  outlineNodes: OutlineNode[];
  notes: Note[];
  locations: Location[];
  locationLinks: LocationLink[];
  vnScenes: VnScene[];
  vnLines: VnLine[];
}

import type { Track } from './track';
import type { Event, EventConnection } from './event';
import type { Character, CharacterRelationship } from './character';
import type { OutlineNode } from './outline';
import type { Note } from './note';
import type { Location, LocationLink } from './location';
import type { VnScene, VnLine } from './vn';
