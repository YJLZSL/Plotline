import { describe, it, expect, vi } from 'vitest';

import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  connectEvents,
  disconnectEvents,
  listEventConnections,
  checkConsistency,
} from './eventApi';

vi.mock('@/lib/ipc', () => ({
  invoke: vi.fn((command: string, args: Record<string, unknown>) => {
    const input = (args.input ?? {}) as Record<string, unknown>;
    if (command === 'list_events') return Promise.resolve([{ id: 'e1', title: 'Event' }]);
    if (command === 'create_event') return Promise.resolve({ id: 'e1', ...input });
    if (command === 'update_event') return Promise.resolve({ id: input.id, ...input });
    if (command === 'delete_event') return Promise.resolve();
    if (command === 'connect_events') return Promise.resolve();
    if (command === 'disconnect_events') return Promise.resolve();
    if (command === 'list_event_connections') return Promise.resolve([]);
    if (command === 'check_consistency') return Promise.resolve([]);
    return Promise.reject(new Error('unknown'));
  }),
}));

describe('eventApi', () => {
  it('lists events', async () => {
    const events = await listEvents('ws');
    expect(events).toHaveLength(1);
  });

  it('creates event', async () => {
    const ev = await createEvent({ workspaceId: 'ws', trackId: 't1', title: 'New' });
    expect(ev.title).toBe('New');
  });

  it('updates event', async () => {
    const ev = await updateEvent({ id: 'e1', title: 'Updated' });
    expect(ev.title).toBe('Updated');
  });

  it('deletes event', async () => {
    await expect(deleteEvent('e1')).resolves.toBeUndefined();
  });

  it('connects events', async () => {
    await expect(
      connectEvents({ sourceId: 'e1', targetId: 'e2', connectionType: 'foreshadow' }),
    ).resolves.toBeUndefined();
  });

  it('disconnects events', async () => {
    await expect(disconnectEvents('e1', 'e2')).resolves.toBeUndefined();
  });

  it('lists event connections', async () => {
    const conns = await listEventConnections('ws');
    expect(conns).toEqual([]);
  });

  it('checks consistency', async () => {
    const conflicts = await checkConsistency('ws');
    expect(conflicts).toEqual([]);
  });
});
