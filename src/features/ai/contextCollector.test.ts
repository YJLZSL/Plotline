import { describe, expect, it, vi } from 'vitest';

import * as charactersApi from '@/features/characters/api';
import * as mapApi from '@/features/map/api';
import * as notebookApi from '@/features/notebook/api';
import * as outlineApi from '@/features/outline/api';
import * as timelineApi from '@/features/timeline/api';
import * as eventApi from '@/features/timeline/eventApi';

import { collectAiContext, truncateText } from './contextCollector';

vi.mock('@/features/characters/api', () => ({
  listCharacters: vi.fn(),
}));

vi.mock('@/features/map/api', () => ({
  listLocations: vi.fn(),
}));

vi.mock('@/features/notebook/api', () => ({
  listNotes: vi.fn(),
}));

vi.mock('@/features/outline/api', () => ({
  listOutlineNodes: vi.fn(),
}));

vi.mock('@/features/timeline/api', () => ({
  listTracks: vi.fn(),
}));

vi.mock('@/features/timeline/eventApi', () => ({
  listEvents: vi.fn(),
}));

describe('contextCollector', () => {
  describe('truncateText', () => {
    it('should return undefined when text is empty', () => {
      expect(truncateText(undefined, 200)).toBeUndefined();
      expect(truncateText(null, 200)).toBeUndefined();
      expect(truncateText('', 200)).toBeUndefined();
    });

    it('should return original text when within limit', () => {
      expect(truncateText('short', 200)).toBe('short');
    });

    it('should truncate long text and append ellipsis', () => {
      const long = 'a'.repeat(250);
      const result = truncateText(long, 200);
      expect(result).toHaveLength(201);
      expect(result?.endsWith('…')).toBe(true);
    });
  });

  describe('collectAiContext', () => {
    it('should only include requested sources', async () => {
      vi.mocked(timelineApi.listTracks).mockResolvedValue([
        {
          id: 't1',
          workspaceId: 'ws',
          name: '主线',
          color: '#000',
          sortOrder: 0,
          isVisible: true,
          createdAt: '',
        },
      ]);
      vi.mocked(eventApi.listEvents).mockResolvedValue([
        {
          id: 'e1',
          workspaceId: 'ws',
          trackId: 't1',
          title: '开场',
          description: '艾莉丝醒来',
          dateType: 'absolute',
          dateValue: 'Day 1',
          sortOrder: 0,
          status: 'draft',
          color: null,
          locationId: null,
          imageUrls: [],
          characterIds: [],
          connectedEventIds: [],
          createdAt: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(charactersApi.listCharacters).mockResolvedValue([]);
      vi.mocked(mapApi.listLocations).mockResolvedValue([]);
      vi.mocked(outlineApi.listOutlineNodes).mockResolvedValue([]);
      vi.mocked(notebookApi.listNotes).mockResolvedValue([]);

      const context = await collectAiContext('ws', ['timeline']);

      expect(context.timeline).toHaveLength(1);
      const first = context.timeline?.[0];
      expect(first).toBeDefined();
      expect(first!.trackName).toBe('主线');
      expect(context.characters).toBeUndefined();
      expect(context.locations).toBeUndefined();
      expect(context.outline).toBeUndefined();
      expect(context.notes).toBeUndefined();
    });

    it('should compute outline levels from parent chain', async () => {
      vi.mocked(outlineApi.listOutlineNodes).mockResolvedValue([
        {
          id: 'n1',
          workspaceId: 'ws',
          type: 'volume',
          title: '第一卷',
          content: '',
          parentId: null,
          sortOrder: 0,
          eventId: null,
          status: 'draft',
          coverImage: null,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'n2',
          workspaceId: 'ws',
          type: 'chapter',
          title: '第一章',
          content: '',
          parentId: 'n1',
          sortOrder: 1,
          eventId: null,
          status: 'draft',
          coverImage: null,
          createdAt: '',
          updatedAt: '',
        },
      ]);

      const context = await collectAiContext('ws', ['outline']);

      expect(context.outline).toHaveLength(2);
      const first = context.outline?.[0];
      const second = context.outline?.[1];
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first!.level).toBe(0);
      expect(second!.level).toBe(1);
    });

    it('should include selected entity when selectedEntity source enabled', async () => {
      const context = await collectAiContext('ws', ['workspaceSummary', 'selectedEntity'], {
        type: 'character',
        id: 'c1',
        label: '艾莉丝',
        content: '女主角',
      });

      expect(context.selectedEntity).toEqual({
        type: 'character',
        id: 'c1',
        label: '艾莉丝',
        content: '女主角',
      });
    });

    it('should not include selected entity when selectedEntity source disabled', async () => {
      const context = await collectAiContext('ws', ['workspaceSummary'], {
        type: 'character',
        id: 'c1',
        label: '艾莉丝',
        content: '女主角',
      });

      expect(context.selectedEntity).toBeUndefined();
    });

    it('should filter out note folders and truncate content', async () => {
      vi.mocked(notebookApi.listNotes).mockResolvedValue([
        {
          id: 'n1',
          workspaceId: 'ws',
          folderId: null,
          title: '设定',
          content: 'a'.repeat(300),
          tags: [],
          isFolder: false,
          sortOrder: 0,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'n2',
          workspaceId: 'ws',
          folderId: null,
          title: '文件夹',
          content: '',
          tags: [],
          isFolder: true,
          sortOrder: 1,
          createdAt: '',
          updatedAt: '',
        },
      ]);

      const context = await collectAiContext('ws', ['notes']);

      expect(context.notes).toHaveLength(1);
      const first = context.notes?.[0];
      expect(first).toBeDefined();
      expect(first!.title).toBe('设定');
      expect(first!.summary).toHaveLength(201);
    });

    it('should respect selected_entity scope', async () => {
      vi.mocked(timelineApi.listTracks).mockResolvedValue([]);
      vi.mocked(eventApi.listEvents).mockResolvedValue([]);
      vi.mocked(charactersApi.listCharacters).mockResolvedValue([
        {
          id: 'c1',
          workspaceId: 'ws',
          name: '艾莉丝',
          description: '',
          aliases: [],
          appearance: '',
          backstory: '',
          goals: '',
          conflicts: '',
          arc: '',
          tags: [],
          color: '',
          avatar: '',
          eventIds: [],
          createdAt: '',
          updatedAt: '',
        },
      ]);

      const context = await collectAiContext(
        'ws',
        [],
        { type: 'event', id: 'e1', label: '开场' },
        'selected_entity',
      );

      expect(context.scope).toBe('selected_entity');
      expect(context.timeline).toBeUndefined();
      expect(context.characters).toBeUndefined();
      expect(context.selectedEntity).toEqual({
        type: 'event',
        id: 'e1',
        label: '开场',
        content: undefined,
      });
    });

    it('should respect current_view scope', async () => {
      vi.mocked(timelineApi.listTracks).mockResolvedValue([
        {
          id: 't1',
          workspaceId: 'ws',
          name: '主线',
          color: '#000',
          sortOrder: 0,
          isVisible: true,
          createdAt: '',
        },
      ]);
      vi.mocked(eventApi.listEvents).mockResolvedValue([
        {
          id: 'e1',
          workspaceId: 'ws',
          trackId: 't1',
          title: '开场',
          description: '',
          dateType: 'absolute',
          dateValue: 'Day 1',
          sortOrder: 0,
          status: 'draft',
          color: null,
          locationId: null,
          imageUrls: [],
          characterIds: [],
          connectedEventIds: [],
          createdAt: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(charactersApi.listCharacters).mockResolvedValue([]);

      const context = await collectAiContext(
        'ws',
        [],
        { type: 'event', id: 'e1', label: '开场' },
        'current_view',
      );

      expect(context.scope).toBe('current_view');
      expect(context.timeline).toHaveLength(1);
      expect(context.characters).toBeUndefined();
      expect(context.selectedEntity).toBeDefined();
    });

    it('should respect whole_workspace scope', async () => {
      vi.mocked(charactersApi.listCharacters).mockResolvedValue([
        {
          id: 'c1',
          workspaceId: 'ws',
          name: '艾莉丝',
          description: '',
          aliases: [],
          appearance: '',
          backstory: '',
          goals: '',
          conflicts: '',
          arc: '',
          tags: [],
          color: '',
          avatar: '',
          eventIds: [],
          createdAt: '',
          updatedAt: '',
        },
      ]);
      vi.mocked(mapApi.listLocations).mockResolvedValue([]);
      vi.mocked(outlineApi.listOutlineNodes).mockResolvedValue([]);
      vi.mocked(notebookApi.listNotes).mockResolvedValue([]);
      vi.mocked(timelineApi.listTracks).mockResolvedValue([]);
      vi.mocked(eventApi.listEvents).mockResolvedValue([]);

      const context = await collectAiContext('ws', [], null, 'whole_workspace');

      expect(context.scope).toBe('whole_workspace');
      expect(context.characters).toHaveLength(1);
      expect(context.selectedEntity).toBeUndefined();
    });
  });
});
