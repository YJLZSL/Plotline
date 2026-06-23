import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { WorldbuildingView } from './WorldbuildingView';
import type { Note } from '@/types';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/features/notebook/hooks', () => ({
  useNotesQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateNote: vi.fn(() => ({ mutateAsync: mockCreate })),
  useUpdateNote: vi.fn(() => ({ mutateAsync: mockUpdate })),
  useDeleteNote: vi.fn(() => ({ mutateAsync: mockDelete })),
}));

import { useNotesQuery } from '@/features/notebook/hooks';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    workspaceId: 'ws1',
    folderId: null,
    title: 'Ancient War',
    content: 'A long time ago...',
    tags: ['world:history'],
    isFolder: false,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderView() {
  return render(
    <MemoryRouter>
      <WorldbuildingView workspaceId="ws1" workspaceName="Test" />
    </MemoryRouter>,
  );
}

describe('WorldbuildingView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNotesQuery).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useNotesQuery>);
  });

  it('should render empty state when no worldbuilding notes exist', () => {
    renderView();
    expect(screen.getByText('worldbuilding.empty.title')).toBeInTheDocument();
    expect(screen.getByText('worldbuilding.empty.description')).toBeInTheDocument();
  });

  it('should render category section for worldbuilding notes', () => {
    vi.mocked(useNotesQuery).mockReturnValue({
      data: [makeNote()],
      isLoading: false,
    } as unknown as ReturnType<typeof useNotesQuery>);

    renderView();
    expect(screen.getAllByText('worldbuilding.history').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue('Ancient War')).toBeInTheDocument();
  });

  it('should create a new entry when add button is clicked', async () => {
    renderView();
    const empty = screen.getByText('worldbuilding.empty.description').parentElement as HTMLElement;
    fireEvent.click(within(empty).getByRole('button', { name: 'worldbuilding.add' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'ws1',
        tags: ['world:other'],
      }),
    );
  });

  it('should auto-save title changes after debounce', async () => {
    vi.mocked(useNotesQuery).mockReturnValue({
      data: [makeNote()],
      isLoading: false,
    } as unknown as ReturnType<typeof useNotesQuery>);

    renderView();
    const input = screen.getByDisplayValue('Ancient War');
    fireEvent.change(input, { target: { value: 'Ancient War Updated' } });

    await waitFor(
      () =>
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'n1', title: 'Ancient War Updated' }),
        ),
      { timeout: 2000 },
    );
  });
});
