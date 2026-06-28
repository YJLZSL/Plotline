import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Copy,
  MessageSquarePlus,
  PanelLeft,
  PanelLeftClose,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { Button, EmptyState, Markdown, Textarea } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { useSettingsQuery } from '@/features/settings/hooks';
import { toastError, toastSuccess } from '@/stores/toast';
import { useAiAssistantStore } from '@/features/ai-assistant/store';
import type { AiMessage } from '@/types';

import { aiChatStream } from '../api';
import {
  aiAssistantMessagesKey,
  aiAssistantSessionsKey,
  buildAssistantContext,
  useAiAssistant,
} from '../hooks';
import { getAgentSystemPrompt } from '../prompts';
import { AgentSelector } from './AgentSelector';
import { ContextSelector } from './ContextSelector';

interface AiAssistantViewProps {
  workspaceId: string;
}

function scrollToBottom(element: HTMLElement, smooth: boolean) {
  const behavior = smooth ? ('smooth' as const) : ('auto' as const);
  try {
    element.scrollTo({ top: element.scrollHeight, behavior });
  } catch {
    element.scrollTop = element.scrollHeight;
  }
}

export function AiAssistantView({ workspaceId }: AiAssistantViewProps) {
  const { t } = useI18n();
  const { data: settings } = useSettingsQuery();
  const qc = useQueryClient();
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentAgentId,
    contextMode,
    currentSessionId,
    input,
    isStreaming,
    streamingContent,
    sessions,
    messages,
    createSession,
    deleteSession,
    setCurrentAgentId,
    setContextMode,
    setCurrentSessionId,
    setInput,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    resetStreaming,
    setMessages,
  } = useAiAssistant(workspaceId);

  const sidebarOpen = useAiAssistantStore((s) => s.showAgentPanel);
  const setSidebarOpen = useAiAssistantStore((s) => s.setShowAgentPanel);

  const enabled = settings?.aiEnabled ?? false;

  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0]!.id);
    }
  }, [sessions, currentSessionId, setCurrentSessionId]);

  useEffect(() => {
    const area = messageAreaRef.current;
    if (!area) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      scrollToBottom(area, !reduced);
    });
  }, [messages.length, streamingContent, isStreaming]);

  const handleNewSession = async () => {
    const session = await createSession.mutateAsync({
      workspaceId,
      title: t('aiAssistant.newSessionTitle'),
    });
    setCurrentSessionId(session.id);
  };

  const handleClearSession = async () => {
    if (!currentSessionId) return;
    await deleteSession.mutateAsync(currentSessionId);
    setCurrentSessionId(null);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !enabled) return;

    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const context = await buildAssistantContext(workspaceId, contextMode);
      const result = await aiChatStream(
        {
          workspaceId,
          sessionId: currentSessionId,
          message: trimmed,
          useRag: true,
          context: {
            ...context,
            systemPromptOverride: getAgentSystemPrompt(currentAgentId),
          },
        },
        (event) => {
          if (event.type === 'delta') {
            appendStreamingContent(event.data);
          } else if (event.type === 'error') {
            toastError(event.data);
          }
        },
      );

      setCurrentSessionId(result.sessionId);
      setMessages(result.sessionId, result.messages);
      qc.setQueryData<AiMessage[]>(
        aiAssistantMessagesKey(result.sessionId),
        result.messages,
      );
      qc.invalidateQueries({ queryKey: aiAssistantSessionsKey(workspaceId) });
    } catch {
      // 错误由 onEvent / channel error 处理
    } finally {
      resetStreaming();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toastSuccess(t('aiAssistant.copySuccess'));
    } catch {
      toastError(t('aiAssistant.copyError'));
    }
  };

  if (!enabled) {
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

  return (
    <div className="flex-1 min-h-0 flex bg-bg-base" data-testid="ai-assistant-view">
      <aside
        className={cn(
          'border-r border-border bg-bg-surface flex flex-col',
          sidebarOpen ? 'w-56 flex-shrink-0' : 'hidden',
        )}
      >
        <div className="h-12 flex items-center justify-between px-3 border-b border-border flex-shrink-0">
          <span className="text-sm font-semibold text-text-primary truncate">
            {t('aiAssistant.title')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            title={t('common.close')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-medium text-text-secondary uppercase tracking-wider">
            {t('aiAssistant.agents')}
          </div>
          <AgentSelector currentAgentId={currentAgentId} onSelect={setCurrentAgentId} />

          <div className="px-3 py-2 text-[10px] font-medium text-text-secondary uppercase tracking-wider border-t border-border mt-2">
            {t('aiAssistant.sessions')}
          </div>
          <div className="space-y-1 p-2">
            {sessions.length === 0 && (
              <div className="px-2 py-1 text-xs text-text-secondary">
                {t('ai.empty')}
              </div>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                data-testid={`ai-assistant-session-${session.id}`}
                onClick={() => setCurrentSessionId(session.id)}
                className={cn(
                  'group w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs border transition-colors text-left',
                  currentSessionId === session.id
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
                    void deleteSession.mutateAsync(session.id);
                    if (currentSessionId === session.id) setCurrentSessionId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      void deleteSession.mutateAsync(session.id);
                      if (currentSessionId === session.id) setCurrentSessionId(null);
                    }
                  }}
                  className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 focus:opacity-100"
                  title={t('common.delete')}
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-bg-surface flex-shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            title={t('aiAssistant.openSidebar')}
            data-testid="ai-assistant-open-sidebar"
          >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-text-primary">
              {t('aiAssistant.title')}
            </span>
            <span className="text-xs text-text-secondary hidden sm:inline">
              · {t(`aiAssistant.agent${currentAgentId.charAt(0).toUpperCase() + currentAgentId.slice(1)}`)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewSession}
              loading={createSession.isPending}
              title={t('ai.newSession')}
              data-testid="ai-assistant-new-session"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleClearSession()}
              disabled={!currentSessionId || deleteSession.isPending}
              title={t('aiAssistant.clearSession')}
              data-testid="ai-assistant-clear-session"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div
          ref={messageAreaRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
          data-testid="ai-assistant-message-area"
        >
          {messages.length === 0 && !isStreaming && (
            <EmptyState
              icon={<Bot className="h-8 w-8" />}
              title={t('aiAssistant.emptyTitle')}
              description={t('aiAssistant.emptyDescription')}
            />
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onCopy={() => void handleCopy(msg.content)}
            />
          ))}
          {isStreaming && (
            <MessageBubble
              message={{ id: 'streaming', role: 'assistant', content: streamingContent }}
              streaming
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-border bg-bg-surface p-3 space-y-2">
          <div className="flex items-center justify-between">
            <ContextSelector currentMode={contextMode} onSelect={setContextMode} />
            <span className="text-[10px] text-text-secondary">
              {t('aiAssistant.currentContext', {
                context: t(`aiAssistant.context${contextMode.charAt(0).toUpperCase() + contextMode.slice(1)}`),
              })}
            </span>
          </div>

          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('aiAssistant.placeholder')}
              rows={1}
              className="min-h-[40px] max-h-32 resize-none py-2.5"
              data-testid="ai-assistant-input"
            />
            <Button
              onClick={() => void handleSend()}
              loading={isStreaming}
              disabled={!input.trim() || isStreaming}
              className="h-10 w-10 p-0 flex-shrink-0"
              data-testid="ai-assistant-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

interface MessageBubbleProps {
  message: { id: string; role: string; content: string };
  streaming?: boolean;
  onCopy?: () => void;
}

function MessageBubble({ message, streaming = false, onCopy }: MessageBubbleProps) {
  const { t } = useI18n();
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[12px] px-3 py-2 text-sm relative group',
          isUser
            ? 'bg-accent text-white rounded-tr-sm whitespace-pre-wrap'
            : 'bg-bg-elevated text-text-primary border border-border rounded-tl-sm',
          streaming && 'min-h-[80px]',
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : streaming ? (
          <div className="whitespace-pre-wrap">
            {message.content}
            <span className="inline-block h-2 w-2 rounded-full bg-text-secondary/60 ml-1 align-middle animate-pulse" />
          </div>
        ) : (
          <Markdown content={message.content} />
        )}
        {!isUser && !streaming && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-bg-surface border border-border text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity hover:text-text-primary"
            title={t('aiAssistant.copy')}
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
