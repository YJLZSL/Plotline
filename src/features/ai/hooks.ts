import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';

import type {
  AiConnectionTestResult,
  AiInsertInput,
  AiKvEntry,
  AiMessage,
  AiSession,
  AiShortcutInput,
  AiShortcutResult,
} from '@/types';
import { updateOutlineNode } from '@/features/outline/api';
import { toastError, toastSuccess } from '@/stores/toast';
import { useEditorSelectionStore } from '@/stores/editorSelection';

import {
  addAiMessage as apiAddMessage,
  aiChat as apiChat,
  aiIndexWorkspace as apiIndexWorkspace,
  aiKvGet as apiKvGet,
  aiKvSet as apiKvSet,
  applyAiOutput as apiApplyOutput,
  checkTimelineConsistency as apiCheckTimelineConsistency,
  clearAiCache as apiClearAiCache,
  createAiSession as apiCreateSession,
  deleteAiSession as apiDeleteSession,
  listAiMessages as apiListMessages,
  listAiModels as apiListModels,
  listAiSessions as apiListSessions,
  optimizeEvent as apiOptimizeEvent,
  optimizeTimelineSegment as apiOptimizeTimelineSegment,
  searchAiChunks as apiSearchAiChunks,
  summarizeWorkspace as apiSummarizeWorkspace,
  testAiConnection as apiTestAiConnection,
} from './api';

export const aiSessionsKey = (workspaceId: string) =>
  ['aiSessions', workspaceId] as const;
export const aiMessagesKey = (sessionId: string) =>
  ['aiMessages', sessionId] as const;
export const aiKvKey = (workspaceId: string, key: string) =>
  ['aiKv', workspaceId, key] as const;

export function useAiSessionsQuery(workspaceId: string) {
  return useQuery({
    queryKey: aiSessionsKey(workspaceId),
    queryFn: () => apiListSessions(workspaceId),
  });
}

export function useCreateAiSession(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreateSession,
    onSuccess: (session) => {
      qc.setQueryData<AiSession[]>(aiSessionsKey(workspaceId), (old) => [
        session,
        ...(old ?? []),
      ]);
    },
    onError: toastError,
  });
}

export function useDeleteAiSession(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiDeleteSession,
    onSuccess: (_, id) => {
      qc.setQueryData<AiSession[]>(aiSessionsKey(workspaceId), (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
    },
    onError: toastError,
  });
}

export function useAiMessagesQuery(sessionId: string | null) {
  return useQuery({
    queryKey: aiMessagesKey(sessionId ?? ''),
    queryFn: () => apiListMessages(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useAddAiMessage(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiAddMessage,
    onSuccess: (message) => {
      qc.setQueryData<AiMessage[]>(aiMessagesKey(sessionId), (old) => [
        ...(old ?? []),
        message,
      ]);
    },
    onError: toastError,
  });
}

export function useAiChat(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiChat,
    onSuccess: (result) => {
      qc.setQueryData<AiMessage[]>(
        aiMessagesKey(result.sessionId),
        result.messages,
      );
      qc.invalidateQueries({ queryKey: aiSessionsKey(workspaceId) });
    },
    onError: toastError,
  });
}

export function useAiIndexWorkspace(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiIndexWorkspace(workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: aiKvKey(workspaceId, 'workspace_summary'),
      });
    },
    onError: toastError,
  });
}

export const aiRagSearchKey = (workspaceId: string, query: string) =>
  ['aiRagSearch', workspaceId, query] as const;

export function useAiRagSearch(
  workspaceId: string,
  query: string,
  enabled = true,
) {
  return useQuery({
    queryKey: aiRagSearchKey(workspaceId, query),
    queryFn: () => apiSearchAiChunks(workspaceId, query, 5),
    enabled: enabled && workspaceId.length > 0 && query.trim().length > 0,
    staleTime: 1000 * 60 * 2,
  });
}

export function useClearAiCache(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClearAiCache(workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiRagSearchKey(workspaceId, '') });
    },
    onError: toastError,
  });
}

export function useAiKvGet(workspaceId: string, key: string) {
  return useQuery({
    queryKey: aiKvKey(workspaceId, key),
    queryFn: () => apiKvGet(workspaceId, key),
  });
}

export function useAiKvSet(workspaceId: string, key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (value: string) =>
      apiKvSet({ workspaceId, key, value, updatedAt: new Date().toISOString() }),
    onSuccess: (entry) => {
      qc.setQueryData<AiKvEntry>(aiKvKey(workspaceId, key), entry);
    },
    onError: toastError,
  });
}

export const aiModelsKey = (baseUrl: string) => ['aiModels', baseUrl] as const;

