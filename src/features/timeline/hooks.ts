import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Event, Track } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';

import {
  createTrack as apiCreate,
  deleteTrack as apiDelete,
  listTracks as apiList,
  reorderTracks as apiReorder,
  updateTrack as apiUpdate,
} from './api';
import {
  createEvent as apiCreateEvent,
  deleteEvent as apiDeleteEvent,
  listEvents as apiListEvents,
  updateEvent as apiUpdateEvent,
} from './eventApi';

export const tracksKey = (wsId: string) => ['tracks', wsId] as const;
export const eventsKey = (wsId: string) => ['events', wsId] as const;

export function useTracksQuery(workspaceId: string) {
  return useQuery({
    queryKey: tracksKey(workspaceId),
    queryFn: () => apiList(workspaceId),
  });
}

export function useCreateTrack(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (track) => {
      qc.setQueryData<Track[]>(tracksKey(workspaceId), (old) => [...(old ?? []), track]);
      toastSuccess(t('toast.trackCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateTrack(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: (track) => {
      qc.setQueryData<Track[]>(tracksKey(workspaceId), (old) =>
        (old ?? []).map((t) => (t.id === track.id ? track : t)),
      );
    },
    onError: toastError,
  });
}

export function useDeleteTrack(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDelete,
    onSuccess: (_, id) => {
      qc.setQueryData<Track[]>(tracksKey(workspaceId), (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) =>
        (old ?? []).filter((e) => e.trackId !== id),
      );
      toastSuccess(t('toast.trackDeleted'));
    },
    onError: toastError,
  });
}

export function useReorderTracks(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiReorder,
    onSuccess: (tracks) => {
      qc.setQueryData(tracksKey(workspaceId), tracks);
    },
    onError: toastError,
  });
}

export function useEventsQuery(workspaceId: string) {
  return useQuery({
    queryKey: eventsKey(workspaceId),
    queryFn: () => apiListEvents(workspaceId),
  });
}

export function useCreateEvent(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreateEvent,
    onSuccess: (ev) => {
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) => [...(old ?? []), ev]);
      toastSuccess(t('toast.eventCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateEvent(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiUpdateEvent,
    onSuccess: (ev) => {
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) =>
        (old ?? []).map((e) => (e.id === ev.id ? ev : e)),
      );
      toastSuccess(t('toast.eventUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteEvent(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDeleteEvent,
    onSuccess: (_, id) => {
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      toastSuccess(t('toast.eventDeleted'));
    },
    onError: toastError,
  });
}
