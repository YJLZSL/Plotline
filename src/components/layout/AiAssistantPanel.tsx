import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Bot,
  Calendar,
  ChevronDown,
  Clapperboard,
  ListTree,
  MapPin,
  MessageSquarePlus,
  PanelLeft,
  PanelRightClose,
  Search,
  Send,
  Sparkles,
  StickyNote,
  User,
  X,
} from 'lucide-react';

import { Button, EmptyState, Input, Textarea } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import { useSettingsQuery } from '@/features/settings/hooks';
import { toastError } from '@/stores/toast';
import { useAiContextStore } from '@/stores/aiContext';
import { useEditorSelectionStore } from '@/stores/editorSelection';
import { getProviderPreset } from '@/features/ai/providers';
import { aiChatStream } from '@/features/ai/api';
import {
  collectAiContext,
  type AiContextSource,
} from '@/features/ai/contextCollector';
import {
  aiMessagesKey,
  aiSessionsKey,
  useAiIndexWorkspace,
  useAiKvGet,
  useAiMessagesQuery,
  useAiSessionsQuery,
  useApplyAiOutput,
  useCreateAiSession,
  useDeleteAiSession,
} from '@/features/ai/hooks';
import {
  AI_STYLE_TEMPLATES,
  type AiStyleTemplate,
} from '@/features/ai/promptTemplates';
import type { AiChatContext, AiInsertTarget, AiMessage, AiSession } from '@/types';
import type { AiSelection } from '@/stores/aiContext';

