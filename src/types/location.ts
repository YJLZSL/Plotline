export interface Location {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  posX: number;
  posY: number;
  color: string;
  icon: string;
  linkedEventId: string | null;
  characterIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocationLink {
  sourceId: string;
  targetId: string;
  label: string;
  sourceName: string;
  targetName: string;
}

export interface CreateLocationInput {
  workspaceId: string;
  name: string;
  description?: string;
  posX?: number;
  posY?: number;
  color?: string;
  icon?: string;
  linkedEventId?: string | null;
  characterIds?: string[];
}

export interface UpdateLocationInput {
  id: string;
  name?: string;
  description?: string;
  posX?: number;
  posY?: number;
  color?: string;
  icon?: string;
  linkedEventId?: string | null;
  characterIds?: string[];
}

export interface LinkLocationsInput {
  workspaceId: string;
  sourceId: string;
  targetId: string;
  label?: string;
}
