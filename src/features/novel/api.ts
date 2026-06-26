import { invoke } from '@/lib/ipc';
import type {
  CreateNovelChapterInput,
  NovelChapter,
  ReorderNovelChaptersInput,
  UpdateNovelChapterInput,
} from '@/types';

export function listNovelChapters(workspaceId: string): Promise<NovelChapter[]> {
  return invoke<NovelChapter[]>('list_novel_chapters', { workspaceId });
}

export function createNovelChapter(input: CreateNovelChapterInput): Promise<NovelChapter> {
  return invoke<NovelChapter>('create_novel_chapter', { input });
}

export function updateNovelChapter(input: UpdateNovelChapterInput): Promise<NovelChapter> {
  return invoke<NovelChapter>('update_novel_chapter', { input });
}

export function deleteNovelChapter(id: string): Promise<void> {
  return invoke<void>('delete_novel_chapter', { id });
}

export function reorderNovelChapters(input: ReorderNovelChaptersInput): Promise<NovelChapter[]> {
  return invoke<NovelChapter[]>('reorder_novel_chapters', { input });
}
