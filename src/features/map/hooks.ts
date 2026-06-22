import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Location } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';

import {
  createLocation as apiCreate,
  deleteLocation as apiDelete,
  linkLocations as apiLink,
  listLocationLinks as apiListLinks,
  listLocations as apiList,
  unlinkLocations as apiUnlink,
  updateLocation as apiUpdate,
} from './api';

export const locationsKey = (wsId: string) => ['locations', wsId] as const;
export const locationLinksKey = (wsId: string) => ['locationLinks', wsId] as const;

export function useLocationsQuery(workspaceId: string) {
  return useQuery({
    queryKey: locationsKey(workspaceId),
    queryFn: () => apiList(workspaceId),
  });
}

export function useLocationLinksQuery(workspaceId: string) {
  return useQuery({
    queryKey: locationLinksKey(workspaceId),
    queryFn: () => apiListLinks(workspaceId),
  });
}

export function useCreateLocation(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (loc) => {
      qc.setQueryData<Location[]>(locationsKey(workspaceId), (old) => [...(old ?? []), loc]);
      toastSuccess(t('toast.locationCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateLocation(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiUpdate,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: locationsKey(workspaceId) });
      const previous = qc.getQueryData<Location[]>(locationsKey(workspaceId));
      const oldLoc = previous?.find((l) => l.id === input.id);
      return { oldLoc };
    },
    onSuccess: (loc) => {
      qc.setQueryData<Location[]>(locationsKey(workspaceId), (old) =>
        (old ?? []).map((l) => (l.id === loc.id ? loc : l)),
      );
      toastSuccess(t('toast.locationUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteLocation(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDelete,
    onSuccess: (_, id) => {
      qc.setQueryData<Location[]>(locationsKey(workspaceId), (old) =>
        (old ?? []).filter((l) => l.id !== id),
      );
      toastSuccess(t('toast.locationDeleted'));
    },
    onError: toastError,
  });
}

export function useLinkLocations(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiLink,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: locationLinksKey(workspaceId) });
    },
    onError: toastError,
  });
}

export function useUnlinkLocations(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sourceId: string; targetId: string }) =>
      apiUnlink(args.sourceId, args.targetId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: locationLinksKey(workspaceId) });
    },
    onError: toastError,
  });
}
