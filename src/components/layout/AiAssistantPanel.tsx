import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Calendar,
  Clapperboard,
  ListTree,
  MapPin,
  MessageSquarePlus,
  PanelRightClose,
  Send,
  Sparkles,
  StickyNote,
  User,
  X,
} from 'lucide-react';

import { Button, EmptyState, Textarea } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import { useSettingsQuery } from '@/features/settings/hooks';
import { toastError } from '@/stores/toast';
import { useAiContextStore } from '@/stores/aiContext';
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
import type { AiChatContext, AiMessage, AiSession } from '@/types';
import type { AiSelection } from '@/stores/aiContext';

interface AiAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

const SOURCE_OPTIONS: { value: AiContextSource; labelKey: string }[] = [
  { value: 'workspaceSummary', labelKey: 'ai.sourceWorkspaceSummary' },
  { value: 'timeline', labelKey: 'ai.sourceTimeline' },
  { value: 'characters', labelKey: 'ai.sourceCharacters' },
  { value: 'locations', labelKey: 'ai.sourceLocations' },
  { value: 'outline', labelKey: 'ai.sourceOutline' },
  { value: 'notes', labelKey: 'ai.sourceNotes' },
];

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

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming || isCollectingContext) return;
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
          message: text,
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

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
            className="fixed right-0 top-12 bottom-0 w-full max-w-md border-l border-border bg-bg-surface shadow-[var(--shadow-elevated)] z-40 flex flex-col"
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
              <>
                <SessionList
                  sessions={sessions}
                  currentId={currentSessionId}
                  onSelect={setCurrentSessionId}
                  onDelete={(id) => {
                    void deleteSession.mutateAsync(id);
                    if (currentSessionId === id) setCurrentSessionId(null);
                  }}
                />

                <ContextPanel
                  summary={summary?.value}
                  selection={aiContext.selection}
                  enabledSources={aiContext.enabledSources}
                  onToggleSource={toggleSource}
                  onClearSelection={aiContext.clearSelection}
                />

                {aiContext.suggestions.length > 0 && (
                  <div className="mx-4 mt-3 px-3 py-2 rounded-[6px] bg-bg-elevated border border-border text-xs">
                    <div className="flex flex-wrap gap-1.5">
                      {aiContext.suggestions.map((s) => (
                        <button
                          key={s.label}
                          data-testid={`ai-suggestion-${s.label}`}
                          onClick={() => setInput(s.prompt)}
                          className="px-2 py-1 rounded-[4px] bg-bg-base border border-border text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && !isStreaming && (
                    <EmptyState
                      icon={<Bot className="h-8 w-8" />}
                      title={t('ai.empty')}
                      description={t('ai.emptyEnabled')}
                    />
                  )}
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} workspaceId={workspaceId} />
                  ))}
                  {isStreaming && streamingContent && (
                    <MessageBubble
                      message={{ id: 'streaming', role: 'assistant', content: streamingContent }}
                      workspaceId={workspaceId}
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

                <div className="p-3 border-t border-border bg-bg-base flex-shrink-0 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {SOURCE_OPTIONS.map((source) => {
                      const active = aiContext.enabledSources.includes(source.value);
                      return (
                        <button
                          key={source.value}
                          onClick={() => toggleSource(source.value)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-[5px] text-[10px] border transition-colors',
                            active
                              ? 'bg-accent/10 border-accent/40 text-accent'
                              : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary',
                          )}
                          title={t(source.labelKey)}
                        >
                          <span
                            className={cn(
                              'h-3 w-3 rounded-[2px] border flex items-center justify-center',
                              active
                                ? 'bg-accent border-accent'
                                : 'border-text-secondary/40',
                            )}
                          >
                            {active && <span className="h-2 w-2 bg-bg-base rounded-[1px]" />}
                          </span>
                          {t(source.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('ai.placeholder')}
                      rows={1}
                      className="min-h-[40px] max-h-32 resize-none py-2.5"
                    />
                    <Button
                      onClick={() => void handleSend()}
                      loading={isStreaming || isCollectingContext}
                      disabled={!input.trim()}
                      className="h-10 w-10 p-0 flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
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

function SessionList({
  sessions,
  currentId,
  onSelect,
  onDelete,
}: {
  sessions: AiSession[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  if (sessions.length === 0) {
    return (
      <div className="px-4 py-2 text-xs text-text-secondary">
        {t('ai.empty')}
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-b border-border max-h-32 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
        {t('ai.sessions')}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={cn(
              'group flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs border transition-colors',
              currentId === session.id
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary',
            )}
            title={session.title}
          >
            <span className="truncate max-w-[140px]">{session.title}</span>
            <X
              className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(session.id);
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ContextPanel({
  summary,
  selection,
  enabledSources,
  onToggleSource,
  onClearSelection,
}: {
  summary?: string;
  selection: AiSelection | null;
  enabledSources: AiContextSource[];
  onToggleSource: (source: AiContextSource) => void;
  onClearSelection: () => void;
}) {
  const { t } = useI18n();
  const hasSummary = summary && enabledSources.includes('workspaceSummary');
  const hasTags = hasSummary || selection || enabledSources.length > 0;
  if (!hasTags) return null;

  return (
    <div className="mx-4 mt-3 px-3 py-2 rounded-[6px] bg-bg-elevated border border-border text-xs">
      <div className="flex flex-wrap gap-1.5 items-center text-text-secondary">
        {hasSummary && (
          <span className="px-1.5 py-0.5 rounded-[4px] bg-accent/10 text-accent">
            {t('ai.context')}
          </span>
        )}
        {enabledSources
          .filter((s) => s !== 'workspaceSummary')
          .map((source) => (
            <button
              key={source}
              onClick={() => onToggleSource(source)}
              className="px-1.5 py-0.5 rounded-[4px] bg-bg-base border border-border hover:border-accent/40 transition-colors"
            >
              {t(`ai.source${capitalize(source)}`)}
            </button>
          ))}
        {selection && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-bg-base border border-border truncate max-w-[200px]">
            {t('ai.contextSelection', { label: selection.label })}
            <button
              onClick={onClearSelection}
              className="hover:text-red-500"
              title={t('common.remove')}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}
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

function MessageBubble({
  message,
  workspaceId,
}: {
  message: { id: string; role: string; content: string };
  workspaceId: string;
}) {
  const { t } = useI18n();
  const isUser = message.role === 'user';
  const apply = useApplyAiOutput(workspaceId);

  const actions: Array<{
    target: 'note' | 'outline' | 'event' | 'vn_scene' | 'character' | 'location' | 'outline_node';
    icon: React.ReactNode;
    label: string;
  }> = [
    { target: 'note', icon: <StickyNote className="h-3 w-3" />, label: t('ai.insertNote') },
    { target: 'outline', icon: <ListTree className="h-3 w-3" />, label: t('ai.insertOutline') },
    { target: 'outline_node', icon: <ListTree className="h-3 w-3" />, label: t('ai.insertOutlineNode') },
    { target: 'event', icon: <Calendar className="h-3 w-3" />, label: t('ai.insertEvent') },
    { target: 'vn_scene', icon: <Clapperboard className="h-3 w-3" />, label: t('ai.insertVnScene') },
    { target: 'character', icon: <User className="h-3 w-3" />, label: t('ai.insertCharacter') },
    { target: 'location', icon: <MapPin className="h-3 w-3" />, label: t('ai.insertLocation') },
  ];

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
        <div className="flex flex-wrap gap-1 mt-1.5 max-w-[85%]">
          {actions.map((a) => (
            <button
              key={a.target}
              onClick={() => apply.mutate({ target: a.target, content: message.content })}
              disabled={apply.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-[5px] text-[10px] bg-bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors disabled:opacity-50"
              title={a.label}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
