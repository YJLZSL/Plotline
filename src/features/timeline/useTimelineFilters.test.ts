import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { filterEvents, useTimelineFilters } from './useTimelineFilters';
import type { Event } from '@/types';

function makeEvent(overrides: Partial<Event> & { id: string; title: string }): Event {
  return {
    id: overrides.id,
    workspaceId: 'ws',
    trackId: 't1',
    title: overrides.title,
    description: overrides.description ?? '',
    dateType: overrides.dateType ?? 'absolute',
    dateValue: overrides.dateValue ?? '2024-01-01',
    sortOrder: overrides.sortOrder ?? 0,
    status: overrides.status ?? 'draft',
    color: overrides.color ?? null,
    locationId: overrides.locationId ?? null,
    imageUrls: overrides.imageUrls ?? [],
    characterIds: overrides.characterIds ?? [],
    connectedEventIds: overrides.connectedEventIds ?? [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

describe('filterEvents', () => {
  const events: Event[] = [
    makeEvent({ id: 'e1', title: 'Opening', description: 'The story begins', status: 'draft', characterIds: ['c1'], locationId: 'l1' }),
    makeEvent({ id: 'e2', title: 'Midpoint twist', description: 'A secret is revealed', status: 'done', characterIds: ['c2'], locationId: 'l2' }),
    makeEvent({ id: 'e3', title: 'Climax', description: 'Final confrontation', status: 'revise', characterIds: ['c1', 'c2'], locationId: 'l1' }),
    makeEvent({ id: 'e4', title: 'Epilogue', description: 'Loose ends tied up', status: 'done', characterIds: [], locationId: null }),
  ];

  it('returns all events when no filters are active', () => {
    const result = filterEvents(events, {
      selectedCharacterIds: [],
      selectedLocationIds: [],
      selectedStatuses: [],
      searchQuery: '',
      collapsedTrackIds: [],
    });
    expect(result.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it('filters by character id', () => {
    const result = filterEvents(events, {
      selectedCharacterIds: ['c1'],
      selectedLocationIds: [],
      selectedStatuses: [],
      searchQuery: '',
      collapsedTrackIds: [],
    });
    expect(result.map((e) => e.id)).toEqual(['e1', 'e3']);
  });

  it('filters by location id', () => {
    const result = filterEvents(events, {
      selectedCharacterIds: [],
      selectedLocationIds: ['l1'],
      selectedStatuses: [],
      searchQuery: '',
      collapsedTrackIds: [],
    });
    expect(result.map((e) => e.id)).toEqual(['e1', 'e3']);
  });

  it('filters by status', () => {
    const result = filterEvents(events, {
      selectedCharacterIds: [],
      selectedLocationIds: [],
      selectedStatuses: ['done'],
      searchQuery: '',
      collapsedTrackIds: [],
    });
    expect(result.map((e) => e.id)).toEqual(['e2', 'e4']);
  });

  it('filters by search query across title and description', () => {
    const result = filterEvents(events, {
      selectedCharacterIds: [],
      selectedLocationIds: [],
      selectedStatuses: [],
      searchQuery: 'final',
      collapsedTrackIds: [],
    });
    expect(result.map((e) => e.id)).toEqual(['e3']);
  });

  it('combines multiple filters with AND semantics', () => {
    const result = filterEvents(events, {
      selectedCharacterIds: ['c1'],
      selectedLocationIds: ['l1'],
      selectedStatuses: ['draft'],
      searchQuery: 'begins',
      collapsedTrackIds: [],
    });
    expect(result.map((e) => e.id)).toEqual(['e1']);
  });

  it('returns empty array when no events match', () => {
    const result = filterEvents(events, {
      selectedCharacterIds: ['unknown'],
      selectedLocationIds: [],
      selectedStatuses: [],
      searchQuery: '',
      collapsedTrackIds: [],
    });
    expect(result).toEqual([]);
  });
});

describe('useTimelineFilters', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with empty filters', () => {
    const { result } = renderHook(() => useTimelineFilters('ws'));
    expect(result.current.filters.selectedCharacterIds).toEqual([]);
    expect(result.current.filters.selectedLocationIds).toEqual([]);
    expect(result.current.filters.selectedStatuses).toEqual([]);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.collapsedTrackIds).toEqual([]);
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('toggles character selection', () => {
    const { result } = renderHook(() => useTimelineFilters('ws'));
    act(() => result.current.toggleCharacter('c1'));
    expect(result.current.filters.selectedCharacterIds).toEqual(['c1']);
    act(() => result.current.toggleCharacter('c1'));
    expect(result.current.filters.selectedCharacterIds).toEqual([]);
  });

  it('toggles collapsed track ids and persists to localStorage', () => {
    const { result } = renderHook(() => useTimelineFilters('ws'));
    act(() => result.current.toggleTrackCollapse('t1'));
    expect(result.current.filters.collapsedTrackIds).toEqual(['t1']);

    const stored = localStorage.getItem('plotline-timeline-filters-ws');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.collapsedTrackIds).toEqual(['t1']);
  });

  it('loads persisted filters from localStorage', () => {
    localStorage.setItem(
      'plotline-timeline-filters-ws',
      JSON.stringify({
        selectedCharacterIds: ['c1'],
        selectedLocationIds: ['l1'],
        selectedStatuses: ['done'],
        searchQuery: 'query',
        collapsedTrackIds: ['t2'],
      }),
    );

    const { result } = renderHook(() => useTimelineFilters('ws'));
    expect(result.current.filters.selectedCharacterIds).toEqual(['c1']);
    expect(result.current.filters.selectedLocationIds).toEqual(['l1']);
    expect(result.current.filters.selectedStatuses).toEqual(['done']);
    expect(result.current.filters.searchQuery).toBe('query');
    expect(result.current.filters.collapsedTrackIds).toEqual(['t2']);
  });

  it('ignores invalid persisted JSON', () => {
    localStorage.setItem('plotline-timeline-filters-ws', 'not-json');
    const { result } = renderHook(() => useTimelineFilters('ws'));
    expect(result.current.filters.searchQuery).toBe('');
  });

  it('clears active filters while keeping collapsed tracks', () => {
    const { result } = renderHook(() => useTimelineFilters('ws'));
    act(() => {
      result.current.toggleCharacter('c1');
      result.current.setSearchQuery('search');
      result.current.toggleTrackCollapse('t1');
    });
    act(() => result.current.clearFilters());
    expect(result.current.filters.selectedCharacterIds).toEqual([]);
    expect(result.current.filters.searchQuery).toBe('');
    expect(result.current.filters.collapsedTrackIds).toEqual(['t1']);
  });
});
