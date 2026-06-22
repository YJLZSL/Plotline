import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AiKvEntry, AiMessage, AiSession } from '@/types';
import { toastError } from '@/stores/toast';

import {
  addAiMessage as apiAddMessage,
  aiChat as apiChat,
  aiIndexWorkspace as apiIndexWorkspace,
  aiKvGet as apiKvGet,
  aiKvSet as apiKvSet,
  createAiSession as apiCreateSession,
  deleteAiSession as apiDeleteSession,
  listAiMessages as apiListMessages,
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
