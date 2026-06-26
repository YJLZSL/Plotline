import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { WorkspaceSelector } from './WorkspaceSelector';
import { useMotionStore } from '@/stores/motion';
import type { Workspace } from '@/types';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/workspace/hooks', () => ({
  useWorkspacesQuery: vi.fn(),
  useCreateWorkspace: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteWorkspace: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExportWorkspace: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useExportWorkspaceMarkdown: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useImportWorkspace: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateWorkspace: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: vi.fn(() => ({ push: vi.fn() })),
  makeUpdateWorkspaceAction: vi.fn(),
}));

import { useWorkspacesQuery } from '@/features/workspace/hooks';

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws-1',
    name: '测试故事',
    description: '一个测试工作区',
    template: 'blank',
    coverColor: '#C68A3E',
    coverImage: null,
    eventCount: 5,
    settings: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-20T00:00:00Z',
    ...overrides,
  };
}

function renderSelector() {
  return render(
    <MemoryRouter>
      <WorkspaceSelector />
    </MemoryRouter>,
  );
}

describe('WorkspaceSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMotionStore.setState({ animationsEnabled: true });
    vi.mocked(useWorkspacesQuery).mockReturnValue({
      data: [makeWorkspace()],
      isLoading: false,
    } as unknown as ReturnType<typeof useWorkspacesQuery>);
  });

  it('should render workspace carousel with card details', () => {
    renderSelector();
    expect(screen.getByText('测试故事')).toBeInTheDocument();
    expect(screen.getByText('一个测试工作区')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should filter workspaces by search term', async () => {
    vi.mocked(useWorkspacesQuery).mockReturnValue({
      data: [
        makeWorkspace({ id: 'ws-1', name: '奇幻冒险' }),
        makeWorkspace({ id: 'ws-2', name: '都市恋爱' }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useWorkspacesQuery>);

    renderSelector();
    const searchInput = screen.getByPlaceholderText('workspace.search');
    fireEvent.change(searchInput, { target: { value: '都市' } });

    await waitFor(() => {
      expect(screen.queryByText('奇幻冒险')).not.toBeInTheDocument();
    });
    expect(screen.getByText('都市恋爱')).toBeInTheDocument();
  });

  it('should navigate to timeline when a workspace card is clicked', () => {
    renderSelector();
    fireEvent.click(screen.getByText('测试故事'));
    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/ws-1/timeline');
  });

  it('should open create dialog when create button is clicked', async () => {
    renderSelector();
    fireEvent.click(screen.getByTestId('create-workspace-btn'));
    await waitFor(() => {
      expect(screen.getByTestId('workspace-name-input')).toBeInTheDocument();
    });
  });

  it('should render empty state when no workspaces exist', () => {
    vi.mocked(useWorkspacesQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useWorkspacesQuery>);

    renderSelector();
    expect(screen.getByText('workspace.empty.title')).toBeInTheDocument();
    expect(screen.getByText('workspace.empty.description')).toBeInTheDocument();
  });

  it('should render skeleton loading state', () => {
    vi.mocked(useWorkspacesQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useWorkspacesQuery>);

    const { container } = renderSelector();
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('renders ambient shimmer overlay on workspace cards when animations are enabled', () => {
    renderSelector();
    expect(screen.getByTestId('workspace-card-shimmer')).toBeInTheDocument();
  });

  it('does not render ambient shimmer when animations are disabled', () => {
    useMotionStore.setState({ animationsEnabled: false });
    renderSelector();
    expect(screen.queryByTestId('workspace-card-shimmer')).not.toBeInTheDocument();
  });
});
