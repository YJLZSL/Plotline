import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OutlineNode } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';
import {
  useHistoryStore,
  makeCreateOutlineNodeAction,
  makeUpdateOutlineNodeAction,
  makeDeleteOutlineNodeAction,
} from '@/stores/historyStore';

import {
  createOutlineNode as apiCreate,
  deleteOutlineNode as apiDelete,
  listOutlineNodes as apiList,
  updateOutlineNode as apiUpdate,
} from './api';

export const outlineNodesKey = (wsId: string) => ['outline', wsId] as const;

export function useOutlineQuery(workspaceId: string) {
  return useQuery({ queryKey: outlineNodesKey(workspaceId), queryFn: () => apiList(workspaceId) });
}

export function useCreateOutlineNode(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (n) => {
      qc.setQueryData<OutlineNode[]>(outlineNodesKey(workspaceId), (old) => [...(old ?? []), n]);
      pushHistory(makeCreateOutlineNodeAction(workspaceId, n));
      toastSuccess(t('toast.outlineCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateOutlineNode(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiUpdate,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: outlineNodesKey(workspaceId) });
      const previous = qc.getQueryData<OutlineNode[]>(outlineNodesKey(workspaceId));
      const oldNode = previous?.find((n) => n.id === input.id);
      return { oldNode };
    },
    onSuccess: (n, _input, context) => {
      qc.setQueryData<OutlineNode[]>(outlineNodesKey(workspaceId), (old) =>
        (old ?? []).map((x) => (x.id === n.id ? n : x)),
      );
      if (context?.oldNode) {
        pushHistory(makeUpdateOutlineNodeAction(workspaceId, context.oldNode, n));
      }
      toastSuccess(t('toast.outlineUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteOutlineNode(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: outlineNodesKey(workspaceId) });
      const previous = qc.getQueryData<OutlineNode[]>(outlineNodesKey(workspaceId));
      const oldNode = previous?.find((n) => n.id === id);
      return { oldNode };
    },
    onSuccess: (_, id, context) => {
      qc.setQueryData<OutlineNode[]>(outlineNodesKey(workspaceId), (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      if (context?.oldNode) {
        pushHistory(makeDeleteOutlineNodeAction(workspaceId, context.oldNode));
      }
      toastSuccess(t('toast.outlineDeleted'));
    },
    onError: toastError,
  });
}
