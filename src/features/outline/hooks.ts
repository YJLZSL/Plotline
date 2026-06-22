import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OutlineNode } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import { useI18n } from '@/hooks/useI18n';

import {
  createOutlineNode as apiCreate,
  deleteOutlineNode as apiDelete,
  listOutlineNodes as apiList,
  updateOutlineNode as apiUpdate,
} from './api';

const key = (wsId: string) => ['outline', wsId] as const;

export function useOutlineQuery(workspaceId: string) {
  return useQuery({ queryKey: key(workspaceId), queryFn: () => apiList(workspaceId) });
}

export function useCreateOutlineNode(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (n) => {
      qc.setQueryData<OutlineNode[]>(key(workspaceId), (old) => [...(old ?? []), n]);
      toastSuccess(t('toast.outlineCreated'));
    },
    onError: toastError,
  });
}

export function useUpdateOutlineNode(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: (n) => {
      qc.setQueryData<OutlineNode[]>(key(workspaceId), (old) =>
        (old ?? []).map((x) => (x.id === n.id ? n : x)),
      );
      toastSuccess(t('toast.outlineUpdated'));
    },
    onError: toastError,
  });
}

export function useDeleteOutlineNode(workspaceId: string) {
  const qc = useQueryClient();
  const { t } = useI18n();
  return useMutation({
    mutationFn: apiDelete,
    onSuccess: (_, id) => {
      qc.setQueryData<OutlineNode[]>(key(workspaceId), (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      toastSuccess(t('toast.outlineDeleted'));
    },
    onError: toastError,
  });
}
