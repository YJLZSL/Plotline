import { describe, it, expect, beforeEach } from 'vitest';

import { mockIpc } from './mock';
import type {
  Character,
  CharacterRelationship,
  Event,
  Note,
  OutlineNode,
  Track,
  Workspace,
} from '@/types';

async function ws(name: string, template?: string): Promise<Workspace> {
  return mockIpc('create_workspace', {
    input: { name, template: template as never },
  }) as Promise<Workspace>;
}

async function tracksOf(wsId: string): Promise<Track[]> {
  return mockIpc('list_tracks', { workspaceId: wsId }) as Promise<Track[]>;
}

async function charOf(wsId: string, name: string): Promise<Character> {
  return mockIpc('create_character', {
    input: { workspaceId: wsId, name },
  }) as Promise<Character>;
}

async function eventOf(
  wsId: string,
  trackId: string,
  title: string,
  extra?: Record<string, unknown>,
): Promise<Event> {
  return mockIpc('create_event', {
    input: { workspaceId: wsId, trackId, title, ...extra },
  }) as Promise<Event>;
}

describe('mock ipc', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should create and list workspaces', async () => {
    await ws('测试故事', 'three-act');
    const list = (await mockIpc('list_workspaces', {})) as Workspace[];
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('测试故事');
    expect(list[0]?.template).toBe('three-act');
  });

  it('should reject empty workspace name', async () => {
    await expect(
      mockIpc('create_workspace', { input: { name: '' } }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('should seed tracks based on template', async () => {
    const w = await ws('英雄之旅', 'hero-journey');
    const list = await tracksOf(w.id);
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.some((t) => t.name === '主线')).toBe(true);
  });

  it('should create events and link characters', async () => {
    const w = await ws('w');
    const t = (await tracksOf(w.id))[0]!;
    const c = await charOf(w.id, '主角');
    const ev = await eventOf(w.id, t.id, '起源', { characterIds: [c.id] });
    expect(ev.characterIds).toContain(c.id);
    const chars = (await mockIpc('list_characters', { workspaceId: w.id })) as Character[];
    expect(chars[0]?.eventIds).toContain(ev.id);
  });

  it('should forbid deleting the last track', async () => {
    const w = await ws('w');
    const list = await tracksOf(w.id);
    await expect(
      mockIpc('delete_track', { id: list[0]!.id }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('should compute statistics', async () => {
    const w = await ws('w');
    const t = (await tracksOf(w.id))[0]!;
    await eventOf(w.id, t.id, 'e1', { status: 'done' });
    await eventOf(w.id, t.id, 'e2', { status: 'draft' });
    const stats = await mockIpc('get_statistics', { workspaceId: w.id });
    const s = stats as { totalEvents: number; statusBreakdown: { done: number; draft: number } };
    expect(s.totalEvents).toBe(2);
    expect(s.statusBreakdown.done).toBe(1);
    expect(s.statusBreakdown.draft).toBe(1);
  });

  it('should update and read settings', async () => {
    const s1 = (await mockIpc('get_settings', {})) as { theme: string };
    expect(s1.theme).toBe('light');
    const s2 = (await mockIpc('update_settings', { input: { theme: 'dark' } })) as {
      theme: string;
    };
    expect(s2.theme).toBe('dark');
    const s3 = (await mockIpc('get_settings', {})) as { theme: string };
    expect(s3.theme).toBe('dark');
  });

  it('should export and import workspace bundle', async () => {
    const w = await ws('原故事', 'blank');
    const t = (await tracksOf(w.id))[0]!;
    await eventOf(w.id, t.id, '关键事件');
    const bundle = (await mockIpc('export_workspace', { id: w.id })) as {
      version: number;
      events: Event[];
    };
    expect(bundle.version).toBe(1);
    expect(bundle.events).toHaveLength(1);
    const imported = (await mockIpc('import_workspace', { bundle })) as Workspace;
    expect(imported.name).toContain('导入');
    const list = (await mockIpc('list_workspaces', {})) as Workspace[];
    expect(list).toHaveLength(2);
  });

  it('should create outline nodes', async () => {
    const w = await ws('w');
    const vol = (await mockIpc('create_outline_node', {
      input: { workspaceId: w.id, type: 'volume', title: '第一卷' },
    })) as OutlineNode;
    const ch = (await mockIpc('create_outline_node', {
      input: { workspaceId: w.id, type: 'chapter', title: '第一章', parentId: vol.id },
    })) as OutlineNode;
    expect(ch.parentId).toBe(vol.id);
    const nodes = (await mockIpc('list_outline_nodes', { workspaceId: w.id })) as OutlineNode[];
    expect(nodes).toHaveLength(2);
  });

  it('should create notes with tags', async () => {
    const w = await ws('w');
    const note = (await mockIpc('create_note', {
      input: { workspaceId: w.id, title: '灵感', tags: ['idea', '伏笔'] },
    })) as Note;
    expect(note.tags).toEqual(['idea', '伏笔']);
  });

  it('should create character relationships', async () => {
    const w = await ws('w');
    const a = await charOf(w.id, 'A');
    const b = await charOf(w.id, 'B');
    const rel = (await mockIpc('create_relationship', {
      input: {
        workspaceId: w.id,
        sourceId: a.id,
        targetId: b.id,
        relationshipType: 'rival',
        strength: 5,
      },
    })) as CharacterRelationship;
    expect(rel.type).toBe('rival');
    expect(rel.strength).toBe(5);
    const list = (await mockIpc('list_relationships', { workspaceId: w.id })) as CharacterRelationship[];
    expect(list).toHaveLength(1);
  });

  it('should clamp relationship strength', async () => {
    const w = await ws('w');
    const a = await charOf(w.id, 'A');
    const b = await charOf(w.id, 'B');
    const rel = (await mockIpc('create_relationship', {
      input: { workspaceId: w.id, sourceId: a.id, targetId: b.id, strength: 99 },
    })) as CharacterRelationship;
    expect(rel.strength).toBe(5);
  });
});
