import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Note } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';

import {
  createNote as apiCreate,
  deleteNote as apiDelete,
  listNotes as apiList,
  updateNote as apiUpdate,
} from './api';

const key = (wsId: string) => ['notes', wsId] as const;

export function useNotesQuery(workspaceId: string) {
  return useQuery({ queryKey: key(workspaceId), queryFn: () => apiList(workspaceId) });
}

export function useCreateNote(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (n) => {
      qc.setQueryData<Note[]>(key(workspaceId), (old) => [...(old ?? []), n]);
      toastSuccess('笔记已创建');
    },
    onError: toastError,
  });
}

export function useUpdateNote(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: (n) => {
      qc.setQueryData<Note[]>(key(workspaceId), (old) =>
        (old ?? []).map((x) => (x.id === n.id ? n : x)),
      );
    },
    onError: toastError,
  });
}

export function useDeleteNote(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiDelete,
    onSuccess: (_, id) => {
      qc.setQueryData<Note[]>(key(workspaceId), (old) => (old ?? []).filter((n) => n.id !== id));
      toastSuccess('已删除');
    },
    onError: toastError,
  });
}
