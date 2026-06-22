import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Character } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';

import {
  createCharacter as apiCreate,
  deleteCharacter as apiDelete,
  listCharacters as apiList,
  updateCharacter as apiUpdate,
} from './api';

const key = (wsId: string) => ['characters', wsId] as const;

export function useCharactersQuery(workspaceId: string) {
  return useQuery({ queryKey: key(workspaceId), queryFn: () => apiList(workspaceId) });
}

export function useCreateCharacter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (c) => {
      qc.setQueryData<Character[]>(key(workspaceId), (old) => [...(old ?? []), c]);
      toastSuccess(t('toast.characterCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateCharacter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: (c) => {
      qc.setQueryData<Character[]>(key(workspaceId), (old) =>
        (old ?? []).map((x) => (x.id === c.id ? c : x)),
      );
      toastSuccess(t('toast.characterUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteCharacter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDelete,
    onSuccess: (_, id) => {
      qc.setQueryData<Character[]>(key(workspaceId), (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      toastSuccess(t('toast.characterDeleted'));
    },
    onError: toastError,
  });
}
