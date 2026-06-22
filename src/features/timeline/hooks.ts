import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Event, Track } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';
import {
  useHistoryStore,
  makeCreateEventAction,
  makeUpdateEventAction,
  makeDeleteEventAction,
  makeCreateTrackAction,
  makeUpdateTrackAction,
  makeDeleteTrackAction,
} from '@/stores/historyStore';

import {
  createTrack as apiCreate,
  deleteTrack as apiDelete,
  listTracks as apiList,
  reorderTracks as apiReorder,
  updateTrack as apiUpdate,
} from './api';
import {
  connectEvents as apiConnectEvents,
  createEvent as apiCreateEvent,
  deleteEvent as apiDeleteEvent,
  disconnectEvents as apiDisconnectEvents,
  listEventConnections as apiListEventConnections,
  listEvents as apiListEvents,
  updateEvent as apiUpdateEvent,
} from './eventApi';

export const tracksKey = (wsId: string) => ['tracks', wsId] as const;
export const eventsKey = (wsId: string) => ['events', wsId] as const;
export const eventConnectionsKey = (wsId: string) => ['eventConnections', wsId] as const;

export function useTracksQuery(workspaceId: string) {
  return useQuery({
    queryKey: tracksKey(workspaceId),
    queryFn: () => apiList(workspaceId),
  });
}

export function useCreateTrack(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (track) => {
      qc.setQueryData<Track[]>(tracksKey(workspaceId), (old) => [...(old ?? []), track]);
      pushHistory(makeCreateTrackAction(workspaceId, track));
      toastSuccess(t('toast.trackCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateTrack(workspaceId: string) {
  const qc = useQueryClient();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiUpdate,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: tracksKey(workspaceId) });
      const previous = qc.getQueryData<Track[]>(tracksKey(workspaceId));
      const oldTrack = previous?.find((t) => t.id === input.id);
      return { oldTrack };
    },
    onSuccess: (track, _input, context) => {
      qc.setQueryData<Track[]>(tracksKey(workspaceId), (old) =>
        (old ?? []).map((t) => (t.id === track.id ? track : t)),
      );
      if (context?.oldTrack) {
        pushHistory(makeUpdateTrackAction(workspaceId, context.oldTrack, track));
      }
    },
    onError: toastError,
  });
}

export function useDeleteTrack(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: tracksKey(workspaceId) });
      const previous = qc.getQueryData<Track[]>(tracksKey(workspaceId));
      const oldTrack = previous?.find((t) => t.id === id);
      return { oldTrack };
    },
    onSuccess: (_, id, context) => {
      qc.setQueryData<Track[]>(tracksKey(workspaceId), (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) =>
        (old ?? []).filter((e) => e.trackId !== id),
      );
      if (context?.oldTrack) {
        pushHistory(makeDeleteTrackAction(workspaceId, context.oldTrack));
      }
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
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiCreateEvent,
    onSuccess: (ev) => {
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) => [...(old ?? []), ev]);
      pushHistory(makeCreateEventAction(workspaceId, ev));
      toastSuccess(t('toast.eventCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateEvent(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiUpdateEvent,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: eventsKey(workspaceId) });
      const previous = qc.getQueryData<Event[]>(eventsKey(workspaceId));
      const oldEvent = previous?.find((e) => e.id === input.id);
      return { oldEvent };
    },
    onSuccess: (ev, _input, context) => {
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) =>
        (old ?? []).map((e) => (e.id === ev.id ? ev : e)),
      );
      if (context?.oldEvent) {
        pushHistory(makeUpdateEventAction(workspaceId, context.oldEvent, ev));
      }
      toastSuccess(t('toast.eventUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteEvent(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiDeleteEvent,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: eventsKey(workspaceId) });
      const previous = qc.getQueryData<Event[]>(eventsKey(workspaceId));
      const oldEvent = previous?.find((e) => e.id === id);
      return { oldEvent };
    },
    onSuccess: (_, id, context) => {
      qc.setQueryData<Event[]>(eventsKey(workspaceId), (old) =>
        (old ?? []).filter((e) => e.id !== id),
      );
      if (context?.oldEvent) {
        pushHistory(makeDeleteEventAction(workspaceId, context.oldEvent));
      }
      toastSuccess(t('toast.eventDeleted'));
    },
    onError: toastError,
  });
}

export function useEventConnectionsQuery(workspaceId: string) {
  return useQuery({
    queryKey: eventConnectionsKey(workspaceId),
    queryFn: () => apiListEventConnections(workspaceId),
  });
}

export function useConnectEvents(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiConnectEvents,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: eventConnectionsKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: eventsKey(workspaceId) });
    },
    onError: toastError,
  });
}

export function useDisconnectEvents(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sourceId: string; targetId: string }) =>
      apiDisconnectEvents(args.sourceId, args.targetId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: eventConnectionsKey(workspaceId) });
      void qc.invalidateQueries({ queryKey: eventsKey(workspaceId) });
    },
    onError: toastError,
  });
}
