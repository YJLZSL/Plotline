import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  MessageSquarePlus,
  PanelRightClose,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

import { Button, EmptyState, Textarea } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import { useSettingsQuery } from '@/features/settings/hooks';
import { getProviderPreset } from '@/features/ai/providers';
import {
  useAiChat,
  useAiIndexWorkspace,
  useAiKvGet,
  useAiMessagesQuery,
  useAiSessionsQuery,
  useCreateAiSession,
  useDeleteAiSession,
} from '@/features/ai/hooks';
import type { AiSession } from '@/types';

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
  const { data: sessions = [] } = useAiSessionsQuery(workspaceId);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useAiMessagesQuery(currentSessionId);
  const createSession = useCreateAiSession(workspaceId);
  const deleteSession = useDeleteAiSession(workspaceId);
  const chat = useAiChat(workspaceId);
  const indexWorkspace = useAiIndexWorkspace(workspaceId);
  const { data: summary } = useAiKvGet(workspaceId, 'workspace_summary');

  useEffect(() => {
    if (open && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0]?.id ?? null);
    }
  }, [open, sessions, currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chat.isPending]);

  const handleNewSession = async () => {
    const session = await createSession.mutateAsync({
      workspaceId,
      title: undefined,
    });
    setCurrentSessionId(session.id);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chat.isPending) return;
    setInput('');
    await chat.mutateAsync({
      workspaceId,
      sessionId: currentSessionId,
      message: text,
      useRag: true,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const enabled = settings?.aiEnabled ?? false;

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

                {summary && (
                  <div className="mx-4 mt-3 px-3 py-2 rounded-[6px] bg-bg-elevated border border-border text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">
                      {t('ai.context')}
                    </span>
                    ：{summary.value}
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && !chat.isPending && (
                    <EmptyState
                      icon={<Bot className="h-8 w-8" />}
                      title={t('ai.empty')}
                      description={t('ai.emptyEnabled')}
                    />
                  )}
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {chat.isPending && (
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      {t('ai.thinking')}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-border bg-bg-base flex-shrink-0">
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
                      loading={chat.isPending}
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

function MessageBubble({ message }: { message: { role: string; content: string } }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
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
    </div>
  );
}
