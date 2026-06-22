import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Note } from '@/types';
import { toastError, toastSuccess } from '@/stores/toast';
import {
  useHistoryStore,
  makeCreateNoteAction,
  makeUpdateNoteAction,
  makeDeleteNoteAction,
} from '@/stores/historyStore';

import {
  createNote as apiCreate,
  deleteNote as apiDelete,
  listNotes as apiList,
  updateNote as apiUpdate,
} from './api';

export const notesKey = (wsId: string) => ['notes', wsId] as const;

export function useNotesQuery(workspaceId: string) {
  return useQuery({ queryKey: notesKey(workspaceId), queryFn: () => apiList(workspaceId) });
}

export function useCreateNote(workspaceId: string) {
  const qc = useQueryClient();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (n) => {
      qc.setQueryData<Note[]>(notesKey(workspaceId), (old) => [...(old ?? []), n]);
      pushHistory(makeCreateNoteAction(workspaceId, n));
      toastSuccess('笔记已创建');
    },
    onError: toastError,
  });
}

export function useUpdateNote(workspaceId: string) {
  const qc = useQueryClient();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiUpdate,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: notesKey(workspaceId) });
      const previous = qc.getQueryData<Note[]>(notesKey(workspaceId));
      const oldNote = previous?.find((n) => n.id === input.id);
      return { oldNote };
    },
    onSuccess: (n, _input, context) => {
      qc.setQueryData<Note[]>(notesKey(workspaceId), (old) =>
        (old ?? []).map((x) => (x.id === n.id ? n : x)),
      );
      if (context?.oldNote) {
        pushHistory(makeUpdateNoteAction(workspaceId, context.oldNote, n));
      }
    },
    onError: toastError,
  });
}

export function useDeleteNote(workspaceId: string) {
  const qc = useQueryClient();
  const pushHistory = useHistoryStore((s) => s.push);
  return useMutation({
    mutationFn: apiDelete,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notesKey(workspaceId) });
      const previous = qc.getQueryData<Note[]>(notesKey(workspaceId));
      const oldNote = previous?.find((n) => n.id === id);
      return { oldNote };
    },
    onSuccess: (_, id, context) => {
      qc.setQueryData<Note[]>(notesKey(workspaceId), (old) => (old ?? []).filter((n) => n.id !== id));
      if (context?.oldNote) {
        pushHistory(makeDeleteNoteAction(workspaceId, context.oldNote));
      }
      toastSuccess('已删除');
    },
    onError: toastError,
  });
}
