import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Bot,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Command,
  Database,
  HelpCircle,
  ListTree,
  Loader2,
  MapPin,
  MessageSquarePlus,
  PanelLeft,
  PanelRightClose,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { Button, EmptyState, Input, Markdown, Textarea } from '@/components/ui';
import { useI18n } from '@/hooks/useI18n';
import { cn } from '@/lib/utils';
import { MOTION_BASE } from '@/lib/motion';
import { getScenePreset } from '@/lib/motionOrchestrator';
import { useUIStore } from '@/stores/ui';
import { useSettingsQuery } from '@/features/settings/hooks';
import { getWorkspace } from '@/features/workspace/api';
import { toastError, toastSuccess } from '@/stores/toast';
import { useAiContextStore } from '@/stores/aiContext';
import { useEditorSelectionStore } from '@/stores/editorSelection';
import { getProviderPreset } from '@/features/ai/providers';
import { aiChatStream, searchAiChunks } from '@/features/ai/api';
import {
  collectAiContext,
  estimateContextBudget,
  type AiContextSource,
} from '@/features/ai/contextCollector';
import {
  aiMessagesKey,
  aiSessionsKey,
  useAiConnectionTest,
  useAiIndexWorkspace,
  useAiKvGet,
  useAiMessagesQuery,
  useAiSessionsQuery,
  useApplyAiOutput,
  useCheckTimelineConsistency,
  useClearAiCache,
  useCreateAiSession,
  useDeleteAiSession,
  useOptimizeEvent,
  useOptimizeTimelineSegment,
  useSummarizeWorkspace,
} from '@/features/ai/hooks';
import {
  AI_STYLE_TEMPLATES,
  type AiStyleTemplate,
} from '@/features/ai/promptTemplates';
import type {
  AiActionType,
  AiChatContext,
  AiContextScope,
  AiInsertTarget,
  AiMessage,
  AiRagChunk,
  AiSession,
  AiShortcutInput,
  AiShortcutResult,
} from '@/types';
import type { AiSelection } from '@/stores/aiContext';

interface AiAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

interface SlashCommand {
  id: string;
  labelKey: string;
  descriptionKey: string;
  action: AiActionType | 'ask' | 'whole_workspace';
}

function scrollToBottom(element: HTMLElement, smooth: boolean) {
  const behavior = smooth ? ('smooth' as const) : ('auto' as const);
  if (typeof element.scrollTo === 'function') {
    try {
      element.scrollTo({ top: element.scrollHeight, behavior });
    } catch {
      element.scrollTop = element.scrollHeight;
    }
  } else {
    element.scrollTop = element.scrollHeight;
  }
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'optimize_event',
    labelKey: 'ai.commandOptimizeEvent',
    descriptionKey: 'ai.commandDescriptionOptimizeEvent',
    action: 'optimize_event',
  },
  {
    id: 'optimize_timeline_segment',
    labelKey: 'ai.commandOptimizeTimeline',
    descriptionKey: 'ai.commandDescriptionOptimizeTimeline',
    action: 'optimize_timeline_segment',
  },
  {
    id: 'summarize_workspace',
    labelKey: 'ai.commandSummarize',
    descriptionKey: 'ai.commandDescriptionSummarize',
    action: 'summarize_workspace',
  },
  {
    id: 'check_timeline_consistency',
    labelKey: 'ai.commandCheckConsistency',
    descriptionKey: 'ai.commandDescriptionCheckConsistency',
    action: 'check_timeline_consistency',
  },
  {
    id: 'whole_workspace',
    labelKey: 'ai.wholeWorkspaceAction',
    descriptionKey: 'ai.commandDescriptionWholeWorkspace',
    action: 'whole_workspace',
  },
  {
    id: 'ask',
    labelKey: 'ai.slashAsk',
    descriptionKey: 'ai.slashDescriptionAsk',
    action: 'ask',
  },
];

