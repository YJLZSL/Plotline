import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationResult,
  type UseMutateFunction,
  type UseMutateAsyncFunction,
} from '@tanstack/react-query';

import '@/i18n';
import { AiAssistantPanel } from './AiAssistantPanel';
import { useAiContextStore, type AiContextState } from '@/stores/aiContext';
import { aiChatStream, searchAiChunks } from '@/features/ai/api';
import { collectAiContext } from '@/features/ai/contextCollector';
import {
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
import { useSettingsQuery } from '@/features/settings/hooks';
import type {
  AiInsertInput,
  AiInsertResult,
  AiMessage,
  AiSession,
  AiShortcutInput,
  AiShortcutResult,
  CreateAiSessionInput,
} from '@/types';

const applyMutate = vi.fn();

const defaultContext: Partial<AiContextState> = {
  view: 'unknown',
  viewLabel: '',
  selection: null,
  suggestions: [],
  enabledSources: ['workspaceSummary', 'selectedEntity'],
};

vi.mock('@/features/settings/hooks', () => ({
  useSettingsQuery: vi.fn(),
}));

vi.mock('@/features/ai/hooks', () => ({
  aiSessionsKey: (workspaceId: string) => ['aiSessions', workspaceId],
  aiMessagesKey: (sessionId: string) => ['aiMessages', sessionId],
  useAiSessionsQuery: vi.fn(),
  useAiMessagesQuery: vi.fn(),
  useCreateAiSession: vi.fn(),
  useDeleteAiSession: vi.fn(),
  useAiIndexWorkspace: vi.fn(),
  useAiKvGet: vi.fn(),
  useApplyAiOutput: vi.fn(),
  useAiConnectionTest: vi.fn(),
  useOptimizeEvent: vi.fn(),
  useOptimizeTimelineSegment: vi.fn(),
  useSummarizeWorkspace: vi.fn(),
  useCheckTimelineConsistency: vi.fn(),
  useClearAiCache: vi.fn(),
}));

vi.mock('@/features/ai/api', () => ({
  aiChatStream: vi.fn(),
  searchAiChunks: vi.fn(),
}));

vi.mock('@/features/ai/contextCollector', async () => {
  const actual = await vi.importActual<typeof import('@/features/ai/contextCollector')>(
    '@/features/ai/contextCollector',
  );
  return {
    ...actual,
    collectAiContext: vi.fn(),
  };
});

vi.mock('@/features/ai/providers', () => ({
  getProviderPreset: vi.fn(() => ({ color: '#000000', icon: null })),
}));

vi.mock('@/stores/toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

function makeSession(overrides: Partial<AiSession> = {}): AiSession {
  return {
    id: 'session-1',
    workspaceId: 'ws-1',
    title: 'Test Session',
    summary: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeMutationResult<TData, TVariables>(
  mutate: (vars: TVariables) => void,
): UseMutationResult<TData, Error, TVariables, unknown> {
  const mutateAsync = async (vars: TVariables) =>
    (mutate as unknown as (vars: TVariables) => Promise<TData>)(vars);
  return {
    mutate: mutate as UseMutateFunction<TData, Error, TVariables, unknown>,
    mutateAsync: mutateAsync as UseMutateAsyncFunction<TData, Error, TVariables, unknown>,
    isPending: false,
    isError: false,
    isIdle: true,
    isSuccess: false,
    status: 'idle',
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    submittedAt: 0,
    variables: undefined,
    error: null,
    context: undefined,
    data: undefined,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    reset: vi.fn(),
    isLoading: false,
    isInitialLoading: false,
  } as UseMutationResult<TData, Error, TVariables, unknown>;
}

function renderPanel(props: { open?: boolean; workspaceId?: string } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AiAssistantPanel
        open={props.open ?? true}
        workspaceId={props.workspaceId ?? 'ws-1'}
        onClose={() => {}}
      />
    </QueryClientProvider>,
  );
}

function mockHooks(messages: AiMessage[] = []) {
  vi.mocked(useSettingsQuery).mockReturnValue({
    data: { aiEnabled: true, aiProvider: 'openai' },
  } as ReturnType<typeof useSettingsQuery>);
  vi.mocked(useAiSessionsQuery).mockReturnValue({
    data: [makeSession()],
  } as ReturnType<typeof useAiSessionsQuery>);
  vi.mocked(useAiMessagesQuery).mockReturnValue({
    data: messages,
  } as ReturnType<typeof useAiMessagesQuery>);
  vi.mocked(useCreateAiSession).mockReturnValue(
    makeMutationResult<AiSession, CreateAiSessionInput>(vi.fn()),
  );
  vi.mocked(useDeleteAiSession).mockReturnValue(
    makeMutationResult<void, string>(vi.fn()),
  );
  vi.mocked(useAiIndexWorkspace).mockReturnValue(
    makeMutationResult<void, void>(vi.fn()),
  );
  vi.mocked(useAiKvGet).mockReturnValue({
    data: undefined,
  } as ReturnType<typeof useAiKvGet>);
  vi.mocked(useApplyAiOutput).mockReturnValue(
    makeMutationResult<AiInsertResult, Omit<AiInsertInput, 'workspaceId'>>(applyMutate),
  );
  vi.mocked(useAiConnectionTest).mockReturnValue({
    data: undefined,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useAiConnectionTest>);
  vi.mocked(useOptimizeEvent).mockReturnValue(
    makeMutationResult<AiShortcutResult, AiShortcutInput>(vi.fn()),
  );
  vi.mocked(useOptimizeTimelineSegment).mockReturnValue(
    makeMutationResult<AiShortcutResult, AiShortcutInput>(vi.fn()),
  );
  vi.mocked(useSummarizeWorkspace).mockReturnValue(
    makeMutationResult<AiShortcutResult, AiShortcutInput>(vi.fn()),
  );
  vi.mocked(useCheckTimelineConsistency).mockReturnValue(
    makeMutationResult<AiShortcutResult, AiShortcutInput>(vi.fn()),
  );
  vi.mocked(useClearAiCache).mockReturnValue(
    makeMutationResult<void, void>(vi.fn().mockResolvedValue(undefined)),
  );
  vi.mocked(aiChatStream).mockResolvedValue({
    sessionId: 'session-1',
    reply: '',
    messages: [],
    retrievedChunks: 0,
  });
  vi.mocked(searchAiChunks).mockResolvedValue([]);
  vi.mocked(collectAiContext).mockResolvedValue({});
}

describe('AiAssistantPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiContextStore.setState(defaultContext);
    mockHooks();
  });

  it('renders with a session list column and a message area column', () => {
    useAiContextStore.setState({ view: 'timeline', viewLabel: '时间轴' });
    renderPanel();

    expect(screen.getByTestId('ai-session-list')).toBeInTheDocument();
    expect(screen.getByTestId('ai-message-area')).toBeInTheDocument();
    expect(screen.getByTestId('ai-session-item-session-1')).toHaveTextContent('Test Session');
  });

  it('filters sessions by search term', async () => {
    const user = userEvent.setup();
    vi.mocked(useAiSessionsQuery).mockReturnValue({
      data: [makeSession({ id: 's1', title: 'Alpha' }), makeSession({ id: 's2', title: 'Beta' })],
    } as ReturnType<typeof useAiSessionsQuery>);

    renderPanel();
    const searchInput = screen.getByPlaceholderText('搜索会话');
    await user.type(searchInput, 'Beta');

    await waitFor(() => {
      expect(screen.queryByTestId('ai-session-item-s1')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('ai-session-item-s2')).toBeInTheDocument();
  });

  it('sends a suggestion prompt when a suggestion chip is clicked', async () => {
    const user = userEvent.setup();
    useAiContextStore.setState({
      view: 'timeline',
      viewLabel: '时间轴',
      suggestions: [{ label: 'SuggestA', prompt: 'suggestion prompt text' }],
    });

    renderPanel();
    const chip = screen.getByTestId('ai-suggestion-SuggestA');
    await user.click(chip);

    await waitFor(() => {
      expect(aiChatStream).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'suggestion prompt text' }),
        expect.any(Function),
      );
    });
  });

  it('removes context source tags and selection tag', async () => {
    const user = userEvent.setup();
    useAiContextStore.setState({
      view: 'timeline',
      viewLabel: '时间轴',
      enabledSources: ['workspaceSummary', 'timeline'],
      selection: { type: 'event', id: 'e1', label: 'Event One' },
    });

    renderPanel();
    expect(screen.getByTestId('ai-context-tags')).toBeInTheDocument();

    await user.click(screen.getByTestId('ai-remove-source-timeline'));
    expect(useAiContextStore.getState().enabledSources).not.toContain('timeline');

    await user.click(screen.getByTestId('ai-remove-selection'));
    expect(useAiContextStore.getState().selection).toBeNull();
  });

  it('renders markdown formatting in assistant messages', () => {
    vi.mocked(useAiMessagesQuery).mockReturnValue({
      data: [
        {
          id: 'msg-md',
          sessionId: 'session-1',
          role: 'assistant',
          content: '这是 **粗体**、*斜体* 和 `代码`',
          createdAt: '2026-01-01T00:00:00Z',
        } satisfies AiMessage,
      ],
    } as ReturnType<typeof useAiMessagesQuery>);

    renderPanel();

    expect(screen.getByText('粗体').tagName).toBe('STRONG');
    expect(screen.getByText('斜体').tagName).toBe('EM');
    expect(screen.getByText('代码').tagName).toBe('CODE');
    expect(screen.queryByText('**粗体**')).not.toBeInTheDocument();
  });

  it('renders apply dropdown grouped by current view applicability', async () => {
    const user = userEvent.setup();
    const applyMutate = vi.fn();
    vi.mocked(useApplyAiOutput).mockReturnValue(
      makeMutationResult<AiInsertResult, Omit<AiInsertInput, 'workspaceId'>>(applyMutate),
    );
    vi.mocked(useAiMessagesQuery).mockReturnValue({
      data: [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Generated content',
          createdAt: '2026-01-01T00:00:00Z',
        } satisfies AiMessage,
      ],
    } as ReturnType<typeof useAiMessagesQuery>);

    useAiContextStore.setState({ view: 'timeline', viewLabel: '时间轴' });
    renderPanel();

    await user.click(screen.getByTestId('ai-apply-dropdown'));
    const menu = screen.getByTestId('ai-apply-menu');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveTextContent('插入为事件');
    expect(menu).toHaveTextContent('其他位置');
    expect(menu).toHaveTextContent('插入为笔记');

    await user.click(screen.getByText('插入为事件'));
    expect(applyMutate).toHaveBeenCalledWith({ target: 'event', content: 'Generated content' });
  });

  it('renders AI capability shortcut chips', () => {
    renderPanel();
    expect(screen.getByTestId('ai-capability-chips')).toBeInTheDocument();
    expect(screen.getByTestId('ai-capability-summarize_workspace')).toHaveTextContent('总结工作区');
    expect(screen.getByTestId('ai-capability-check_timeline_consistency')).toHaveTextContent('检查逻辑漏洞');
  });

  it('shows capability helper text and tooltips', () => {
    renderPanel();
    expect(screen.getByTestId('ai-capabilities-title')).toBeInTheDocument();
    expect(screen.getByTestId('ai-capabilities-intro')).toBeInTheDocument();
    const chip = screen.getByTestId('ai-capability-summarize_workspace');
    expect(chip).toHaveAttribute('title');
  });

  it('disables optimize-event chip when no event is selected', () => {
    useAiContextStore.setState({ view: 'timeline', viewLabel: '时间轴', selection: null });
    renderPanel();
    expect(screen.getByTestId('ai-capability-optimize_event')).toBeDisabled();
  });

  it('calls summarize workspace shortcut with whole_workspace scope', async () => {
    const user = userEvent.setup();
    const summarizeMutate = vi.fn().mockResolvedValue({
      sessionId: 'session-summarize',
      reply: 'summary',
      messages: [],
      cached: false,
      entities: [],
    });
    vi.mocked(useSummarizeWorkspace).mockReturnValue(
      makeMutationResult<AiShortcutResult, AiShortcutInput>(summarizeMutate),
    );
    vi.mocked(collectAiContext).mockResolvedValue({ scope: 'whole_workspace' });

    renderPanel();
    await user.click(screen.getByTestId('ai-capability-summarize_workspace'));

    await waitFor(() => {
      expect(summarizeMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          action: 'summarize_workspace',
          context: expect.objectContaining({ scope: 'whole_workspace' }),
        }),
      );
    });
  });

  it('calls optimize-event shortcut with selected_entity scope when an event is selected', async () => {
    const user = userEvent.setup();
    const optimizeMutate = vi.fn().mockResolvedValue({
      sessionId: 'session-optimize',
      reply: 'optimized',
      messages: [],
      cached: false,
      entities: [],
    });
    vi.mocked(useOptimizeEvent).mockReturnValue(
      makeMutationResult<AiShortcutResult, AiShortcutInput>(optimizeMutate),
    );
    vi.mocked(collectAiContext).mockResolvedValue({ scope: 'selected_entity' });

    useAiContextStore.setState({
      view: 'timeline',
      viewLabel: '时间轴',
      selection: { type: 'event', id: 'e1', label: 'Event One' },
    });

    renderPanel();
    await user.click(screen.getByTestId('ai-capability-optimize_event'));

    await waitFor(() => {
      expect(optimizeMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: 'ws-1',
          action: 'optimize_event',
          context: expect.objectContaining({ scope: 'selected_entity' }),
          query: 'Event One',
        }),
      );
    });
  });

  it('runs /whole-workspace command by indexing and passing chunks to chat', async () => {
    const user = userEvent.setup();
    const indexMutate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAiIndexWorkspace).mockReturnValue(
      makeMutationResult<void, void>(indexMutate),
    );
    vi.mocked(searchAiChunks).mockResolvedValue([
      {
        sourceType: 'event',
        sourceId: 'e1',
        content: '艾莉丝醒来',
        score: 0.95,
      },
    ]);

    renderPanel();
    const textarea = screen.getByPlaceholderText('输入消息，按 Enter 发送…');
    await user.type(textarea, '/whole-workspace analyze');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(indexMutate).toHaveBeenCalled();
    });
    expect(searchAiChunks).toHaveBeenCalledWith('ws-1', 'analyze', 5);
    await waitFor(() => {
      expect(aiChatStream).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'analyze',
          ragChunks: [
            expect.objectContaining({
              sourceType: 'event',
              content: '艾莉丝醒来',
            }),
          ],
        }),
        expect.any(Function),
      );
    });
  });

  it('displays context budget after collecting context', async () => {
    const user = userEvent.setup();
    vi.mocked(collectAiContext).mockResolvedValue({
      workspaceSummary: '测试工作区摘要',
      timeline: [
        {
          id: 'e1',
          title: '开场',
          dateValue: 'Day 1',
          trackName: '主线',
          description: '艾莉丝醒来',
        },
      ],
      characters: [{ id: 'c1', name: '艾莉丝', description: '女主角' }],
    });

    renderPanel();
    const textarea = screen.getByPlaceholderText('输入消息，按 Enter 发送…');
    await user.type(textarea, 'hello');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('ai-context-budget')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ai-context-budget')).toHaveTextContent('3');
  });

  it('shows slash command menu when typing / and selects whole-workspace', async () => {
    const user = userEvent.setup();
    renderPanel();
    const textarea = screen.getByPlaceholderText('输入消息，按 Enter 发送…');
    await user.type(textarea, '/');

    await waitFor(() => {
      expect(screen.getByTestId('ai-slash-menu')).toBeInTheDocument();
    });
    expect(screen.getByTestId('ai-slash-command-whole_workspace')).toBeInTheDocument();

    await user.click(screen.getByTestId('ai-slash-command-whole_workspace'));
    expect(textarea).toHaveValue('/whole-workspace ');
  });
});