export function useAiModelsQuery(baseUrl: string, apiKey: string, enabled: boolean) {
  return useQuery({
    queryKey: aiModelsKey(baseUrl),
    queryFn: () => apiListModels({ baseUrl, apiKey }),
    enabled: enabled && baseUrl.trim().length > 0 && apiKey.trim().length > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export const aiConnectionTestKey = (baseUrl: string, model: string) =>
  ['aiConnectionTest', baseUrl, model] as const;

export function useAiConnectionTest(
  baseUrl: string,
  apiKey: string,
  model: string,
  provider: string,
  enabled: boolean,
) {
  const canSkipKey = provider === 'ollama';
  return useQuery<AiConnectionTestResult, Error>({
    queryKey: aiConnectionTestKey(baseUrl, model),
    queryFn: () =>
      apiTestAiConnection({
        baseUrl,
        apiKey,
        model: model || undefined,
      }),
    enabled:
      enabled &&
      baseUrl.trim().length > 0 &&
      (apiKey.trim().length > 0 || canSkipKey),
    staleTime: 1000 * 60 * 2,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function isEditorTarget(target: string): boolean {
  return (
    target === 'novel_chapter' ||
    target === 'notebook_content' ||
    target === 'outline_node_content'
  );
}

async function applyToEditor(
  input: AiInsertInput,
): Promise<{ target: string; id: string; title: string }> {
  const store = useEditorSelectionStore.getState();

  if (input.target === 'novel_chapter' || input.target === 'notebook_content') {
    if (!store.editor) {
      throw new Error('请先点击编辑器定位光标');
    }
    const selection =
      store.selection ?? {
        from: store.editor.state.selection.from,
        to: store.editor.state.selection.to,
      };
    if (input.mode === 'replace' && selection.from !== selection.to) {
      store.editor
        .chain()
        .focus()
        .insertContentAt(
          { from: selection.from, to: selection.to },
          input.content,
        )
        .run();
    } else {
      store.editor.chain().focus().insertContentAt(selection.from, input.content).run();
    }
    return {
      target: input.target,
      id: store.nodeId ?? '',
      title: input.target === 'novel_chapter' ? '当前章节' : '当前笔记',
    };
  }

  if (input.target === 'outline_node_content') {
    if (store.type !== 'outline' || !store.nodeId) {
      throw new Error('请先选择大纲节点');
    }
    const currentContent = store.content ?? '';
    const newContent =
      input.mode === 'replace'
        ? input.content
        : currentContent
          ? `${currentContent}\n\n${input.content}`
          : input.content;
    const node = await updateOutlineNode({ id: store.nodeId, content: newContent });
    return { target: input.target, id: node.id, title: node.title };
  }

  throw new Error(`不支持的编辑器目标: ${input.target}`);
}

export function useApplyAiOutput(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mode, ...input }: Omit<AiInsertInput, 'workspaceId'>) => {
      if (isEditorTarget(input.target)) {
        return applyToEditor({ ...input, workspaceId, mode });
      }
      return apiApplyOutput({ ...input, workspaceId });
    },
    onSuccess: (result) => {
      if (result.target === 'novel_chapter') {
        toastSuccess('已插入到当前章节');
      } else if (result.target === 'notebook_content') {
        toastSuccess('已插入到当前笔记');
      } else if (result.target === 'outline_node_content') {
        toastSuccess('已更新大纲节点内容');
        qc.invalidateQueries({ queryKey: ['outline', workspaceId] });
        qc.invalidateQueries({ queryKey: ['outlineNodes', workspaceId] });
      } else {
        toastSuccess(`已创建 ${result.title}`);
      }
      if (result.target === 'note') {
        qc.invalidateQueries({ queryKey: ['notes', workspaceId] });
      } else if (result.target === 'outline' || result.target === 'outline_node') {
        qc.invalidateQueries({ queryKey: ['outlineNodes', workspaceId] });
      } else if (result.target === 'event') {
        qc.invalidateQueries({ queryKey: ['events', workspaceId] });
        qc.invalidateQueries({ queryKey: ['timeline', workspaceId] });
      } else if (result.target === 'vn_scene') {
        qc.invalidateQueries({ queryKey: ['vnScenes', workspaceId] });
      } else if (result.target === 'character') {
        qc.invalidateQueries({ queryKey: ['characters', workspaceId] });
      } else if (result.target === 'location') {
        qc.invalidateQueries({ queryKey: ['locations', workspaceId] });
      }
    },
    onError: toastError,
  });
}

export function useOptimizeEvent(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<AiShortcutResult, Error, AiShortcutInput>({
    mutationFn: apiOptimizeEvent,
    onSuccess: (result) => {
      qc.setQueryData<AiMessage[]>(
        aiMessagesKey(result.sessionId),
        result.messages,
      );
      qc.invalidateQueries({ queryKey: aiSessionsKey(workspaceId) });
    },
    onError: toastError,
  });
}

export function useOptimizeTimelineSegment(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<AiShortcutResult, Error, AiShortcutInput>({
    mutationFn: apiOptimizeTimelineSegment,
    onSuccess: (result) => {
      qc.setQueryData<AiMessage[]>(
        aiMessagesKey(result.sessionId),
        result.messages,
      );
      qc.invalidateQueries({ queryKey: aiSessionsKey(workspaceId) });
    },
    onError: toastError,
  });
}

export function useSummarizeWorkspace(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<AiShortcutResult, Error, AiShortcutInput>({
    mutationFn: apiSummarizeWorkspace,
    onSuccess: (result) => {
      qc.setQueryData<AiMessage[]>(
        aiMessagesKey(result.sessionId),
        result.messages,
      );
      qc.invalidateQueries({ queryKey: aiSessionsKey(workspaceId) });
    },
    onError: toastError,
  });
}

export function useCheckTimelineConsistency(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation<AiShortcutResult, Error, AiShortcutInput>({
    mutationFn: apiCheckTimelineConsistency,
    onSuccess: (result) => {
      qc.setQueryData<AiMessage[]>(
        aiMessagesKey(result.sessionId),
        result.messages,
      );
      qc.invalidateQueries({ queryKey: aiSessionsKey(workspaceId) });
    },
    onError: toastError,
  });
}

export function createWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: qc },
      children,
    );
  };
}
