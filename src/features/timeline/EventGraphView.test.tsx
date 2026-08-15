import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '@/i18n';
import { EventGraphView } from './EventGraphView';
import type { Event, Track } from '@/types';

const track: Track = {
  id: 't1',
  workspaceId: 'ws',
  name: '主线',
  color: '#F4B6C2',
  sortOrder: 0,
  isVisible: true,
  createdAt: '',
};

function mkEvent(id: string, title: string, sortOrder: number, connected: string[] = []): Event {
  return {
    id,
    workspaceId: 'ws',
    trackId: 't1',
    title,
    description: '',
    dateType: 'relative',
    dateValue: `第${sortOrder + 1}天`,
    sortOrder,
    status: 'draft',
    color: null,
    locationId: null,
    imageUrls: [],
    characterIds: [],
    connectedEventIds: connected,
    createdAt: '',
    updatedAt: '',
  };
}

describe('EventGraphView', () => {
  it('should render migrated legacy links as graph edges', () => {
    const events = [mkEvent('a', '伏笔事件', 0, ['b']), mkEvent('b', '回收事件', 1)];
    render(
      <EventGraphView
        tracks={[track]}
        events={events}
        eventConnections={[]}
        selectedEventId={null}
        onSelectEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onAddEvent={vi.fn()}
      />,
    );

    expect(screen.getByTestId('timeline-graph-migration-banner')).toBeInTheDocument();
    expect(screen.getByTestId('graph-edge-a-b')).toBeInTheDocument();
    expect(screen.getByTestId('graph-node-a')).toBeInTheDocument();
    expect(screen.getByTestId('graph-node-b')).toBeInTheDocument();
  });

  it('should select and edit a node', async () => {
    const user = userEvent.setup();
    const events = [mkEvent('a', '伏笔事件', 0, ['b']), mkEvent('b', '回收事件', 1)];
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    render(
      <EventGraphView
        tracks={[track]}
        events={events}
        eventConnections={[]}
        selectedEventId={null}
        onSelectEvent={onSelect}
        onEditEvent={onEdit}
        onAddEvent={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('graph-node-a'));
    expect(onSelect).toHaveBeenCalledWith('a');
    await user.dblClick(screen.getByTestId('graph-node-a'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('should show empty state when there are no events', () => {
    render(
      <EventGraphView
        tracks={[track]}
        events={[]}
        eventConnections={[]}
        selectedEventId={null}
        onSelectEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onAddEvent={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('timeline-graph-stats')).not.toBeInTheDocument();
    expect(screen.getByTestId('timeline-graph-canvas')).toHaveTextContent('关系');
  });
});
