import { describe, it, expect, vi, beforeEach } from 'vitest';

import { listWorkspaces, createWorkspace } from './api';

vi.mock('@/lib/ipc', () => ({
  invoke: vi.fn(),
  isTauri: () => false,
  isWebMode: () => true,
}));

import { invoke } from '@/lib/ipc';

describe('workspace api', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should list workspaces via ipc', async () => {
    vi.mocked(invoke).mockResolvedValue([
      {
        id: '1',
        name: 'demo',
        description: '',
        template: 'blank',
        coverColor: '#C68A3E',
        coverImage: null,
        eventCount: 3,
        settings: {},
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]);
    const result = await listWorkspaces();
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('demo');
    expect(result[0]?.eventCount).toBe(3);
    expect(invoke).toHaveBeenCalledWith('list_workspaces');
  });

  it('should create workspace with input payload', async () => {
    vi.mocked(invoke).mockResolvedValue({
      id: '2',
      name: '新故事',
      description: '',
      template: 'blank',
      coverColor: '#C68A3E',
      coverImage: null,
      eventCount: 0,
      settings: {},
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    const result = await createWorkspace({ name: '新故事' });
    expect(result.id).toBe('2');
    expect(invoke).toHaveBeenCalledWith('create_workspace', {
      input: { name: '新故事' },
    });
  });

  it('should propagate ipc errors', async () => {
    vi.mocked(invoke).mockRejectedValue({ code: 'INVALID_INPUT', message: '名称不能为空' });
    await expect(createWorkspace({ name: '' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
});