export function AiAssistantPanel({
  open,
  onClose,
  workspaceId,
}: AiAssistantPanelProps) {
  const { t } = useI18n();
  const enhancedAnimations = useUIStore((s) => s.enhancedAnimations);
  // AI 面板展开场景：面板滑入 220ms，内容淡入 180ms（延迟 40ms）。
  // 退化模式下两者同步 200ms 淡入，无延迟。
  const panelPreset = getScenePreset('aiPanelExpand', { enhanced: enhancedAnimations });
  const { data: settings } = useSettingsQuery();
  const connectionTest = useAiConnectionTest(
    settings?.aiBaseUrl ?? '',
    settings?.aiApiKey ?? '',
    settings?.aiModel ?? '',
    settings?.aiProvider ?? '',
    Boolean(settings?.aiEnabled) && open,
  );
  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
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
  const [showCapabilitiesPanel, setShowCapabilitiesPanel] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [retrievedChunksCount, setRetrievedChunksCount] = useState<number | null>(null);
  const [contextBudget, setContextBudget] = useState<{ entities: number; chars: number } | null>(
    null,
  );
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useAiMessagesQuery(currentSessionId);
  const createSession = useCreateAiSession(workspaceId);
  const deleteSession = useDeleteAiSession(workspaceId);
  const indexWorkspace = useAiIndexWorkspace(workspaceId);
  const { data: summary } = useAiKvGet(workspaceId, 'workspace_summary');
  const optimizeEvent = useOptimizeEvent(workspaceId);
  const optimizeTimelineSegment = useOptimizeTimelineSegment(workspaceId);
  const summarizeWorkspace = useSummarizeWorkspace(workspaceId);
  const checkTimelineConsistency = useCheckTimelineConsistency(workspaceId);
  const clearCache = useClearAiCache(workspaceId);

  const mutationForAction = (action: AiActionType): UseMutationResult<AiShortcutResult, Error, AiShortcutInput> => {
    const mutationMap: Record<AiActionType, UseMutationResult<AiShortcutResult, Error, AiShortcutInput>> = {
      optimize_event: optimizeEvent,
      optimize_timeline_segment: optimizeTimelineSegment,
      summarize_workspace: summarizeWorkspace,
      check_timeline_consistency: checkTimelineConsistency,
    };
    return mutationMap[action];
  };

  useEffect(() => {
    if (open && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0]?.id ?? null);
    }
  }, [open, sessions, currentSessionId]);

  useEffect(() => {
    const area = messageAreaRef.current;
    if (!area) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      scrollToBottom(area, !reduced);
    });
  }, [messages.length, streamingContent, isStreaming]);

  const aiContext = useAiContextStore();

  const slashQuery = useMemo(() => {
    if (!input.startsWith('/')) return '';
    return input.slice(1).toLowerCase();
  }, [input]);

  const filteredSlashCommands = useMemo(() => {
    if (!showSlashMenu) return [];
    if (!slashQuery) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((cmd) =>
      t(cmd.labelKey).toLowerCase().includes(slashQuery),
    );
  }, [showSlashMenu, slashQuery, t]);

  useEffect(() => {
    if (filteredSlashCommands.length === 0) {
      setShowSlashMenu(false);
      return;
    }
    setSlashIndex((prev) => Math.min(prev, filteredSlashCommands.length - 1));
  }, [filteredSlashCommands.length]);

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    if (!open) {
      setShowSlashMenu(false);
      setShowCapabilitiesPanel(false);
    }
  }, [open]);

  const handleNewSession = async () => {
    const session = await createSession.mutateAsync({
      workspaceId,
      title: undefined,
    });
    setCurrentSessionId(session.id);
  };

  const toggleSource = (source: AiContextSource) => {
    const next = aiContext.enabledSources.includes(source)
      ? aiContext.enabledSources.filter((s) => s !== source)
      : [...aiContext.enabledSources, source];
    aiContext.setEnabledSources(next);
  };

  const enabled = settings?.aiEnabled ?? false;

  const sendMessage = async (text: string, ragChunks?: AiRagChunk[]) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || isCollectingContext) return;
    setInput('');
    setShowSlashMenu(false);
    setIsStreaming(true);
    setIsCollectingContext(true);
    setStreamingContent('');
    setRetrievedChunksCount(null);

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
      setContextBudget(estimateContextBudget(context ?? {}));
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
          ragChunks,
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
      setRetrievedChunksCount(
        (result.retrievedChunks ?? 0) + (ragChunks?.length ?? 0),
      );
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
    if (showSlashMenu && filteredSlashCommands.length > 0) {
      const cmd = filteredSlashCommands[slashIndex];
      if (cmd) {
        executeSlashCommand(cmd);
        return;
      }
    }
    if (input.startsWith('/whole-workspace')) {
      void runWholeWorkspace(input);
      return;
    }
    void sendMessage(input);
  };

  const executeSlashCommand = (cmd: SlashCommand) => {
    setShowSlashMenu(false);
    if (cmd.action === 'ask') {
      setInput('/ask ');
      return;
    }
    if (cmd.action === 'whole_workspace') {
      setInput('/whole-workspace ');
      return;
    }
    const action = cmd.action;
    const scope = scopeForAction(action);
    const mutation = mutationForAction(action);
    void runShortcut(action, scope, mutation);
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

  const runShortcut = async (
    action: AiActionType,
    scope: AiContextScope,
    mutation: UseMutationResult<AiShortcutResult, Error, AiShortcutInput>,
  ) => {
    if (!enabled || isStreaming || isCollectingContext || mutation.isPending) return;
    setIsCollectingContext(true);
    setRetrievedChunksCount(null);
    try {
      let context = await collectAiContext(
        workspaceId,
        aiContext.enabledSources,
        aiContext.selection,
        scope,
      );
      if (summary?.value && scope !== 'selected_entity') {
        context = { ...context, workspaceSummary: summary.value };
      }
      setContextBudget(estimateContextBudget(context ?? {}));
      const result = await mutation.mutateAsync({
        workspaceId,
        sessionId: currentSessionId,
        action,
        context,
        query: aiContext.selection?.label,
      });
      setCurrentSessionId(result.sessionId);
      setRetrievedChunksCount(result.retrievedChunks ?? null);
    } catch {
      // 错误由 mutation 的 onError 处理
    } finally {
      setIsCollectingContext(false);
    }
  };

  const runWholeWorkspace = async (text: string) => {
    if (!enabled || isStreaming || isCollectingContext) return;
    const query = text.replace(/^\/whole-workspace\s*/, '').trim();
    const finalQuery = query || t('ai.wholeWorkspaceDefaultQuery');
    setInput('');
    setShowSlashMenu(false);
    setIsCollectingContext(true);
    try {
      await indexWorkspace.mutateAsync();
      const chunks = await searchAiChunks(workspaceId, finalQuery, 5);
      setRetrievedChunksCount(chunks.length);
      await sendMessage(finalQuery, chunks);
    } catch {
      // 错误由 mutation / toast 处理
    } finally {
      setIsCollectingContext(false);
    }
  };

  interface CapabilityConfig {
    action: AiActionType | 'whole_workspace';
    scope: AiContextScope;
    icon: React.ReactNode;
    labelKey: string;
    hintKey: string;
    available: boolean;
    onClick?: () => void;
  }

  const capabilities: CapabilityConfig[] = [
    {
      action: 'optimize_event',
      scope: 'selected_entity',
      icon: <Sparkles className="h-3.5 w-3.5" />,
      labelKey: 'ai.optimizeEvent',
      hintKey: 'ai.capabilityHintEvent',
      available: aiContext.selection?.type === 'event',
    },
    {
      action: 'optimize_timeline_segment',
      scope: 'current_view',
      icon: <Calendar className="h-3.5 w-3.5" />,
      labelKey: 'ai.optimizeTimelineSegment',
      hintKey: 'ai.capabilityHintTimeline',
      available: aiContext.view === 'timeline',
    },
    {
      action: 'summarize_workspace',
      scope: 'whole_workspace',
      icon: <BookOpen className="h-3.5 w-3.5" />,
      labelKey: 'ai.summarizeWorkspace',
      hintKey: 'ai.capabilityHintSummary',
      available: true,
    },
    {
      action: 'check_timeline_consistency',
      scope: 'whole_workspace',
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
      labelKey: 'ai.checkTimelineConsistency',
      hintKey: 'ai.capabilityHintConsistency',
      available: aiContext.view === 'timeline',
    },
    {
      action: 'whole_workspace',
      scope: 'whole_workspace',
      icon: <Database className="h-3.5 w-3.5" />,
      labelKey: 'ai.wholeWorkspaceAction',
      hintKey: 'ai.capabilityHintWholeWorkspace',
      available: true,
      onClick: () => void runWholeWorkspace(t('ai.wholeWorkspaceDefaultQuery')),
    },
  ];

  function CapabilityPanel() {
    if (!showCapabilitiesPanel) return null;
    return (
      <div
        data-testid="ai-capability-panel"
        className="border-b border-border bg-bg-base px-3 py-2 text-xs"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-medium text-text-primary">{t('ai.capabilitiesTitle')}</span>
          <button
            type="button"
            onClick={() => setShowCapabilitiesPanel(false)}
            className="p-0.5 rounded hover:bg-border text-text-secondary"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <ul className="space-y-1 text-text-secondary">
          {capabilities.map((cap) => (
            <li key={cap.action} className="flex items-start gap-1.5">
              <span className={cn('mt-0.5', cap.available ? 'text-accent' : 'text-text-secondary/60')}>
                {cap.icon}
              </span>
              <span>
                <span className="font-medium text-text-primary">{t(cap.labelKey)}</span>
                <span className="mx-1">·</span>
                <span>{t(cap.hintKey)}</span>
                {!cap.available && (
                  <span className="ml-1 text-text-secondary/60">({t('ai.capabilityDisabledHint')})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function CapabilityChips() {
    return (
      <div
        data-testid="ai-capability-chips"
        className="flex-shrink-0 border-b border-border bg-bg-base px-3 py-2 overflow-x-auto scrollbar-thin"
      >
        <div className="flex items-center gap-1.5 mb-1.5 min-w-min">
          <Sparkles className="h-3 w-3 text-accent" />
          <span className="text-xs font-medium text-text-primary" data-testid="ai-capabilities-title">
            {t('ai.capabilitiesTitle')}
          </span>
          <button
            type="button"
            data-testid="ai-capabilities-intro"
            onClick={() => setShowCapabilitiesPanel((v) => !v)}
            className="inline-flex items-center gap-0.5 text-[10px] text-text-secondary hover:text-text-primary"
            title={t('ai.capabilitiesIntro')}
          >
            {t('ai.capabilitiesShortIntro')}
            {showCapabilitiesPanel ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <HelpCircle className="h-3 w-3" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 min-w-min">
          {capabilities.map((cap) => {
            const isWholeWorkspace = cap.action === 'whole_workspace';
            const mutation = isWholeWorkspace
              ? null
              : mutationForAction(cap.action as AiActionType);
            const busy = isCollectingContext || (mutation?.isPending ?? false);
            const disabled = !cap.available || busy;
            const tooltip = cap.available ? t(cap.hintKey) : `${t(cap.hintKey)} · ${t('ai.capabilityDisabledHint')}`;
            return (
              <button
                key={cap.action}
                type="button"
                data-testid={`ai-capability-${cap.action}`}
                disabled={disabled}
                title={tooltip}
                onClick={() => {
                  if (cap.onClick) {
                    cap.onClick();
                  } else if (mutation) {
                    void runShortcut(cap.action as AiActionType, cap.scope, mutation);
                  }
                }}
                className={cn(
                  'flex-shrink-0 inline-flex flex-col items-start px-3 py-1.5 rounded-lg border text-xs transition-colors disabled:opacity-60 text-left',
                  cap.available
                    ? 'bg-bg-elevated border-border text-text-secondary hover:text-text-primary hover:border-accent/50 hover:bg-bg-surface'
                    : 'cursor-not-allowed bg-bg-elevated/70 border-border/70 text-text-secondary/80',
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('transition-colors', cap.available && 'text-accent')}>{cap.icon}</span>
                  {t(cap.labelKey)}
                </span>
                <span className="text-[10px] text-text-secondary/80 mt-0.5 leading-tight">
                  {t(cap.hintKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) =>
          prev === 0 ? filteredSlashCommands.length - 1 : prev - 1,
        );
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    if (e.key === '/' && input.length === 0) {
      setShowSlashMenu(true);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
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
            initial={panelPreset.reduced ? { opacity: 0 } : { x: '100%' }}
            animate={panelPreset.reduced ? { opacity: 1 } : { x: 0 }}
            exit={panelPreset.reduced ? { opacity: 0 } : { x: '100%' }}
            transition={{
              duration: panelPreset.enter.duration,
              ease: panelPreset.enter.ease,
            }}
            data-testid="ai-assistant-panel"
            className="fixed right-0 top-12 bottom-0 w-full max-w-lg border-l border-border bg-bg-surface shadow-[var(--shadow-elevated-soft)] z-40 flex flex-col"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: panelPreset.content?.duration ?? 0.2,
                delay: panelPreset.content?.delay ?? 0,
                ease: panelPreset.content?.ease ?? panelPreset.enter.ease,
              }}
              className="flex flex-col flex-1 min-h-0"
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
                <ConnectionIndicator test={connectionTest} enabled={settings?.aiEnabled ?? false} />
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
                  onClick={() =>
                    void clearCache.mutateAsync().then(() => {
                      toastSuccess(t('ai.clearCacheSuccess'));
                    })
                  }
                  loading={clearCache.isPending}
                  title={t('ai.clearCache')}
                >
                  <Trash2 className="h-4 w-4" />
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
                  <CapabilityChips />
                  <CapabilityPanel />
                  <div
                    ref={messageAreaRef}
                    className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
                    data-testid="ai-message-area"
                  >
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
                    {isStreaming && (
                      <MessageBubble
                        message={{ id: 'streaming', role: 'assistant', content: streamingContent }}
                        workspaceId={workspaceId}
                        currentView={aiContext.view}
                        streaming
                      />
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

                    <div className="p-3 flex items-end gap-2 relative">
                      <Textarea
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
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

                      {showSlashMenu && filteredSlashCommands.length > 0 && (
                        <div
                          ref={slashMenuRef}
                          data-testid="ai-slash-menu"
                          className="absolute left-3 right-[58px] bottom-full mb-1 max-h-60 overflow-y-auto rounded-[8px] border border-border bg-bg-surface shadow-[var(--shadow-elevated-soft)] py-1 z-20"
                        >
                          {filteredSlashCommands.map((cmd, index) => (
                            <button
                              key={cmd.id}
                              type="button"
                              data-testid={`ai-slash-command-${cmd.id}`}
                              onClick={() => executeSlashCommand(cmd)}
                              className={cn(
                                'w-full text-left px-3 py-2 flex items-start gap-2 transition-colors',
                                index === slashIndex
                                  ? 'bg-bg-elevated text-text-primary'
                                  : 'text-text-secondary hover:bg-bg-elevated/50 hover:text-text-primary',
                              )}
                            >
                              <Command className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-xs font-medium">{t(cmd.labelKey)}</div>
                                <div className="text-[10px] text-text-secondary/80">{t(cmd.descriptionKey)}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <ContextBudget budget={contextBudget} />

                    <ContextSummary
                      workspaceName={workspace?.name}
                      selection={aiContext.selection}
                      enabledSources={aiContext.enabledSources}
                      retrievedChunksCount={retrievedChunksCount}
                    />
                  </div>
                </section>
              </div>
            )}
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ContextBudget({
  budget,
}: {
  budget: { entities: number; chars: number } | null;
}) {
  const { t } = useI18n();
  if (!budget) return null;
  return (
    <div
      data-testid="ai-context-budget"
      className="px-3 py-1 border-t border-border flex items-center gap-1 text-[10px] text-text-secondary"
    >
      <Database className="h-3 w-3" />
      {t('ai.contextBudget', {
        entities: budget.entities,
        chars: budget.chars,
      })}
    </div>
  );
}

function ContextSummary({
  workspaceName,
  selection,
  enabledSources,
  retrievedChunksCount,
}: {
  workspaceName?: string;
  selection: AiSelection | null;
  enabledSources: AiContextSource[];
  retrievedChunksCount: number | null;
}) {
  const { t } = useI18n();
  return (
    <div
      data-testid="ai-context-summary"
      className="px-3 py-1.5 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-secondary"
    >
      {workspaceName && (
        <span className="inline-flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {workspaceName}
        </span>
      )}
      {selection && (
        <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
          <Sparkles className="h-3 w-3" />
          {selection.label}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        {enabledSources.length > 0
          ? t('ai.contextSummarySources', { count: enabledSources.length })
          : t('ai.contextSummaryNoSources')}
      </span>
      {retrievedChunksCount !== null && (
        <span className="inline-flex items-center gap-1 text-accent">
          <Search className="h-3 w-3" />
          {t('ai.contextSummaryRetrieved', { count: retrievedChunksCount })}
        </span>
      )}
    </div>
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

function ConnectionIndicator({
  test,
  enabled,
}: {
  test: ReturnType<typeof useAiConnectionTest>;
  enabled: boolean;
}) {
  const { t } = useI18n();

  const meta = (() => {
    if (!enabled) {
      return {
        dot: 'bg-text-secondary',
        label: t('ai.connectionDisabled'),
        text: 'text-text-secondary',
      };
    }
    if (test.isFetching) {
      return {
        dot: 'bg-yellow-500',
        label: t('ai.statusTesting'),
        text: 'text-yellow-600',
      };
    }
    if (test.error || (test.data && test.data.status === 'error')) {
      return {
        dot: 'bg-red-500',
        label: t('ai.statusFailed'),
        text: 'text-red-600',
      };
    }
    if (test.data && test.data.status === 'ok') {
      return {
        dot: 'bg-green-500',
        label: t('ai.statusConnected'),
        text: 'text-green-600',
      };
    }
    return {
      dot: 'bg-text-secondary',
      label: t('ai.statusUnconfigured'),
      text: 'text-text-secondary',
    };
  })();

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs"
      title={test.data?.message ?? meta.label}
    >
      {test.isFetching ? (
        <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
      ) : (
        <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
      )}
      <span className={cn('hidden md:inline', meta.text)}>{meta.label}</span>
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

function scopeForAction(action: AiActionType): AiContextScope {
  switch (action) {
    case 'optimize_event':
      return 'selected_entity';
    case 'optimize_timeline_segment':
      return 'current_view';
    case 'summarize_workspace':
    case 'check_timeline_consistency':
    default:
      return 'whole_workspace';
  }
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

function TypingIndicator() {
  const { t } = useI18n();
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <span
      data-testid="ai-typing-indicator"
      className="inline-flex items-center gap-1 ml-1"
      aria-label={t('ai.thinking')}
      role="status"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-text-secondary/60"
          animate={prefersReduced ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: MOTION_BASE.duration * 4,
            repeat: Infinity,
            delay: i * 0.15,
            ease: MOTION_BASE.ease,
          }}
        />
      ))}
    </span>
  );
}

function MessageBubble({
  message,
  workspaceId,
  currentView,
  streaming = false,
}: {
  message: { id: string; role: string; content: string };
  workspaceId: string;
  currentView: string;
  streaming?: boolean;
}) {
  const isUser = message.role === 'user';
  const apply = useApplyAiOutput(workspaceId);

  return (
    <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-[12px] px-3 py-2 text-sm',
          isUser
            ? 'bg-accent text-white rounded-tr-sm whitespace-pre-wrap'
            : 'bg-bg-elevated text-text-primary border border-border rounded-tl-sm',
          streaming && 'min-h-[120px]',
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : streaming ? (
          <div className="whitespace-pre-wrap">
            {message.content}
            <TypingIndicator />
          </div>
        ) : (
          <Markdown content={message.content} />
        )}
      </div>
      {!isUser && !streaming && (
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
