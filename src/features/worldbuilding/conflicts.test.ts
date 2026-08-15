import { describe, expect, it } from 'vitest';

import type { Note } from '@/types';
import { detectLoreConflicts } from './conflicts';

function makeNote(id: string, title: string): Note {
  return {
    id,
    workspaceId: 'ws-1',
    folderId: null,
    title,
    content: '',
    tags: ['world:history'],
    isFolder: false,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('detectLoreConflicts', () => {
  it('should detect exact duplicate titles across categories', () => {
    const conflicts = detectLoreConflicts([
      makeNote('a', '创世战争'),
      makeNote('b', '创世战争'),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.count).toBe(2);
    expect(conflicts[0]!.aId).toBe('a');
  });

  it('should normalize whitespace and case', () => {
    const conflicts = detectLoreConflicts([
      makeNote('a', 'Ancient King'),
      makeNote('b', '  ancient   king '),
    ]);
    expect(conflicts).toHaveLength(1);
  });

  it('should ignore unique titles', () => {
    expect(detectLoreConflicts([makeNote('a', '创世战争'), makeNote('b', '龙之契约')])).toHaveLength(0);
  });
});
