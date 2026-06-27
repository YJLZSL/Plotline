import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { updateOutlineNode } from '@/features/outline/api';
import { useEditorSelectionStore } from '@/stores/editorSelection';

import { applyAiOutput } from './api';
import { createWrapper, useApplyAiOutput } from './hooks';

vi.mock('./api', () => ({
  applyAiOutput: vi.fn(),
}));

vi.mock('@/features/outline/api', () => ({
  updateOutlineNode: vi.fn(),
}));

interface MockEditor {
  chain: ReturnType<typeof vi.fn>;
  state: { selection: { from: number; to: number } };
  _chain: {
    focus: ReturnType<typeof vi.fn>;
    insertContentAt: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };
}

function createMockEditor(): MockEditor {
  const chain = {
    focus: vi.fn(() => chain),
    insertContentAt: vi.fn(() => chain),
    run: vi.fn(),
  };
  return {
    chain: vi.fn(() => chain),
    state: { selection: { from: 2, to: 4 } },
    _chain: chain,
  };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('useApplyAiOutput', () => {
  beforeEach(() => {
    useEditorSelectionStore.getState().unregisterEditor();
    vi.clearAllMocks();
  });

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

  it('should insert content into registered novel editor', async () => {
    const qc = createTestQueryClient();
    const editor = createMockEditor();
    useEditorSelectionStore
      .getState()
      .registerEditor('novel', editor as unknown as import('@tiptap/react').Editor);

    const { result } = renderHook(() => useApplyAiOutput('ws'), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({
      target: 'novel_chapter',
      content: 'new paragraph',
      mode: 'insert',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(editor._chain.insertContentAt).toHaveBeenCalledWith(2, 'new paragraph');
    expect(applyAiOutput).not.toHaveBeenCalled();
  });

  it('should replace selected content in registered notebook editor', async () => {
    const qc = createTestQueryClient();
    const editor = createMockEditor();
    useEditorSelectionStore
      .getState()
      .registerEditor('notebook', editor as unknown as import('@tiptap/react').Editor);
    useEditorSelectionStore.getState().updateSelection(2, 4);

    const { result } = renderHook(() => useApplyAiOutput('ws'), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({
      target: 'notebook_content',
      content: 'replaced',
      mode: 'replace',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(editor._chain.insertContentAt).toHaveBeenCalledWith(
      { from: 2, to: 4 },
      'replaced',
    );
    expect(applyAiOutput).not.toHaveBeenCalled();
  });

  it('should append content to registered outline node', async () => {
    const qc = createTestQueryClient();
    vi.mocked(updateOutlineNode).mockResolvedValue({
      id: 'on1',
      title: '节点',
      content: 'existing\n\nnew content',
      workspaceId: 'ws',
      type: 'scene',
      parentId: null,
      sortOrder: 0,
      eventId: null,
      status: 'draft',
      coverImage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    useEditorSelectionStore
      .getState()
      .registerTextEditor('outline', 'on1', 'existing');

    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useApplyAiOutput('ws'), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({
      target: 'outline_node_content',
      content: 'new content',
      mode: 'insert',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateOutlineNode).toHaveBeenCalledWith({
      id: 'on1',
      content: 'existing\n\nnew content',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['outlineNodes', 'ws'],
    });
    expect(applyAiOutput).not.toHaveBeenCalled();
  });

  it('should replace outline node content when mode is replace', async () => {
    const qc = createTestQueryClient();
    vi.mocked(updateOutlineNode).mockResolvedValue({
      id: 'on1',
      title: '节点',
      content: 'replaced content',
      workspaceId: 'ws',
      type: 'scene',
      parentId: null,
      sortOrder: 0,
      eventId: null,
      status: 'draft',
      coverImage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    useEditorSelectionStore
      .getState()
      .registerTextEditor('outline', 'on1', 'existing');

    const { result } = renderHook(() => useApplyAiOutput('ws'), {
      wrapper: createWrapper(qc),
    });

    result.current.mutate({
      target: 'outline_node_content',
      content: 'replaced content',
      mode: 'replace',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateOutlineNode).toHaveBeenCalledWith({
      id: 'on1',
      content: 'replaced content',
    });
  });
});
