import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { OutlineView } from './OutlineView';
import { useAiContextStore } from '@/stores/aiContext';
import { useUIStore } from '@/stores/ui';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => path),
}));

vi.mock('@/lib/ipc', () => ({
  isTauri: () => false,
}));

vi.mock('@/features/outline/hooks', () => ({
  useOutlineQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateOutlineNode: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateOutlineNode: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeleteOutlineNode: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/features/outline/moveHooks', () => ({
  useMoveOutlineNode: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('@/features/timeline/hooks', () => ({
  useCreateEvent: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useTracksQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/features/workspace/hooks', () => ({
  useExportOutlineMarkdown: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

vi.mock('./OutlineTreeChart', () => ({
  OutlineTreeChart: () => null,
}));

function renderView() {
  return render(
    <MemoryRouter>
      <OutlineView workspaceId="ws1" workspaceName="测试工作区" />
    </MemoryRouter>,
  );
}

describe('OutlineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAiContextStore.setState({
      view: 'unknown',
      viewLabel: '',
      selection: null,
      suggestions: [],
      pendingAction: null,
      enabledSources: [],
    });
    useUIStore.setState({ aiPanelOpen: false });
  });

  it('should render the AI organize outline toolbar button', () => {
    renderView();
    expect(screen.getByTestId('outline-ai-organize')).toBeInTheDocument();
  });

  it('should set pending action and open AI panel when AI organize is clicked', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByTestId('outline-ai-organize'));

    await waitFor(() => {
      expect(useAiContextStore.getState().pendingAction).toBe('organize_outline');
    });
    expect(useAiContextStore.getState().view).toBe('outline');
    expect(useUIStore.getState().aiPanelOpen).toBe(true);
  });
});
