import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/features/timeline/hooks', () => ({
  useTracksQuery: () => ({
    data: [
      { id: 't1', workspaceId: 'ws', name: '主线', color: '#F4B6C2', sortOrder: 0, isVisible: true, createdAt: '' },
    ],
  }),
  useEventsQuery: () => ({
    data: [
      {
        id: 'e1', workspaceId: 'ws', trackId: 't1', title: '事件A', description: '',
        dateType: 'absolute', dateValue: '2024-01-01', sortOrder: 0, status: 'draft',
        color: null, locationId: null, characterIds: [], connectedEventIds: [], createdAt: '', updatedAt: '',
      },
    ],
  }),
}));

import { GanttChart } from './GanttChart';
import { createTimeScale } from '@/features/timeline/timeScale';

const mockScale = createTimeScale(
  new Date('2024-01-01').getTime(),
  new Date('2024-12-31').getTime(),
  'month',
  24,
  100,
);

describe('GanttChart', () => {
  it('should render an SVG gantt layout with one bar', () => {
    const { container } = render(
      <GanttChart
        tracks={[{ id: 't1', workspaceId: 'ws', name: '主线', color: '#F4B6C2', sortOrder: 0, isVisible: true, createdAt: '' }]}
        events={[{
          id: 'e1', workspaceId: 'ws', trackId: 't1', title: '事件A', description: '',
          dateType: 'absolute', dateValue: '2024-01-01', sortOrder: 0, status: 'draft',
          color: null, locationId: null, characterIds: [], connectedEventIds: [], createdAt: '', updatedAt: '',
        }]}
        timeScale={mockScale}
        selectedEventId={null}
        onSelectEvent={() => {}}
        onEditEvent={() => {}}
        onAddEvent={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBeGreaterThan(0);
  });

  it('should show empty state when no visible tracks', () => {
    const { getByText } = render(
      <GanttChart
        tracks={[]}
        events={[]}
        timeScale={mockScale}
        selectedEventId={null}
        onSelectEvent={() => {}}
        onEditEvent={() => {}}
        onAddEvent={() => {}}
      />,
    );
    expect(getByText('gantt.title')).toBeInTheDocument();
  });
});