interface AiAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export function AiAssistantPanel({
  open,
  onClose,
  workspaceId,
}: AiAssistantPanelProps) {
  const { t } = useI18n();
  const { data: settings } = useSettingsQuery();
  const qc = useQueryClient();
  const { data: sessions = [] } = useAiSessionsQuery(workspaceId);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isCollectingContext, setIsCollectingContext] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [showSessionsMobile, setShowSessionsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useAiMessagesQuery(currentSessionId);
  const createSession = useCreateAiSession(workspaceId);
  const deleteSession = useDeleteAiSession(workspaceId);
  const indexWorkspace = useAiIndexWorkspace(workspaceId);
  const { data: summary } = useAiKvGet(workspaceId, 'workspace_summary');

  useEffect(() => {
    if (open && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0]?.id ?? null);
    }
  }, [open, sessions, currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, streamingContent]);

  const handleNewSession = async () => {
    const session = await createSession.mutateAsync({
      workspaceId,
      title: undefined,
    });
    setCurrentSessionId(session.id);
  };

  const aiContext = useAiContextStore();

  const toggleSource = (source: AiContextSource) => {
    const next = aiContext.enabledSources.includes(source)
      ? aiContext.enabledSources.filter((s) => s !== source)
      : [...aiContext.enabledSources, source];
    aiContext.setEnabledSources(next);
  };

  const enabled = settings?.aiEnabled ?? false;

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || isCollectingContext) return;
    setInput('');
    setIsStreaming(true);
    setIsCollectingContext(true);
    setStreamingContent('');

    let context: AiChatContext | undefined;
    try {
      context = await collectAiContext(
        workspaceId,
        aiContext.enabledSources,
        aiContext.selection,
      );
      if (summary?.value && aiContext.enabledSources.includes('workspaceSummary')) {
        context = { ...context, workspaceSummary: summary.value };
      }
      if (selectedTemplateId) {
        const template = AI_STYLE_TEMPLATES.find((t) => t.id === selectedTemplateId);
        if (template) {
          context = { ...context, systemPromptOverride: template.systemPrompt };
        }
      }
    } catch {
      // 上下文收集失败时仍然发送消息，只是不带上下文
    } finally {
      setIsCollectingContext(false);
    }

    try {
      const result = await aiChatStream(
        {
          workspaceId,
          sessionId: currentSessionId,
          message: trimmed,
          useRag: true,
          context,
        },
        (event) => {
          if (event.type === 'delta') {
            setStreamingContent((prev) => prev + event.data);
          } else if (event.type === 'error') {
            toastError(event.data);
          }
        },
      );
      setCurrentSessionId(result.sessionId);
      qc.setQueryData<AiMessage[]>(aiMessagesKey(result.sessionId), result.messages);
      qc.invalidateQueries({ queryKey: aiSessionsKey(workspaceId) });
    } catch {
      // 错误由 onError / channel error 处理
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setSelectedTemplateId(null);
    }
  };

  const handleSend = () => {
    void sendMessage(input);
  };

  const handleSuggestionClick = (prompt: string) => {
    void sendMessage(prompt);
  };

  const handleTemplateClick = (template: AiStyleTemplate) => {
    if (selectedTemplateId === template.id) {
      setSelectedTemplateId(null);
      return;
    }
    setSelectedTemplateId(template.id);
    setInput(template.template);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(sessionSearch.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION_BASE}
            className="fixed inset-0 z-30 bg-black/10"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={MOTION_BASE}
            data-testid="ai-assistant-panel"
            className="fixed right-0 top-12 bottom-0 w-full max-w-lg border-l border-border bg-bg-surface shadow-[var(--shadow-elevated-soft)] z-40 flex flex-col"
          >
            <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-bg-base flex-shrink-0">
              <div className="flex items-center gap-2 text-text-primary">
                {(() => {
                  const preset = getProviderPreset(settings?.aiProvider ?? 'openai');
                  return (
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-[6px]"
                      style={{ backgroundColor: `${preset.color}1A`, color: preset.color }}
                    >
                      {preset.icon}
                    </span>
                  );
                })()}
                <span className="text-sm font-semibold">{t('ai.title')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void indexWorkspace.mutateAsync()}
                  loading={indexWorkspace.isPending}
                  title={t('ai.index')}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewSession}
                  loading={createSession.isPending}
                  title={t('ai.newSession')}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  onClick={() => setShowSessionsMobile((v) => !v)}
                  title={t('ai.sessions')}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  title={t('common.close')}
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {!enabled ? (
              <DisabledState />
            ) : (
              <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
                <div
                  data-testid="ai-session-list"
                  className={cn(
                    'w-full sm:w-40 border-b sm:border-b-0 sm:border-r border-border bg-bg-base flex flex-col flex-shrink-0',
                    !showSessionsMobile && 'hidden sm:flex',
                  )}
                >
                  <div className="p-2 border-b border-border flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-text-secondary flex-shrink-0 ml-1" />
                    <Input
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      placeholder={t('ai.searchSessions')}
                      className="h-8 text-xs px-2 py-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={handleNewSession}
                      loading={createSession.isPending}
                      title={t('ai.newSession')}
                    >
                      <MessageSquarePlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredSessions.length === 0 && (
                      <div className="px-2 py-1 text-xs text-text-secondary">
                        {t('ai.empty')}
                      </div>
                    )}
                    {filteredSessions.map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        active={currentSessionId === session.id}
                        onSelect={() => {
                          setCurrentSessionId(session.id);
                          setShowSessionsMobile(false);
                        }}
                        onDelete={(id) => {
                          void deleteSession.mutateAsync(id);
                          if (currentSessionId === id) setCurrentSessionId(null);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <section className="flex-1 min-w-0 flex flex-col">
                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3" data-testid="ai-message-area">
                    {messages.length === 0 && !isStreaming && (
                      <EmptyState
                        icon={<Bot className="h-8 w-8" />}
                        title={t('ai.empty')}
                        description={t('ai.emptyEnabled')}
                      />
                    )}
                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        workspaceId={workspaceId}
                        currentView={aiContext.view}
                      />
                    ))}
                    {isStreaming && streamingContent && (
                      <MessageBubble
                        message={{ id: 'streaming', role: 'assistant', content: streamingContent }}
                        workspaceId={workspaceId}
                        currentView={aiContext.view}
                      />
                    )}
                    {isStreaming && !streamingContent && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                        {t('ai.thinking')}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex-shrink-0 border-t border-border bg-bg-base">
                    {aiContext.suggestions.length > 0 && (
                      <div
                        data-testid="ai-suggestions-row"
                        className="px-3 pt-3 overflow-x-auto scrollbar-thin"
                      >
                        <div className="flex items-center gap-2 min-w-min pb-1">
                          {aiContext.suggestions.map((s) => (
                            <button
                              key={s.label}
                              data-testid={`ai-suggestion-${s.label}`}
                              onClick={() => handleSuggestionClick(s.prompt)}
                              disabled={isStreaming || isCollectingContext}
                              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-bg-elevated border border-border text-xs text-text-secondary hover:text-text-primary hover:border-accent/40 hover:bg-bg-surface transition-colors disabled:opacity-50"
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <ContextTagBar
                      view={aiContext.view}
                      viewLabel={aiContext.viewLabel}
                      selection={aiContext.selection}
                      enabledSources={aiContext.enabledSources}
                      onToggleSource={toggleSource}
                      onClearSelection={aiContext.clearSelection}
                    />

                    <TemplateChips
                      selectedId={selectedTemplateId}
                      onSelect={handleTemplateClick}
                      disabled={isStreaming || isCollectingContext}
                    />

                    <div className="p-3 flex items-end gap-2">
                      <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('ai.placeholder')}
                        rows={1}
                        className="min-h-[40px] max-h-32 resize-none py-2.5"
                      />
                      <Button
                        onClick={handleSend}
                        loading={isStreaming || isCollectingContext}
                        disabled={!input.trim()}
                        className="h-10 w-10 p-0 flex-shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DisabledState() {
  const { t } = useI18n();
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <Bot className="h-10 w-10 text-text-secondary/60 mb-4" />
      <h3 className="text-base font-semibold text-text-primary">
        {t('ai.disabledTitle')}
      </h3>
      <p className="text-sm text-text-secondary mt-1">
        {t('ai.disabledDescription')}
      </p>
    </div>
  );
}

function SessionRow({
  session,
  active,
  onSelect,
  onDelete,
}: {
  session: AiSession;
  active: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <button
      data-testid={`ai-session-item-${session.id}`}
      onClick={onSelect}
      className={cn(
        'group w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs border transition-colors text-left',
        active
          ? 'bg-accent/10 border-accent/40 text-accent'
          : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:bg-bg-surface',
      )}
      title={session.title}
    >
      <span className="truncate flex-1 min-w-0">{session.title}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onDelete(session.id);
          }
        }}
        className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 focus:opacity-100"
        title="删除"
      >
        <X className="h-3 w-3" />
      </span>
    </button>
  );
}

function ContextTagBar({
  view,
  viewLabel,
  selection,
  enabledSources,
  onToggleSource,
  onClearSelection,
}: {
  view: string;
  viewLabel: string;
  selection: AiSelection | null;
  enabledSources: AiContextSource[];
  onToggleSource: (source: AiContextSource) => void;
  onClearSelection: () => void;
}) {
  const { t } = useI18n();
  if (view === 'unknown' && !selection && enabledSources.length === 0) return null;

  return (
    <div
      data-testid="ai-context-tags"
      className="px-3 pt-2 flex flex-wrap gap-1.5 items-center"
    >
      {view !== 'unknown' && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border bg-accent/10 border-accent/20 text-accent">
          {t('ai.contextView', { view: viewLabel })}
        </span>
      )}
      {enabledSources.map((source) => (
        <span
          key={source}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[10px] border bg-bg-elevated border-border text-text-secondary"
        >
          {t(`ai.source${capitalize(source)}`)}
          <button
            type="button"
            data-testid={`ai-remove-source-${source}`}
            onClick={() => onToggleSource(source)}
            className="p-0.5 rounded hover:bg-border hover:text-text-primary"
            title={t('common.remove')}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {selection && (
        <span className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-[10px] border bg-bg-elevated border-border text-text-secondary max-w-[200px]">
          <span className="truncate">{t('ai.contextSelection', { label: selection.label })}</span>
          <button
            type="button"
            data-testid="ai-remove-selection"
            onClick={onClearSelection}
            className="p-0.5 rounded hover:bg-border hover:text-text-primary flex-shrink-0"
            title={t('common.remove')}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}

function TemplateChips({
  selectedId,
  onSelect,
  disabled,
}: {
  selectedId: string | null;
  onSelect: (template: AiStyleTemplate) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      data-testid="ai-template-chips"
      className="px-3 pt-2 overflow-x-auto scrollbar-thin"
    >
      <div className="flex items-center gap-2 min-w-min pb-1">
        {AI_STYLE_TEMPLATES.map((template) => {
          const active = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              data-testid={`ai-template-${template.id}`}
              onClick={() => onSelect(template)}
              disabled={disabled}
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors disabled:opacity-50',
                active
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-accent/40 hover:bg-bg-surface',
              )}
            >
              {template.icon}
              {t(template.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function capitalize(value: AiContextSource): string {
  const map: Record<AiContextSource, string> = {
    workspaceSummary: 'WorkspaceSummary',
    timeline: 'Timeline',
    characters: 'Characters',
    locations: 'Locations',
    outline: 'Outline',
    notes: 'Notes',
    selectedEntity: 'SelectedEntity',
  };
  return map[value];
}

const APPLY_TARGETS: Array<{
  target: AiInsertTarget;
  mode?: 'insert' | 'replace';
  icon: React.ReactNode;
  labelKey: string;
}> = [
  {
    target: 'novel_chapter',
    mode: 'insert',
    icon: <BookOpen className="h-3.5 w-3.5" />,
    labelKey: 'ai.insertNovelChapter',
  },
  {
    target: 'novel_chapter',
    mode: 'replace',
    icon: <BookOpen className="h-3.5 w-3.5" />,
    labelKey: 'ai.replaceSelection',
  },
  {
    target: 'notebook_content',
    mode: 'insert',
    icon: <StickyNote className="h-3.5 w-3.5" />,
    labelKey: 'ai.insertNotebookContent',
  },
  {
    target: 'notebook_content',
    mode: 'replace',
    icon: <StickyNote className="h-3.5 w-3.5" />,
    labelKey: 'ai.replaceSelection',
  },
  {
    target: 'outline_node_content',
    mode: 'insert',
    icon: <ListTree className="h-3.5 w-3.5" />,
    labelKey: 'ai.insertOutlineNodeContent',
  },
  {
    target: 'outline_node_content',
    mode: 'replace',
    icon: <ListTree className="h-3.5 w-3.5" />,
    labelKey: 'ai.replaceOutlineNodeContent',
  },
  { target: 'note', icon: <StickyNote className="h-3.5 w-3.5" />, labelKey: 'ai.insertNote' },
  { target: 'outline', icon: <ListTree className="h-3.5 w-3.5" />, labelKey: 'ai.insertOutline' },
  { target: 'outline_node', icon: <ListTree className="h-3.5 w-3.5" />, labelKey: 'ai.insertOutlineNode' },
  { target: 'event', icon: <Calendar className="h-3.5 w-3.5" />, labelKey: 'ai.insertEvent' },
  { target: 'vn_scene', icon: <Clapperboard className="h-3.5 w-3.5" />, labelKey: 'ai.insertVnScene' },
  { target: 'character', icon: <User className="h-3.5 w-3.5" />, labelKey: 'ai.insertCharacter' },
  { target: 'location', icon: <MapPin className="h-3.5 w-3.5" />, labelKey: 'ai.insertLocation' },
];

function isEditorTarget(target: AiInsertTarget): boolean {
  return (
    target === 'novel_chapter' ||
    target === 'notebook_content' ||
    target === 'outline_node_content'
  );
}

function editorTypeForTarget(target: AiInsertTarget): 'novel' | 'notebook' | 'outline' {
  switch (target) {
    case 'novel_chapter':
      return 'novel';
    case 'notebook_content':
      return 'notebook';
    case 'outline_node_content':
      return 'outline';
  }
  throw new Error(`Not an editor target: ${target}`);
}

function isTargetEnabledForView(target: AiInsertTarget, view: string): boolean {
  if (isEditorTarget(target)) {
    return editorTypeForTarget(target) === view;
  }
  switch (target) {
    case 'note':
    case 'outline':
      return true;
    case 'outline_node':
      return view === 'outline';
    case 'event':
      return view === 'timeline';
    case 'vn_scene':
      return view === 'vn';
    case 'character':
      return view === 'characters';
    case 'location':
      return view === 'map';
    default:
      return false;
  }
}

function isTargetRecommendedForView(target: AiInsertTarget, view: string): boolean {
  if (isEditorTarget(target)) {
    return editorTypeForTarget(target) === view;
  }
  switch (view) {
    case 'timeline':
      return target === 'event';
    case 'characters':
      return target === 'character';
    case 'map':
      return target === 'location';
    case 'outline':
      return target === 'outline' || target === 'outline_node';
    case 'vn':
      return target === 'vn_scene';
    default:
      return false;
  }
}

function MessageBubble({
  message,
  workspaceId,
  currentView,
}: {
  message: { id: string; role: string; content: string };
  workspaceId: string;
  currentView: string;
}) {
  const isUser = message.role === 'user';
  const apply = useApplyAiOutput(workspaceId);

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[12px] px-3 py-2 text-sm whitespace-pre-wrap',
          isUser
            ? 'bg-accent text-white rounded-tr-sm'
            : 'bg-bg-elevated text-text-primary border border-border rounded-tl-sm',
        )}
      >
        {message.content}
      </div>
      {!isUser && (
        <ApplyDropdown
          targets={APPLY_TARGETS}
          view={currentView}
          onApply={(target, mode) =>
            apply.mutate({ target, content: message.content, mode })
          }
          disabled={apply.isPending}
        />
      )}
    </div>
  );
}

interface ApplyDropdownProps {
  targets: typeof APPLY_TARGETS;
  view: string;
  onApply: (target: AiInsertTarget, mode?: 'insert' | 'replace') => void;
  disabled?: boolean;
}

function ApplyDropdown({ targets, view, onApply, disabled }: ApplyDropdownProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editorSelection = useEditorSelectionStore();

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const isItemDisabled = (item: (typeof targets)[number]) => {
    if (disabled) return true;
    if (!isTargetEnabledForView(item.target, view)) return true;
    if (isEditorTarget(item.target)) {
      const expectedType = editorTypeForTarget(item.target);
      if (editorSelection.type !== expectedType) return true;
      if (item.mode === 'replace') {
        if (item.target === 'outline_node_content') {
          return !editorSelection.nodeId;
        }
        const sel = editorSelection.selection;
        return !sel || sel.from === sel.to;
      }
    }
    return false;
  };

  const recommended = targets.filter((a) => isTargetRecommendedForView(a.target, view));
  const other = targets.filter((a) => !isTargetRecommendedForView(a.target, view));

  return (
    <div className="relative mt-1.5">
      <button
        ref={buttonRef}
        type="button"
        data-testid="ai-apply-dropdown"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px]',
          'bg-bg-elevated border border-border text-text-secondary',
          'hover:text-text-primary hover:border-accent/40 transition-colors',
          'disabled:opacity-50',
        )}
      >
        {t('ai.apply')}
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          ref={menuRef}
          data-testid="ai-apply-menu"
          className="absolute left-0 top-full mt-1 z-20 min-w-[180px] rounded-[8px] border border-border bg-bg-surface shadow-[var(--shadow-elevated-soft)] p-1 outline-none"
        >
          {recommended.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                {t('ai.applyRecommended')}
              </div>
              {recommended.map((a) => {
                const itemDisabled = isItemDisabled(a);
                return (
                  <button
                    key={`${a.target}-${a.mode ?? 'default'}`}
                    type="button"
                    role="menuitem"
                    disabled={itemDisabled}
                    onClick={() => {
                      if (itemDisabled) return;
                      onApply(a.target, a.mode);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-sm rounded-[6px] flex items-center gap-2',
                      'text-text-primary hover:bg-bg-elevated focus:bg-bg-elevated focus:outline-none',
                      itemDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                    )}
                  >
                    {a.icon}
                    {t(a.labelKey)}
                  </button>
                );
              })}
            </div>
          )}
          {recommended.length > 0 && other.length > 0 && (
            <div className="h-px bg-border my-1" role="separator" />
          )}
          {other.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                {t('ai.applyOther')}
              </div>
              {other.map((a) => {
                const itemDisabled = isItemDisabled(a);
                return (
                  <button
                    key={`${a.target}-${a.mode ?? 'default'}`}
                    type="button"
                    role="menuitem"
                    disabled={itemDisabled}
                    onClick={() => {
                      if (itemDisabled) return;
                      onApply(a.target, a.mode);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-sm rounded-[6px] flex items-center gap-2',
                      'text-text-primary hover:bg-bg-elevated focus:bg-bg-elevated focus:outline-none',
                      itemDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
                    )}
                  >
                    {a.icon}
                    {t(a.labelKey)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
