import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { collectAiContext } from '@/features/ai/contextCollector';
import { toastError } from '@/stores/toast';
import type { AiAssistantContextMode, AiChatContext, AiMessage, AiSession } from '@/types';

import {
  createAiSession as apiCreateSession,
  deleteAiSession as apiDeleteSession,
  listAiMessages as apiListMessages,
  listAiSessions as apiListSessions,
} from './api';
import { useAiAssistantStore } from './store';

export const aiAssistantSessionsKey = (workspaceId: string) =>
  ['aiAssistantSessions', workspaceId] as const;
export const aiAssistantMessagesKey = (sessionId: string) =>
  ['aiAssistantMessages', sessionId] as const;

export function useAiAssistantSessionsQuery(workspaceId: string) {
  return useQuery({
    queryKey: aiAssistantSessionsKey(workspaceId),
    queryFn: () => apiListSessions(workspaceId),
  });
}

export function useCreateAiAssistantSession(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreateSession,
    onSuccess: (session) => {
      qc.setQueryData<AiSession[]>(aiAssistantSessionsKey(workspaceId), (old) => [
        session,
        ...(old ?? []),
      ]);
    },
    onError: toastError,
  });
}

export function useDeleteAiAssistantSession(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiDeleteSession,
    onSuccess: (_, id) => {
      qc.setQueryData<AiSession[]>(aiAssistantSessionsKey(workspaceId), (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
    },
    onError: toastError,
  });
}

export function useAiAssistantMessagesQuery(sessionId: string | null) {
  return useQuery({
    queryKey: aiAssistantMessagesKey(sessionId ?? ''),
    queryFn: () => apiListMessages(sessionId!),
    enabled: sessionId !== null,
  });
}

const CONTEXT_SOURCES_MAP: Record<AiAssistantContextMode, string[]> = {
  current_event: ['workspaceSummary', 'timeline', 'selectedEntity'],
  current_character: ['workspaceSummary', 'characters', 'selectedEntity'],
  current_outline: ['workspaceSummary', 'outline', 'selectedEntity'],
  whole_workspace: ['workspaceSummary', 'timeline', 'characters', 'locations', 'outline', 'notes'],
  none: [],
};

export function useAiAssistantContext() {
  const currentAgentId = useAiAssistantStore((s) => s.currentAgentId);
  const contextMode = useAiAssistantStore((s) => s.contextMode);
  const currentSessionId = useAiAssistantStore((s) => s.currentSessionId);
  const input = useAiAssistantStore((s) => s.input);
  const isStreaming = useAiAssistantStore((s) => s.isStreaming);
  const streamingContent = useAiAssistantStore((s) => s.streamingContent);

  const setCurrentAgentId = useAiAssistantStore((s) => s.setCurrentAgentId);
  const setContextMode = useAiAssistantStore((s) => s.setContextMode);
  const setCurrentSessionId = useAiAssistantStore((s) => s.setCurrentSessionId);
  const setInput = useAiAssistantStore((s) => s.setInput);
  const setIsStreaming = useAiAssistantStore((s) => s.setIsStreaming);
  const setStreamingContent = useAiAssistantStore((s) => s.setStreamingContent);
  const appendStreamingContent = useAiAssistantStore((s) => s.appendStreamingContent);
  const resetStreaming = useAiAssistantStore((s) => s.resetStreaming);

  return {
    currentAgentId,
    contextMode,
    currentSessionId,
    input,
    isStreaming,
    streamingContent,
    setCurrentAgentId,
    setContextMode,
    setCurrentSessionId,
    setInput,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    resetStreaming,
  };
}

export async function buildAssistantContext(
  workspaceId: string,
  mode: AiAssistantContextMode,
): Promise<AiChatContext> {
  const sources = CONTEXT_SOURCES_MAP[mode];
  if (mode === 'none' || sources.length === 0) {
    return {};
  }
  return collectAiContext(
    workspaceId,
    sources as (
      | 'workspaceSummary'
      | 'timeline'
      | 'characters'
      | 'locations'
      | 'outline'
      | 'notes'
      | 'selectedEntity'
    )[],
    null,
  );
}

export function useAiAssistant(workspaceId: string) {
  const store = useAiAssistantContext();
  const qc = useQueryClient();
  const { data: sessions = [] } = useAiAssistantSessionsQuery(workspaceId);
  const { data: messages = [] } = useAiAssistantMessagesQuery(store.currentSessionId);
  const createSession = useCreateAiAssistantSession(workspaceId);
  const deleteSession = useDeleteAiAssistantSession(workspaceId);

  const setMessages = (sessionId: string, newMessages: AiMessage[]) => {
    qc.setQueryData<AiMessage[]>(aiAssistantMessagesKey(sessionId), newMessages);
  };

  const invalidateSessions = () => {
    qc.invalidateQueries({ queryKey: aiAssistantSessionsKey(workspaceId) });
  };

  return {
    ...store,
    sessions,
    messages,
    createSession,
    deleteSession,
    setMessages,
    invalidateSessions,
  };
}
