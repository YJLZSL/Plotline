import type { Note } from '@/types';

export interface LoreConflict {
  aId: string;
  bId: string;
  title: string;
  count: number;
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * 世界观冲突检测（v4.0 切片）：
 * 检测重复/几乎重复的设定条目标题——同名设定散落在不同分类中是最常见的设定冲突来源。
 */
export function detectLoreConflicts(notes: Note[]): LoreConflict[] {
  const byTitle = new Map<string, Note[]>();
  for (const note of notes) {
    const key = normalizeTitle(note.title);
    const group = byTitle.get(key) ?? [];
    group.push(note);
    byTitle.set(key, group);
  }

  const conflicts: LoreConflict[] = [];
  for (const [title, items] of byTitle.entries()) {
    if (items.length < 2) continue;
    conflicts.push({
      aId: items[0]!.id,
      bId: items[1]!.id,
      title,
      count: items.length,
    });
  }
  return conflicts.sort((a, b) => b.count - a.count);
}
