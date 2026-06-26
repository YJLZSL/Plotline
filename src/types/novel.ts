export type NovelChapterStatus = 'draft' | 'done' | 'revise';

export interface NovelChapter {
  id: string;
  workspaceId: string;
  outlineNodeId: string | null;
  title: string;
  content: string;
  wordCount: number;
  status: NovelChapterStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNovelChapterInput {
  workspaceId: string;
  outlineNodeId?: string | null;
  title: string;
  content?: string;
  status?: NovelChapterStatus;
  sortOrder?: number;
}

export interface UpdateNovelChapterInput {
  id: string;
  outlineNodeId?: string | null;
  title?: string;
  content?: string;
  status?: NovelChapterStatus;
  sortOrder?: number;
}

export interface ReorderNovelChaptersInput {
  workspaceId: string;
  chapterIds: string[];
}
