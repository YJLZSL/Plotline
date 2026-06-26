import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';

import type { AiInsertInput, AiKvEntry, AiMessage, AiSession } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';

import {
  addAiMessage as apiAddMessage,
  aiChat as apiChat,
  aiIndexWorkspace as apiIndexWorkspace,
  aiKvGet as apiKvGet,
  aiKvSet as apiKvSet,
  applyAiOutput as apiApplyOutput,
  createAiSession as apiCreateSession,
  deleteAiSession as apiDeleteSession,
  listAiMessages as apiListMessages,
  listAiModels as apiListModels,
  listAiSessions as apiListSessions,
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

export function useApplyAiOutput(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<AiInsertInput, 'workspaceId'>) =>
      apiApplyOutput({ ...input, workspaceId }),
    onSuccess: (result) => {
      toastSuccess(`已创建 ${result.title}`);
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

export function createWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: qc },
      children,
    );
  };
}
