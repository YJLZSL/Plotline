import { describe, it, expect } from 'vitest';

import { useHistoryStore, makeCreateEventAction } from './historyStore';
import type { Event } from '@/types';

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
});
