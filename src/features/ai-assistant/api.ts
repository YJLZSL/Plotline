import {
  aiChatStream as baseAiChatStream,
  createAiSession as baseCreateAiSession,
  deleteAiSession as baseDeleteAiSession,
  listAiSessions as baseListAiSessions,
  listAiMessages as baseListAiMessages,
} from '@/features/ai/api';
import type {
  AiChatInput,
  AiChatResult,
  AiMessage,
  AiSession,
  CreateAiSessionInput,
} from '@/types';

export function createAiSession(input: CreateAiSessionInput): Promise<AiSession> {
  return baseCreateAiSession(input);
}

export function listAiSessions(workspaceId: string): Promise<AiSession[]> {
  return baseListAiSessions(workspaceId);
}

export function deleteAiSession(id: string): Promise<void> {
  return baseDeleteAiSession(id);
}

export function listAiMessages(sessionId: string): Promise<AiMessage[]> {
  return baseListAiMessages(sessionId);
}

export function aiChatStream(
  input: AiChatInput,
  onEvent: (event: { type: 'delta'; data: string } | { type: 'error'; data: string }) => void,
): Promise<AiChatResult> {
  return baseAiChatStream(input, (event) => {
    if (event.type === 'delta' || event.type === 'error') {
      onEvent(event);
    }
  });
}
