export interface Note {
  id: string;
  workspaceId: string | null;
  folderId: string | null;
  title: string;
  content: string;
  tags: string[];
  isFolder: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  workspaceId?: string | null;
  folderId?: string | null;
  title: string;
  content?: string;
  tags?: string[];
  isFolder?: boolean;
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}
