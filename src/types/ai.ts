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

export interface AiChatTimelineItem {
  id: string;
  title: string;
  dateValue?: string;
  trackName: string;
  description?: string;
}

export interface AiChatCharacterItem {
  id: string;
  name: string;
  description?: string;
  role?: string;
}

export interface AiChatLocationItem {
  id: string;
  name: string;
  description?: string;
}

export interface AiChatOutlineItem {
  id: string;
  title: string;
  level: number;
  parentId?: string | null;
}

export interface AiChatNoteItem {
  id: string;
  title: string;
  summary?: string;
}

export interface AiChatContextSelectedEntity {
  type: string;
  id: string;
  label: string;
  content?: string;
}

export interface AiChatContext {
  workspaceSummary?: string;
  timeline?: AiChatTimelineItem[];
  characters?: AiChatCharacterItem[];
  locations?: AiChatLocationItem[];
  outline?: AiChatOutlineItem[];
  notes?: AiChatNoteItem[];
  selectedEntity?: AiChatContextSelectedEntity | null;
  systemPromptOverride?: string;
}

export interface AiChatInput {
  workspaceId: string;
  sessionId?: string | null;
  message: string;
  useRag?: boolean;
  context?: AiChatContext;
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

export type AiInsertTarget =
  | 'note'
  | 'outline'
  | 'event'
  | 'vn_scene'
  | 'character'
  | 'location'
  | 'outline_node'
  | 'novel_chapter'
  | 'notebook_content'
  | 'outline_node_content';

export interface AiInsertInput {
  workspaceId: string;
  target: AiInsertTarget;
  content: string;
  trackId?: string;
  mode?: 'insert' | 'replace';
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

export type AiStreamEvent =
  | { type: 'delta'; data: string }
  | { type: 'error'; data: string }
  | { type: 'done' };
