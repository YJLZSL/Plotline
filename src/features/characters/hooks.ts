import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Character } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';
import {
  useHistoryStore,
  makeCreateCharacterAction,
  makeUpdateCharacterAction,
  makeDeleteCharacterAction,
} from '@/stores/historyStore';

import {
  createCharacter as apiCreate,
  deleteCharacter as apiDelete,
  listCharacters as apiList,
  updateCharacter as apiUpdate,
} from './api';

export const charactersKey = (wsId: string) => ['characters', wsId] as const;

export function useCharactersQuery(workspaceId: string) {
  return useQuery({ queryKey: charactersKey(workspaceId), queryFn: () => apiList(workspaceId) });
}

export function useCreateCharacter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (c) => {
      qc.setQueryData<Character[]>(charactersKey(workspaceId), (old) => [...(old ?? []), c]);
      pushHistory(makeCreateCharacterAction(workspaceId, c));
      toastSuccess(t('toast.characterCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateCharacter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiUpdate,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: charactersKey(workspaceId) });
      const previous = qc.getQueryData<Character[]>(charactersKey(workspaceId));
      const oldCharacter = previous?.find((c) => c.id === input.id);
      return { oldCharacter };
    },
    onSuccess: (c, _input, context) => {
      qc.setQueryData<Character[]>(charactersKey(workspaceId), (old) =>
        (old ?? []).map((x) => (x.id === c.id ? c : x)),
      );
      if (context?.oldCharacter) {
        pushHistory(makeUpdateCharacterAction(workspaceId, context.oldCharacter, c));
      }
      toastSuccess(t('toast.characterUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteCharacter(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: charactersKey(workspaceId) });
      const previous = qc.getQueryData<Character[]>(charactersKey(workspaceId));
      const oldCharacter = previous?.find((c) => c.id === id);
      return { oldCharacter };
    },
    onSuccess: (_, id, context) => {
      qc.setQueryData<Character[]>(charactersKey(workspaceId), (old) =>
        (old ?? []).filter((c) => c.id !== id),
      );
      if (context?.oldCharacter) {
        pushHistory(makeDeleteCharacterAction(workspaceId, context.oldCharacter));
      }
      toastSuccess(t('toast.characterDeleted'));
    },
    onError: toastError,
  });
}
