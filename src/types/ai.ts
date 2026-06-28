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

export type AiContextScope = 'selected_entity' | 'current_view' | 'whole_workspace';

export interface AiRagChunk {
  sourceType: string;
  sourceId: string;
  content: string;
  score: number;
}

export type AiActionType =
  | 'optimize_event'
  | 'optimize_timeline_segment'
  | 'summarize_workspace'
  | 'check_timeline_consistency';

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
  scope?: AiContextScope;
}

export interface AiChatInput {
  workspaceId: string;
  sessionId?: string | null;
  message: string;
  useRag?: boolean;
  context?: AiChatContext;
  ragChunks?: AiRagChunk[];
}

export interface AiChatResult {
  sessionId: string;
  reply: string;
  messages: AiMessage[];
  retrievedChunks?: number;
}

export interface AiScoredEntity {
  id: string;
  entityType: string;
  name: string;
  summary: string;
  score: number;
}

export interface AiShortcutInput {
  workspaceId: string;
  sessionId?: string | null;
  action: AiActionType;
  context?: AiChatContext;
  query?: string;
}

export interface AiShortcutResult {
  sessionId: string;
  reply: string;
  messages: AiMessage[];
  cached: boolean;
  entities: AiScoredEntity[];
  retrievedChunks?: number;
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

export interface AiConnectionTestInput {
  baseUrl: string;
  apiKey: string;
  model?: string;
}

export interface AiConnectionTestResult {
  status: 'ok' | 'error';
  latencyMs: number;
  message: string;
}

export type AiStreamEvent =
  | { type: 'delta'; data: string }
  | { type: 'error'; data: string }
  | { type: 'done' };

export type AiAgentId =
  | 'chat'
  | 'continue'
  | 'brainstorm'
  | 'check'
  | 'polish'
  | 'relationships'
  | 'styleTransfer';

export type AiAssistantContextMode =
  | 'current_event'
  | 'current_character'
  | 'current_outline'
  | 'whole_workspace'
  | 'none';

export interface AiAgent {
  id: AiAgentId;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  systemPrompt: string;
}
