import { describe, it, expect } from 'vitest';

import { useHistoryStore, makeCreateEventAction, makeUpdateWorkspaceAction } from './historyStore';
import type { Event, Workspace } from '@/types';

const dummyEvent: Event = {
  id: 'e1',
  workspaceId: 'ws',
  trackId: 't1',
  title: 'Test',
  description: '',
  dateType: 'relative',
  dateValue: '',
  sortOrder: 0,
  status: 'draft',
  color: null,
  characterIds: [],
  connectedEventIds: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const dummyWorkspace: Workspace = {
  id: 'ws',
  name: 'Old Name',
  description: '',
  template: 'blank',
  coverColor: '#C68A3E',
  settings: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('historyStore', () => {
  it('pushes and undoes actions', () => {
    useHistoryStore.setState({ stack: [], index: -1, canUndo: false, canRedo: false });
    const push = useHistoryStore.getState().push;
    push(makeCreateEventAction('ws', dummyEvent));

    expect(useHistoryStore.getState().canUndo).toBe(true);
    const action = useHistoryStore.getState().undo();
    expect(action?.type).toBe('deleteEvent');
    expect(useHistoryStore.getState().canRedo).toBe(true);
  });

  it('redoes previously undone actions', () => {
    useHistoryStore.setState({ stack: [], index: -1, canUndo: false, canRedo: false });
    const push = useHistoryStore.getState().push;
    push(makeCreateEventAction('ws', dummyEvent));
    useHistoryStore.getState().undo();
    const action = useHistoryStore.getState().redo();
    expect(action?.type).toBe('createEvent');
  });

  it('limits stack size', () => {
    useHistoryStore.setState({ stack: [], index: -1, canUndo: false, canRedo: false });
    const push = useHistoryStore.getState().push;
    for (let i = 0; i < 55; i++) {
      push(makeCreateEventAction('ws', { ...dummyEvent, id: `e${i}` }));
    }
    expect(useHistoryStore.getState().stack.length).toBeLessThanOrEqual(50);
  });

  it('pushes workspace update actions', () => {
    useHistoryStore.setState({ stack: [], index: -1, canUndo: false, canRedo: false });
    const push = useHistoryStore.getState().push;
    const next = { ...dummyWorkspace, name: 'New Name' };
    push(makeUpdateWorkspaceAction('ws', dummyWorkspace, next));

    const item = useHistoryStore.getState().peek();
    expect(item?.redo.type).toBe('updateWorkspace');
    expect((item?.redo as { input: { name: string } }).input.name).toBe('New Name');
    expect((item?.undo as { input: { name: string } }).input.name).toBe('Old Name');
  });
});
