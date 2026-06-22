export type OutlineNodeType = 'volume' | 'chapter' | 'scene' | 'event';
export type OutlineStatus = 'draft' | 'done' | 'revise';

export interface OutlineNode {
  id: string;
  workspaceId: string;
  type: OutlineNodeType;
  title: string;
  content: string;
  parentId: string | null;
  sortOrder: number;
  eventId: string | null;
  status: OutlineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOutlineNodeInput {
  workspaceId: string;
  type?: OutlineNodeType;
  title: string;
  content?: string;
  parentId?: string | null;
  eventId?: string | null;
}

export interface UpdateOutlineNodeInput {
  id: string;
  title?: string;
  content?: string;
  eventId?: string | null;
  status?: OutlineStatus;
}

export interface MoveOutlineNodeInput {
  id: string;
  parentId: string | null;
  sortOrder: number;
}
