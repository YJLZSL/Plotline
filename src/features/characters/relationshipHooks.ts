import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CharacterRelationship } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';

import {
  createRelationship as apiCreate,
  deleteRelationship as apiDelete,
  listRelationships as apiList,
  updateRelationship as apiUpdate,
} from './api';

const key = (wsId: string) => ['relationships', wsId] as const;

export function useRelationshipsQuery(workspaceId: string) {
  return useQuery({
    queryKey: key(workspaceId),
    queryFn: () => apiList(workspaceId),
  });
}

export function useCreateRelationship(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (rel) => {
      qc.setQueryData<CharacterRelationship[]>(key(workspaceId), (old) => [...(old ?? []), rel]);
      toastSuccess('关系已建立');
    },
    onError: toastError,
  });
}

export function useUpdateRelationship(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: (rel) => {
      qc.setQueryData<CharacterRelationship[]>(key(workspaceId), (old) =>
        (old ?? []).map((r) => (r.id === rel.id ? rel : r)),
      );
    },
    onError: toastError,
  });
}

export function useDeleteRelationship(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiDelete,
    onSuccess: (_, id) => {
      qc.setQueryData<CharacterRelationship[]>(key(workspaceId), (old) =>
        (old ?? []).filter((r) => r.id !== id),
      );
      toastSuccess('已删除');
    },
    onError: toastError,
  });
}
