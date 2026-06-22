export interface Track {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
}

export interface CreateTrackInput {
  workspaceId: string;
  name: string;
  color?: string;
}

export interface UpdateTrackInput {
  id: string;
  name?: string;
  color?: string;
  isVisible?: boolean;
}

export interface ReorderTracksInput {
  workspaceId: string;
  orderedIds: string[];
}
