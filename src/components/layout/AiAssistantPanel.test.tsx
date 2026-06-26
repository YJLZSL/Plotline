import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  QueryClient,
  QueryClientProvider,
  type UseMutationResult,
  type UseMutateFunction,
} from '@tanstack/react-query';

import '@/i18n';
import { AiAssistantPanel } from './AiAssistantPanel';
import { useAiContextStore, type AiContextState } from '@/stores/aiContext';
import { aiChatStream } from '@/features/ai/api';
import { collectAiContext } from '@/features/ai/contextCollector';
import {
  useAiIndexWorkspace,
  useAiKvGet,
  useAiMessagesQuery,
  useAiSessionsQuery,
  useApplyAiOutput,
  useCreateAiSession,
  useDeleteAiSession,
} from '@/features/ai/hooks';
import { useSettingsQuery } from '@/features/settings/hooks';
import type { AiInsertInput, AiInsertResult, AiMessage, AiSession, CreateAiSessionInput } from '@/types';

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
}));

vi.mock('@/features/ai/api', () => ({
  aiChatStream: vi.fn(),
}));

vi.mock('@/features/ai/contextCollector', () => ({
  collectAiContext: vi.fn(),
}));

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
): UseMutationResult<TData, unknown, TVariables, unknown> {
  return {
    mutate: mutate as UseMutateFunction<TData, unknown, TVariables, unknown>,
    mutateAsync: vi.fn(),
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
  } as UseMutationResult<TData, unknown, TVariables, unknown>;
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
    makeMutationResult<AiInsertResult, Omit<AiInsertInput, 'workspaceId'>>(vi.fn()),
  );
  vi.mocked(aiChatStream).mockResolvedValue({
    sessionId: 'session-1',
    reply: '',
    messages: [],
  });
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
});
