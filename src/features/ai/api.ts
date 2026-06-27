import { Channel } from '@tauri-apps/api/core';

import { invoke, isWebMode } from '@/lib/ipc';
import type {
  AiChatInput,
  AiChatResult,
  AiConnectionTestInput,
  AiConnectionTestResult,
  AiInsertInput,
  AiInsertResult,
  AiKvEntry,
  AiMessage,
  AiModelInfo,
  AiRagChunk,
  AiSession,
  AiShortcutInput,
  AiShortcutResult,
  AiStreamEvent,
  CreateAiMessageInput,
  CreateAiSessionInput,
  ListAiModelsInput,
} from '@/types';

export function createAiSession(input: CreateAiSessionInput): Promise<AiSession> {
  return invoke<AiSession>('create_ai_session', { input });
}

export function listAiSessions(workspaceId: string): Promise<AiSession[]> {
  return invoke<AiSession[]>('list_ai_sessions', { workspaceId });
}

export function getAiSession(id: string): Promise<AiSession> {
  return invoke<AiSession>('get_ai_session', { id });
}

export function deleteAiSession(id: string): Promise<void> {
  return invoke<void>('delete_ai_session', { id });
}

export function addAiMessage(input: CreateAiMessageInput): Promise<AiMessage> {
  return invoke<AiMessage>('add_ai_message', { input });
}

export function listAiMessages(sessionId: string): Promise<AiMessage[]> {
  return invoke<AiMessage[]>('list_ai_messages', { sessionId });
}

export function aiChat(input: AiChatInput): Promise<AiChatResult> {
  return invoke<AiChatResult>('ai_chat', { input });
}

export function aiChatStream(
  input: AiChatInput,
  onEvent: (event: AiStreamEvent) => void,
): Promise<AiChatResult> {
  if (isWebMode()) {
    return aiChat(input);
  }
  const channel = new Channel<AiStreamEvent>();
  channel.onmessage = onEvent;
  return invoke<AiChatResult>('ai_chat_stream', { input, onEvent: channel });
}

export function aiIndexWorkspace(workspaceId: string): Promise<void> {
  return invoke<void>('ai_index_workspace', { workspaceId });
}

export function aiKvGet(
  workspaceId: string,
  key: string,
): Promise<AiKvEntry | null> {
  return invoke<AiKvEntry | null>('ai_kv_get', { workspaceId, key });
}

export function aiKvSet(entry: AiKvEntry): Promise<AiKvEntry> {
  return invoke<AiKvEntry>('ai_kv_set', { entry });
}

export function searchAiChunks(
  workspaceId: string,
  query: string,
  limit?: number,
): Promise<AiRagChunk[]> {
  return invoke<AiRagChunk[]>('search_ai_chunks', { workspaceId, query, limit });
}

export function clearAiCache(workspaceId: string): Promise<void> {
  return invoke<void>('clear_ai_cache', { workspaceId });
}

export function listAiModels(input: ListAiModelsInput): Promise<AiModelInfo[]> {
  return invoke<AiModelInfo[]>('list_ai_models', { input });
}

export function testAiConnection(
  input: AiConnectionTestInput,
): Promise<AiConnectionTestResult> {
  return invoke<AiConnectionTestResult>('test_ai_connection', { input });
}

export function applyAiOutput(input: AiInsertInput): Promise<AiInsertResult> {
  return invoke<AiInsertResult>('apply_ai_output', { input });
}

export function optimizeEvent(input: AiShortcutInput): Promise<AiShortcutResult> {
  return invoke<AiShortcutResult>('optimize_event', { input });
}

export function optimizeTimelineSegment(
  input: AiShortcutInput,
): Promise<AiShortcutResult> {
  return invoke<AiShortcutResult>('optimize_timeline_segment', { input });
}

export function summarizeWorkspace(input: AiShortcutInput): Promise<AiShortcutResult> {
  return invoke<AiShortcutResult>('summarize_workspace', { input });
}

export function checkTimelineConsistency(
  input: AiShortcutInput,
): Promise<AiShortcutResult> {
  return invoke<AiShortcutResult>('check_timeline_consistency', { input });
}
