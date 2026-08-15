import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '@/i18n';
import { AiOutputHistoryPanel } from './AiOutputHistoryPanel';
import { useAiOutputHistory } from '@/stores/aiOutputHistory';

function seedVersions() {
  useAiOutputHistory.setState({
    versions: [
      {
        id: 'v1',
        sessionId: 's1',
        content: '第一版大纲内容',
        createdAt: '2026-01-01T00:00:00.000Z',
        label: '整理',
      },
      {
        id: 'v2',
        sessionId: 's1',
        content: '第二版大纲内容',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
      {
        id: 'v3',
        sessionId: 's2',
        content: '其他会话内容',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
    ],
  });
}

describe('AiOutputHistoryPanel', () => {
  beforeEach(() => {
    useAiOutputHistory.setState({ versions: [] });
  });

  it('should render versions only for the active session', () => {
    seedVersions();
    render(
      <AiOutputHistoryPanel sessionId="s1" workspaceId="ws-1" onRestore={vi.fn()} />,
    );

    expect(screen.getAllByTestId('ai-output-history-item')).toHaveLength(2);
    expect(screen.getByText('第一版大纲内容')).toBeInTheDocument();
    expect(screen.queryByText('其他会话内容')).not.toBeInTheDocument();
  });

  it('should show full content in a dialog when viewing a version', async () => {
    const user = userEvent.setup();
    seedVersions();
    render(
      <AiOutputHistoryPanel sessionId="s1" workspaceId="ws-1" onRestore={vi.fn()} />,
    );

    await user.click(screen.getAllByTestId('ai-output-history-view')[0]!);

    await waitFor(() => {
      expect(screen.getByTestId('ai-output-history-detail')).toHaveTextContent(
        '第二版大纲内容',
      );
    });
  });

  it('should call onRestore with the selected version content', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    seedVersions();
    render(
      <AiOutputHistoryPanel sessionId="s1" workspaceId="ws-1" onRestore={onRestore} />,
    );

    await user.click(screen.getAllByTestId('ai-output-history-restore')[1]!);

    expect(onRestore).toHaveBeenCalledWith('第一版大纲内容');
  });

  it('should delete a version from the store', async () => {
    const user = userEvent.setup();
    seedVersions();
    render(
      <AiOutputHistoryPanel sessionId="s1" workspaceId="ws-1" onRestore={vi.fn()} />,
    );

    await user.click(screen.getAllByTestId('ai-output-history-delete')[0]!);

    expect(useAiOutputHistory.getState().versions.map((v) => v.id)).toEqual([
      'v1',
      'v3',
    ]);
  });

  it('should show an empty state when the session has no versions', () => {
    render(
      <AiOutputHistoryPanel sessionId="s1" workspaceId="ws-1" onRestore={vi.fn()} />,
    );

    expect(screen.getByTestId('ai-output-history-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-output-history-item')).not.toBeInTheDocument();
  });

  it('should render nothing without a session id', () => {
    render(
      <AiOutputHistoryPanel sessionId={null} workspaceId="ws-1" onRestore={vi.fn()} />,
    );

    expect(screen.queryByTestId('ai-output-history-panel')).not.toBeInTheDocument();
  });
});
