import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { applyAiOutput } from './api';
import { createWrapper, useApplyAiOutput } from './hooks';

vi.mock('./api', () => ({
  applyAiOutput: vi.fn(),
}));

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('useApplyAiOutput', () => {
  it('should invalidate character query key when target is character', async () => {
    const qc = createTestQueryClient();
    vi.mocked(applyAiOutput).mockResolvedValue({
      target: 'character',
      id: 'c1',
      title: '新角色',
    });

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useApplyAiOutput('ws'), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({ target: 'character', content: '新角色\n描述' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['characters', 'ws'] });
  });

  it('should invalidate location query key when target is location', async () => {
    const qc = createTestQueryClient();
    vi.mocked(applyAiOutput).mockResolvedValue({
      target: 'location',
      id: 'l1',
      title: '新地点',
    });

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useApplyAiOutput('ws'), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({ target: 'location', content: '新地点\n描述' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['locations', 'ws'] });
  });

  it('should invalidate outline query key for outline_node target', async () => {
    const qc = createTestQueryClient();
    vi.mocked(applyAiOutput).mockResolvedValue({
      target: 'outline_node',
      id: 'on1',
      title: '新节点',
    });

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useApplyAiOutput('ws'), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({ target: 'outline_node', content: '新节点\n描述' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['outlineNodes', 'ws'] });
  });
});
