import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { PlotDensityChart } from './PlotDensityChart';
import { CharacterArcChart } from './CharacterArcChart';
import type { Character, Event } from '@/types';

function mkEvent(id: string, title: string, date: string, order: number): Event {
  return {
    id, workspaceId: 'ws', trackId: 't1', title, description: '', dateType: 'absolute',
    dateValue: date, sortOrder: order, status: 'draft', color: null, characterIds: [],
    connectedEventIds: [], createdAt: '', updatedAt: '',
  };
}

function mkChar(id: string, name: string, eventIds: string[]): Character {
  return {
    id, workspaceId: 'ws', name, aliases: [], avatar: null, description: '',
    appearance: '', backstory: '', goals: '', conflicts: '', arc: '成长', tags: [],
    color: '#F4B6C2', eventIds, createdAt: '', updatedAt: '',
  };
}

describe('PlotDensityChart', () => {
  it('should render chart heading for non-empty events', () => {
    const { getByText } = render(
      <PlotDensityChart events={[mkEvent('e1', '事件', '2024-01-01', 0)]} />,
    );
    expect(getByText('statistics.plotDensity')).toBeInTheDocument();
  });

  it('should show empty hint for no events', () => {
    const { getByText } = render(<PlotDensityChart events={[]} />);
    expect(getByText('statistics.empty')).toBeInTheDocument();
  });
});

describe('CharacterArcChart', () => {
  it('should render SVG timeline when characters have appearances', () => {
    const events = [mkEvent('e1', '开篇', '2024-01-01', 0), mkEvent('e2', '发展', '2024-02-01', 1)];
    const chars = [mkChar('c1', '主角', ['e1', 'e2'])];
    const { container, getByText } = render(
      <CharacterArcChart events={events} characters={chars} />,
    );
    expect(getByText('statistics.characterArc')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('should show empty hint when no appearances', () => {
    const { getByText } = render(
      <CharacterArcChart events={[mkEvent('e1', 'x', '', 0)]} characters={[mkChar('c1', '孤独', [])]} />,
    );
    expect(getByText('statistics.empty')).toBeInTheDocument();
  });
});
