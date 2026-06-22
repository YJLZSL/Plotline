export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  id: string;
  sessionId: string;
  role: AiRole;
  content: string;
  createdAt: string;
}

export interface AiSession {
  id: string;
  workspaceId: string;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiSessionInput {
  workspaceId: string;
  title?: string;
}

export interface CreateAiMessageInput {
  sessionId: string;
  role: AiRole;
  content: string;
}

export interface AiChatInput {
  workspaceId: string;
  sessionId?: string | null;
  message: string;
  useRag?: boolean;
}

export interface AiChatResult {
  sessionId: string;
  reply: string;
  messages: AiMessage[];
}

export interface AiChunk {
  id: string;
  workspaceId: string;
  sourceType: string;
  sourceId: string;
  content: string;
  updatedAt: string;
}

export interface AiSearchResult {
  chunk: AiChunk;
  score: number;
}

export interface AiKvEntry {
  workspaceId: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface AiInsertInput {
  workspaceId: string;
  target: 'note' | 'outline' | 'event' | 'vn_scene';
  content: string;
  trackId?: string;
}

export interface AiInsertResult {
  target: string;
  id: string;
  title: string;
}

export interface ListAiModelsInput {
  baseUrl: string;
  apiKey: string;
}

export interface AiModelInfo {
  id: string;
  ownedBy?: string;
}
