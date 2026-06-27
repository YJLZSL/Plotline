import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

import type { Event } from '@/types';

export interface TimelineFilters {
  selectedCharacterIds: string[];
  selectedLocationIds: string[];
  selectedStatuses: string[];
  searchQuery: string;
  collapsedTrackIds: string[];
}

const STORAGE_KEY_PREFIX = 'plotline-timeline-filters-';

const persistedSchema = z.object({
  selectedCharacterIds: z.array(z.string()),
  selectedLocationIds: z.array(z.string()),
  selectedStatuses: z.array(z.string()),
  searchQuery: z.string(),
  collapsedTrackIds: z.array(z.string()),
});

function getStorageKey(workspaceId: string) {
  return `${STORAGE_KEY_PREFIX}${workspaceId}`;
}

function loadFilters(workspaceId: string): Partial<TimelineFilters> {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(getStorageKey(workspaceId)) : null;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return persistedSchema.parse(parsed);
  } catch {
    return {};
  }
}

export function filterEvents(events: Event[], filters: TimelineFilters): Event[] {
  const query = filters.searchQuery.trim().toLowerCase();
  return events.filter((ev) => {
    if (filters.selectedCharacterIds.length > 0) {
      const hasCharacter = ev.characterIds.some((id) => filters.selectedCharacterIds.includes(id));
      if (!hasCharacter) return false;
    }
    if (filters.selectedLocationIds.length > 0) {
      if (!ev.locationId || !filters.selectedLocationIds.includes(ev.locationId)) return false;
    }
    if (filters.selectedStatuses.length > 0) {
      if (!filters.selectedStatuses.includes(ev.status)) return false;
    }
    if (query) {
      const haystack = `${ev.title}\n${ev.description}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function useTimelineFilters(workspaceId: string) {
  const [filters, setFilters] = useState<TimelineFilters>(() => ({
    selectedCharacterIds: [],
    selectedLocationIds: [],
    selectedStatuses: [],
    searchQuery: '',
    collapsedTrackIds: [],
    ...loadFilters(workspaceId),
  }));

  useEffect(() => {
    setFilters((prev) => ({ ...prev, ...loadFilters(workspaceId) }));
  }, [workspaceId]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(filters));
  }, [workspaceId, filters]);

  const toggleCharacter = useCallback((id: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedCharacterIds: prev.selectedCharacterIds.includes(id)
        ? prev.selectedCharacterIds.filter((x) => x !== id)
        : [...prev.selectedCharacterIds, id],
    }));
  }, []);

  const toggleLocation = useCallback((id: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedLocationIds: prev.selectedLocationIds.includes(id)
        ? prev.selectedLocationIds.filter((x) => x !== id)
        : [...prev.selectedLocationIds, id],
    }));
  }, []);

  const toggleStatus = useCallback((status: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedStatuses: prev.selectedStatuses.includes(status)
        ? prev.selectedStatuses.filter((x) => x !== status)
        : [...prev.selectedStatuses, status],
    }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleTrackCollapse = useCallback((trackId: string) => {
    setFilters((prev) => ({
      ...prev,
      collapsedTrackIds: prev.collapsedTrackIds.includes(trackId)
        ? prev.collapsedTrackIds.filter((x) => x !== trackId)
        : [...prev.collapsedTrackIds, trackId],
    }));
  }, []);

  const collapseAllTracks = useCallback((trackIds: string[]) => {
    setFilters((prev) => ({ ...prev, collapsedTrackIds: trackIds }));
  }, []);

  const expandAllTracks = useCallback(() => {
    setFilters((prev) => ({ ...prev, collapsedTrackIds: [] }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      selectedCharacterIds: [],
      selectedLocationIds: [],
      selectedStatuses: [],
      searchQuery: '',
    }));
  }, []);

  const isCollapsed = useCallback(
    (trackId: string) => filters.collapsedTrackIds.includes(trackId),
    [filters.collapsedTrackIds],
  );

  const hasActiveFilters =
    filters.selectedCharacterIds.length > 0 ||
    filters.selectedLocationIds.length > 0 ||
    filters.selectedStatuses.length > 0 ||
    filters.searchQuery.trim().length > 0;

  return {
    filters,
    hasActiveFilters,
    toggleCharacter,
    toggleLocation,
    toggleStatus,
    setSearchQuery,
    toggleTrackCollapse,
    collapseAllTracks,
    expandAllTracks,
    clearFilters,
    isCollapsed,
  };
}
